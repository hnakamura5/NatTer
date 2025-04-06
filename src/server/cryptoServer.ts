import { z } from "zod";
import { randomInt, randomUUID } from "node:crypto";

import { server } from "@/server/tRPCServer";

const existUUID: Set<string> = new Set();
export function newUUID(): string {
  let result = randomUUID();
  while (existUUID.has(result)) {
    result = randomUUID();
  }
  existUUID.add(result);
  return result;
}

const proc = server.procedure;
export const cryptoRouter = server.router({
  newUUID: proc
    .input(z.object({ title: z.string() }))
    .output(z.string())
    .mutation(async () => {
      return newUUID();
    }),

  randInt: proc
    .input(z.object({ min: z.number().int(), max: z.number().int() }))
    .output(z.number().int())
    .mutation(async (opts) => {
      const { min, max } = opts.input;
      return randomInt(min, max);
    }),
});
