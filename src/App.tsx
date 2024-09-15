import "./App.css";
import SessionContainer from "./components/SessionContainer";
import { Theme } from "@emotion/react";
import { DarkTheme } from "./DefaultTheme";
import { useState } from "react";
import { ipcLink } from "electron-trpc/renderer";
import { trpc } from "./tRPC";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  links: [ipcLink()],
});

function App() {
  const [theme, setTheme] = useState<Theme>(DarkTheme);
  // TODO: ThemeProvider does not work?
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <SessionContainer theme={theme} />;
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default App;
