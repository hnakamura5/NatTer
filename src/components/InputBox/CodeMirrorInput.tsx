import { forwardRef, useRef } from "react";
import { EditorView } from "@codemirror/view";
import CodeMirror, { ReactCodeMirrorProps } from "@uiw/react-codemirror";
import { Extension } from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { loadLanguage, LanguageName } from "@uiw/codemirror-extensions-langs";
import { createLanguageClient } from "@/datatypes/CodeMirrorSupport/LanguageClient";
import { LanguageServerExecutableArgs } from "@/datatypes/LanguageServerConfigs";

export type CodeMirrorInputProps = {
  id?: string;
  className?: string;
  codeMirrorTheme?: Extension;
  style?: React.CSSProperties;
  language?: LanguageName;
  languageServerConfig?: LanguageServerExecutableArgs;
} & ReactCodeMirrorProps;

export const CodeMirrorInput = forwardRef<HTMLDivElement, CodeMirrorInputProps>(
  (props, ref) => {
    const {
      id,
      className,
      codeMirrorTheme,
      style,
      language,
      languageServerConfig,
      ...codeMirrorProps
    } = props;
    const viewRef = useRef<EditorView | undefined>(undefined);
    const extensions: Extension[] = [];
    if (language) {
      const extension = loadLanguage(language);
      if (extension) {
        extensions.push(extension);
      }
    }
    if (languageServerConfig) {
      const languageClient = createLanguageClient(languageServerConfig);
      extensions.push(
        languageClient.extension("inmemory://", {
          shouldHover: true,
          shouldComplete: true,
          shouldLint: true,
        })
      );
    }

    // TODO: from here. Connect to the language server
    return (
      <div
        id={id}
        className={className}
        ref={ref}
        tabIndex={-1}
        onFocus={(e) => {
          const view = viewRef.current;
          if (view && !view.hasFocus) {
            view.focus();
          }
        }}
        style={style}
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
          theme={codeMirrorTheme || oneDark}
          extensions={extensions}
        />
      </div>
    );
  }
);
