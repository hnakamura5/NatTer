// This is the only file that imports from the server for client.
// Works as the interface of the client-side API.

import { createTRPCReact } from "@trpc/react-query";
import { AppRouter } from "@/server/tRPCRouter";
// Re-export types.
export type { ProcessID } from "@/server/shellProcess";

export const api = createTRPCReact<AppRouter>();
