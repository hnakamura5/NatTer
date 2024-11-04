import {
  ShellSpecification,
  detectEndOfCommandAndExitCodeByEcho,
  extendCommandWithEndDetectorByEcho,
} from "@/datatypes/ShellSpecification";

export const CmdSpecification: ShellSpecification = {
  name: "Cmd",
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

  extendCommandWithEndDetector: (command: string) => {
    return extendCommandWithEndDetectorByEcho(CmdSpecification, command);
  },

  detectEndOfCommandAndExitCode: (opts) => {
    const { stdout, endDetector } = opts;
    return detectEndOfCommandAndExitCodeByEcho(stdout, endDetector);
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
};
