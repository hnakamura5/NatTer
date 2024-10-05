import "@/App.css";
import SessionContainer from "@/components/SessionContainer";
import { Theme } from "@emotion/react";
import { ThemeContext, DefaultDarkTheme } from "@/datatypes/Theme";
import { useState } from "react";
import { ipcLink } from "electron-trpc/renderer";
import { api } from "@/api";
import { Box } from "@mui/system";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();
const trpcAPIClient = api.createClient({
  links: [ipcLink()],
});

function App() {
  const [theme, setTheme] = useState<Theme>(DefaultDarkTheme);
  return (
    <api.Provider client={trpcAPIClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ThemeContext.Provider value={theme}>
          <Box
            sx={{
              backgroundColor: theme.system.colors.background,
            }}
          >
            <SessionContainer />
          </Box>
        </ThemeContext.Provider>
      </QueryClientProvider>
    </api.Provider>
  );
}

export default App;
