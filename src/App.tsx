import "@/App.css";
import SessionContainer from "@/components/SessionContainer";
import { ipcLink } from "electron-trpc/renderer";
import { api } from "@/api";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppStateProvider } from "@/AppState";

const queryClient = new QueryClient();
const trpcAPIClient = api.createClient({
  links: [ipcLink()],
});

function App() {
  return (
    <api.Provider client={trpcAPIClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AppStateProvider>
          <SessionContainer />
        </AppStateProvider>
      </QueryClientProvider>
    </api.Provider>
  );
}

export default App;
