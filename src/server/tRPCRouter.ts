import { server } from "@/server/tRPCServer";
import { z } from "zod";
import { shellRouter } from "@/server/ShellProcess";
import { fileSystemRouter } from "@/server/FileSystemServer";
import { osShellRouter } from "@/server/osShell";
import { configurationRouter } from "@/server/configServer";
import { iconServerRouter } from "@/server/iconServer";
import { languageServerRouter } from "@/server/languageServer";
import { terminalRouter } from "./terminalServer";

export const router = server.router({
  shell: shellRouter,
  fs: fileSystemRouter,
  icon: iconServerRouter,
  os: osShellRouter,
  config: configurationRouter,
  lsp: languageServerRouter,
  terminal: terminalRouter,
});
export type AppRouter = typeof router;
