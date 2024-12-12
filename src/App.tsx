import "@/App.css";
import SessionContainer from "@/components/SessionContainer";
import { ipcLink } from "electron-trpc/renderer";
import { api } from "@/api";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppStateProvider } from "@/AppState";
import { useState } from "react";

import {Operation} from '@trpc/client';

function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcAPIClient] = useState(() =>
    api.createClient({
      links: [ipcLink()],
    })
  );
  console.log("App.tsx: window.testMain.callTest");
  window.testMain.callTest("testMain.callTest from App.tsx");

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
