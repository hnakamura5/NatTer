import { forwardRef, useEffect, useRef, useState } from "react";
import { EditorView } from "@codemirror/view";
import { acceptCompletion, autocompletion } from "@codemirror/autocomplete";
import { keymap } from "@codemirror/view";
import { indentWithTab, standardKeymap } from "@codemirror/commands";
import CodeMirror, { ReactCodeMirrorProps } from "@uiw/react-codemirror";
import { Extension } from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { loadLanguage, LanguageName } from "@uiw/codemirror-extensions-langs";

import { useCodeMirrorLanguageClient } from "@/datatypes/CodeMirrorSupport/LanguageClient";
import {
  LanguageServerID,
  LanguageServerExecutableArgs,
  useLanguageServerConnector,
  LanguageServerConnector,
} from "@/components/LanguageServerConfigs";
import { log } from "@/datatypes/Logger";

export type CodeMirrorInputProps = {
  id?: string;
  className?: string;
  codeMirrorTheme?: Extension;
  style?: React.CSSProperties;
  language?: LanguageName;
  languageServerConfig?: LanguageServerExecutableArgs;
  bufferFileName?: string;
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
      bufferFileName,
      ...codeMirrorProps
    } = props;
    const viewRef = useRef<EditorView | undefined>(undefined);
    const [lspExtension, setLspExtension] = useState<Extension[]>([]);
    const [extensions, setExtensions] = useState<Extension[]>([]);
    const [lspConnector, setLSPConnector] = useState<
      LanguageServerConnector | undefined
    >(undefined);
    const [serverID, setServerID] = useState<LanguageServerID | undefined>(
      undefined
    );

    // Setup language extension.
    useEffect(() => {
      if (!language) {
        return;
      }
      const extension = loadLanguage(language);
      if (extension) {
        setExtensions([extension, ...extensions]);
      }
      return () => {
        setExtensions(extensions.filter((e) => e !== extension));
      };
    }, [language]);

    // Setup language server extension.
    const { connector, server } =
      useLanguageServerConnector(languageServerConfig);
    if (serverID !== server) {
      setServerID(server);
      setLSPConnector(connector);
    }
    const { client, tempBufferFile } = useCodeMirrorLanguageClient(
      lspConnector,
      serverID,
      !bufferFileName
    );

    useEffect(() => {
      if (client !== undefined) {
        const extension = client.extension(
          bufferFileName || tempBufferFile || "browser:///",
          {
            shouldHover: true,
            shouldComplete: true,
            shouldLint: true,
          }
        );
        setLspExtension([extension]);
        return () => {
          setLspExtension([]);
        };
      }
    }, [server, client !== undefined]);

    log.debug(
      `CodeMirrorInput id: ${id} language: ${language} extensions: ${extensions.length}`
    );

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
            defaultKeymap: false,
          }}
          theme={codeMirrorTheme || oneDark}
          // https://discuss.codemirror.net/t/using-tab-key-for-autocomplete-suggestions/7234/6
          indentWithTab={false}
          extensions={[
            ...lspExtension,
            autocompletion({
              tooltipClass: () => "cm-tooltip",
              optionClass: () => "cm-completion-item",
            }),
            // https://codemirror.net/docs/ref/#view.KeyBinding.run
            keymap.of([
              {
                key: "Ctrl-Enter",
                win: "Ctrl-Enter",
                run: () => {
                  return true;
                },
              },
              {
                key: "Tab",
                win: "Tab",
                run: acceptCompletion,
              },
              ...standardKeymap,
              indentWithTab,
            ]),
          ]}
        />
      </div>
    );
  }
);
