import { createTRPCReact } from "@trpc/react-query";
import { AppRouter } from "@/server/tRPCRouter";

export const api = createTRPCReact<AppRouter>();
