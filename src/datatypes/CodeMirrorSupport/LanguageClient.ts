import MarkdownIt from "markdown-it";
import { CodeMirrorLanguageClient } from "@shopify/codemirror-language-client";
import { MarkedString, MarkupContent } from "vscode-languageserver-protocol";
import { log } from "../Logger";
import { LanguageClientWorker } from "./LanguageClientWorker";
import {
  LanguageServerConnector,
  LanguageServerExecutableArgs,
  LanguageServerID,
} from "../../components/LanguageServerConfigs";
import { useEffect, useState } from "react";
import { api } from "@/api";

// https://github.com/Shopify/theme-tools/blob/main/packages/codemirror-language-client/playground/src/playground.ts

const markdown = new MarkdownIt({
  linkify: true,
  typographer: true,
  breaks: true,
  // TODO: highlight: function (str, lang) { },
});

function flattenAsMarkdown(
  content: MarkupContent | MarkedString[] | MarkedString
): string {
  if (Array.isArray(content)) {
    return content.map((c) => flattenAsMarkdown(c)).join("\n");
  }

  if (typeof content === "string") {
    return content;
  }

  if (MarkupContent.is(content)) {
    return content.value;
  }

  if (!content) {
    return "";
  }

  return `\`\`\`${content.language}\n${content.value}\n\`\`\``;
}

export function useCodeMirrorLanguageClient(
  connector?: LanguageServerConnector,
  server?: LanguageServerID,
  requireTempBufferFile?: boolean
) {
  const [initializedClient, setInitializedClient] = useState<
    CodeMirrorLanguageClient | undefined
  >(undefined);
  const [initializedServer, setInitializedServer] = useState<
    LanguageServerID | undefined
  >(undefined);
  const [bufferFile, setBufferFile] = useState<string | undefined>(undefined);

  const makeBufferFile = api.lsp.makeBufferFile.useMutation();
  const removeBufferFile = api.lsp.removeBufferFile.useMutation();

  useEffect(() => {
    if (connector && server && initializedServer !== server) {
      log.debug(
        "useCodeMirrorLanguageClient: connector and server found server: ",
        server
      );
      // Make buffer file if required.
      let bufferFilePromise: Promise<string> | undefined = undefined;
      if (requireTempBufferFile) {
        bufferFilePromise = makeBufferFile.mutateAsync(server);
      }
      // Initialize the worker.
      const worker = new LanguageClientWorker(connector);
      // Initialize the client.
      const client = new CodeMirrorLanguageClient(
        worker,
        {
          log: log.debug,
          initializationOptions: {},
        },
        {
          autocompleteOptions: {
            activateOnTyping: true,
            maxRenderedOptions: 10,
            defaultKeymap: true,
          },
          infoRenderer: (completionItem) => {
            if (
              !completionItem.documentation ||
              typeof completionItem.documentation === "string"
            ) {
              return null;
            }
            const divNode = document.createElement("div");
            const htmlString = markdown.render(
              completionItem.documentation.value
            );
            divNode.innerHTML = htmlString;
            return divNode;
          },
          hoverRenderer: (view, hover) => {
            const divNode = document.createElement("div");
            // TODO: Styling the hover string
            const htmlString = markdown.render(
              flattenAsMarkdown(hover.contents)
            );
            divNode.innerHTML = htmlString;
            return {
              dom: divNode,
            };
          },
        }
      );
      client.start().then(async () => {
        log.debug("useCodeMirrorLanguageClient: client started");
        if (bufferFilePromise) {
          setBufferFile(await bufferFilePromise);
        }
        setInitializedClient(client);
        setInitializedServer(server);
      });
    }
    if (initializedClient && initializedServer) {
      log.debug(
        "useCodeMirrorLanguageClient: client initialized register close."
      );
      return () => {
        log.debug("useCodeMirrorLanguageClient: client stopped");
        if (bufferFile) {
          removeBufferFile.mutate(bufferFile);
        }
        initializedClient.stop();
      };
    }
  }, [server, initializedServer, initializedClient !== undefined]);

  return { client: initializedClient, tempBufferFile: bufferFile };
}
