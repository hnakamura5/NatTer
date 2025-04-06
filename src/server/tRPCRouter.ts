import { server } from "@/server/tRPCServer";
import { z } from "zod";
import { shellRouter } from "@/server/shellServer";
import { fileSystemRouter } from "@/server/FileSystemServer";
import { osShellRouter } from "@/server/osShell";
import { configurationRouter } from "@/server/configServer";
import { iconServerRouter } from "@/server/iconServer";
import { languageServerRouter } from "@/server/languageServer";
import { terminalRouter } from "./terminalServer";
import { processRouter } from "./processServer";
import { aiRouter } from "./chatAIServer";
import { sessionRouter } from "./sessionServer";

export const router = server.router({
  session: sessionRouter,
  shell: shellRouter,
  fs: fileSystemRouter,
  icon: iconServerRouter,
  os: osShellRouter,
  config: configurationRouter,
  lsp: languageServerRouter,
  terminal: terminalRouter,
  process: processRouter,
  ai: aiRouter,
});
export type AppRouter = typeof router;
