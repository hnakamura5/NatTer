import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "./api";
import { createTRPCProxyClient } from '@trpc/client';

export const trpc = createTRPCReact<AppRouter>();
