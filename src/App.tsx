import "@/App.css";
import SessionContainer from "@/components/SessionContainer";
import { Theme } from "@emotion/react";
import { ThemeContext, DefaultDarkTheme } from "@/datatypes/Theme";
import { useState } from "react";
import { ipcLink } from "electron-trpc/renderer";
import { trpc } from "@/tRPC";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  links: [ipcLink()],
});

function App() {
  const [theme, setTheme] = useState<Theme>(DefaultDarkTheme);
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ThemeContext.Provider value={theme}>
          <SessionContainer />
        </ThemeContext.Provider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default App;
