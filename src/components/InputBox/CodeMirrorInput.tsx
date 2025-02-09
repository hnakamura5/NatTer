import { forwardRef, useRef } from "react";
import { EditorView } from "@codemirror/view";
import CodeMirror, { ReactCodeMirrorProps } from "@uiw/react-codemirror";
import { Extension } from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { loadLanguage, LanguageName } from "@uiw/codemirror-extensions-langs";

export type CodeMirrorInputProps = {
  id?: string;
  className?: string;
  codeMirrorTheme?: Extension;
  style?: React.CSSProperties;
  language?: LanguageName;
} & ReactCodeMirrorProps;

export const CodeMirrorInput = forwardRef<HTMLDivElement, CodeMirrorInputProps>(
  (props, ref) => {
    const { id, className, codeMirrorTheme, style, ...codeMirrorProps } = props;
    const viewRef = useRef<EditorView | undefined>(undefined);
    let languageExtension = undefined;
    if (props.language) {
      const extension = loadLanguage(props.language);
      if (extension) {
        languageExtension = [extension];
      }
    }

    return (
      <div
        id={props.id}
        className={props.className}
        ref={ref}
        tabIndex={-1}
        onFocus={(e) => {
          const view = viewRef.current;
          if (view && !view.hasFocus) {
            view.focus();
          }
        }}
        style={props.style}
      >
        <CodeMirror
          {...codeMirrorProps}
          onCreateEditor={(view, state) => {
            viewRef.current = view;
          }}
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            highlightActiveLine: false,
            highlightActiveLineGutter: false,
            searchKeymap: false,
            indentOnInput: true,
          }}
          theme={props.codeMirrorTheme || oneDark}
          extensions={languageExtension}
        />
      </div>
    );
  }
);
