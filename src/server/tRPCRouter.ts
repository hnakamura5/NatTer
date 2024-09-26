import { server } from "@/server/tRPCServer";
import { z } from "zod";
import { shellRouter } from "@/server/ShellProcess";

const procedure = server.procedure;

let dataStr: string = "Hello, World!";

const helloRouter = server.router({
  get: procedure.input(z.string()).query(async (opts) => {
    const { input } = opts;
    return dataStr + input;
  }),
  set: procedure.input(z.string()).mutation(async (opts) => {
    const { input } = opts;
    dataStr = dataStr.concat(input);
    setInterval(() => {
      dataStr = "Hello, World!";
    }, 10000);
  }),
});

export const router = server.router({
  hello: helloRouter,
  shell: shellRouter,
});
export type AppRouter = typeof router;
