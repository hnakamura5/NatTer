import "@/App.css";
import SessionContainer from "@/components/Session/SessionContainer";
import { ipcLink } from "electron-trpc/renderer";
import { api } from "@/api";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppStateProvider } from "@/AppState";
import { useState } from "react";

import { loader as monacoLoader } from "@monaco-editor/react";

import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import { Box } from "@mui/material";
import styled from "@emotion/styled";

// Monaco loader configuration
// See https://github.com/suren-atoyan/monaco-react#loader-config
self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === "json") {
      return new jsonWorker();
    }
    if (label === "css" || label === "scss" || label === "less") {
      return new cssWorker();
    }
    if (label === "html" || label === "handlebars" || label === "razor") {
      return new htmlWorker();
    }
    if (label === "typescript" || label === "javascript") {
      return new tsWorker();
    }
    return new editorWorker();
  },
};
monacoLoader.config({ monaco });

const StyledSessionBox = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  height: "100%",
  width: "100%",
  overflow: "hidden",
  backgroundColor: theme.shell.sessionBackgroundColor,
  color: theme.shell.textColor,
  fontFamily: theme.shell.font,
  fontSize: theme.shell.fontSize,
}));

function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcAPIClient] = useState(() =>
    api.createClient({
      links: [ipcLink()],
    })
  );
  window.testMain.callTest("testMain.callTest from App.tsx");

  return (
    <api.Provider client={trpcAPIClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AppStateProvider>
          <StyledSessionBox>
            <SessionContainer />
          </StyledSessionBox>
        </AppStateProvider>
      </QueryClientProvider>
    </api.Provider>
  );
}

export default App;
