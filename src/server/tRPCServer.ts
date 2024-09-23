import { initTRPC } from "@trpc/server";

export const server = initTRPC.create({
  isServer: true,
});
