import Monaco from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { useEffect, useRef, useState } from "react";
import { log } from "@/datatypes/Logger";
import { useTheme } from "@/AppState";
import { setMonacoInputTheme } from "./MonacoInputTheme";

type MonacoInputHandlers = {
  onDidMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  onChange?: (
    value: string,
    event: monaco.editor.IModelContentChangedEvent
  ) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
};

export type MonacoEditorProps = {
  value: string;
  maxHeight?: number;
  style?: React.CSSProperties;
  monacoTheme?: string;
  ref?: React.RefObject<HTMLElement>;
};

export default function MonacoInput(
  props: MonacoEditorProps & MonacoInputHandlers
) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | undefined>(
    undefined
  );
  // To avoid rebind editor handlers on every render.
  const handlersRef = useRef(props);
  handlersRef.current = props;

  log.debug(`MonacoInput value: ${props.value}`);
  // // Disable Ctrl+Enter key behavior.
  // monaco.editor.addKeybindingRules([
  //   {
  //     keybinding: monaco.KeyMod.WinCtrl | monaco.KeyCode.Enter,
  //     command: null,
  //   },
  // ]);

  const handleEditorDidMount = (
    editor: monaco.editor.IStandaloneCodeEditor
  ) => {
    editorRef.current = editor;
    // Monaco plugins here.

    // Disable default key behaviors.
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {});
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {});
    // Editor event handlers.
    editor.onKeyDown((e) => {
      log.debug(
        `Editor keydown: ${e.browserEvent.key} value: ${editor.getValue()}`
      );
      const handlers = handlersRef.current;
      if (handlers.onKeyDown) {
        handlers.onKeyDown(e.browserEvent);
      }
    });
    // Editor height sync.
    updateEditorHeight();

    if (props.onDidMount) {
      props.onDidMount(editor);
    }
  };

  // https://github.com/microsoft/monaco-editor/issues/794
  const updateEditorHeight = () => {
    // Keep the editor height in sync with the content text height.
    const editor = editorRef.current;
    if (editor) {
      const contentHeight = editor.getContentHeight();
      editor.getContainerDomNode().style.height = `${contentHeight}px`;
      editor.layout({
        height: contentHeight,
        width: editor.getLayoutInfo().width,
      });
    }
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (editor) {
      updateEditorHeight();
    }
  }, [props]);

  return (
    <div style={props.style}>
      <Monaco
        defaultLanguage="plain"
        value={props.value}
        onChange={(value, event) => {
          if (props.onChange) {
            props.onChange(value || "", event);
          }
          updateEditorHeight();
        }}
        width="100%"
        theme={props.monacoTheme || "vs-dark"}
        // theme="vs-dark"
        options={{
          // Remove things that are not the exact text.
          lineNumbers: "off",
          minimap: { enabled: false },
          // scrollbar: { vertical: "hidden" },
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          overviewRulerLanes: 0,
          folding: false,
          lineDecorationsWidth: 0,
          glyphMargin: false,
          renderLineHighlight: "none",
          renderFinalNewline: "off",
          // https://github.com/suren-atoyan/monaco-react/issues/442
          scrollBeyondLastLine: false,
        }}
        onMount={handleEditorDidMount}
      />
    </div>
  );
}
