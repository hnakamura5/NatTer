import { server } from "@/server/tRPCServer";
import { z } from "zod";
import { shellRouter } from "@/server/ShellProcess";
import { fileSystemRouter } from "@/server/FileSystem";
import { osShellRouter } from "@/server/osShell";
import { configurationRouter } from "@/server/configuration";

export const router = server.router({
  shell: shellRouter,
  fs: fileSystemRouter,
  os: osShellRouter,
  config: configurationRouter,
});
export type AppRouter = typeof router;
