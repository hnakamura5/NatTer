import { ShellSpecification } from "@/datatypes/ShellSpecification";
import {
  detectCommandResponseAndExitCodeByEcho,
  extendCommandWithBoundaryDetectorByEcho,
} from "@/server/ShellUtils/BoundaryDetectorByEcho";

export const CmdSpecification: ShellSpecification = {
  name: "cmd",
  pathKind: "win32",

  escapes: ["^"],
  scope: [
    { opener: "{", closer: "}" },
    { opener: "(", closer: ")" },
    { opener: "[", closer: "]" },
  ],
  stringScope: [
    { quote: "'", containsEscape: false },
    { quote: '"', containsEscape: false },
  ],
  lineComments: ["REM"],
  lineContinuations: ["^"],
  delimiter: "&",
  exitCodeVariable: "%ERRORLEVEL%",
  quoteLivesInString: true,

  isInteractionSupported: (kind) => {
    return kind === "command";
  },

  extendCommandWithBoundaryDetector: (command: string) => {
    return extendCommandWithBoundaryDetectorByEcho(CmdSpecification, command);
  },

  detectResponseAndExitCode: (opts) => {
    const { interact, stdout, boundaryDetector } = opts;
    return detectCommandResponseAndExitCodeByEcho(
      CmdSpecification,
      interact,
      stdout,
      boundaryDetector
    );
  },

  isExitCodeOK: (exitCode) => {
    return exitCode === "0";
  },

  directoryCommands: {
    getCurrent: () => "cd",
    changeCurrent: (dir) => `cd "${dir}"`,
    list: (dir) => `dir "${dir}"`,
    getUser: () => "whoami",
  },

  promptCommands: {
    get: () => "echo %PROMPT%",
    set: (prompt) => `PROMPT=${prompt}`,
  },
};
