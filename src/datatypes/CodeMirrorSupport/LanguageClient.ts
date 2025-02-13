import MarkdownIt from "markdown-it";
import { CodeMirrorLanguageClient } from "@shopify/codemirror-language-client";
import { MarkedString, MarkupContent } from "vscode-languageserver-protocol";
import { log } from "../Logger";
import { LanguageClientWorker } from "./LanguageClientWorker";
import { LanguageServerExecutableArgs } from "../LanguageServerConfigs";

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

export function createLanguageClient({
  executable,
  args,
}: LanguageServerExecutableArgs) {
  const worker = new LanguageClientWorker({ executable, args });
  // Initialize the worker
  worker.postMessage({
    type: "initializeProcess",
    data: {
      executable: executable,
      args: args,
    },
  });
  return new CodeMirrorLanguageClient(
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
        const htmlString = markdown.render(completionItem.documentation.value);
        divNode.innerHTML = htmlString;
        return divNode;
      },
      hoverRenderer: (view, hover) => {
        const divNode = document.createElement("div");
        // TODO: Styling the hover string
        const htmlString = markdown.render(flattenAsMarkdown(hover.contents));
        divNode.innerHTML = htmlString;
        return {
          dom: divNode,
        };
      },
    }
  );
}
