import { server } from "@/server/tRPCServer";
import { z } from "zod";

const procedure = server.procedure;

let dataStr: string = "Hello, World!";

const helloRouter = server.router({
  get: procedure.input(z.string()).query(async (opts) => {
    const { input } = opts;
    return dataStr + input;
  }),
  set: procedure.input(z.string()).mutation(async (opts) => {
    const { input } = opts;
    console.log(input);
    dataStr = dataStr.concat(input);
  }),
});

export const router = server.router({
  hello: helloRouter,
});
export type AppRouter = typeof router;
