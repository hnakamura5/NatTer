import Monaco from "@monaco-editor/react";
import { editor } from "monaco-editor";
import { useEffect, useRef, useState } from "react";
import { log } from "@/datatypes/Logger";

export type MonacoEditorProps = {
  value: string;
  onChange: (
    value: string | undefined,
    event: editor.IModelContentChangedEvent
  ) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  maxHeight?: number;
};

export default function MonacoInput(props: MonacoEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | undefined>(undefined);

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    // Monaco plugins here.

    // Editor event handlers.
    editor.onKeyDown((e) => {
      if (props.onKeyDown) {
        props.onKeyDown(e.browserEvent);
      }
    });
    // Editor height sync.
    updateEditorHeight();
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
    if (editorRef.current) {
      updateEditorHeight();
    }
  }, [props.value]);

  return (
    <Monaco
      defaultLanguage="plain"
      value={props.value}
      onChange={(value, event) => {
        props.onChange(value, event);
        updateEditorHeight();
      }}
      width="100%"
      theme="vs-dark"
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
  );
}
