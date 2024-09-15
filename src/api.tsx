import { initTRPC } from "@trpc/server";

const server = initTRPC.create({
  isServer: true,
});
const procedure = server.procedure;

const router = server.router({
  hello: procedure.query(async () => "Hello, World!"),
});

export default router;
export type AppRouter = typeof router;
