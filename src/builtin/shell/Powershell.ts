import {
  ShellSpecification,
  detectEndOfCommandAndExitCodeByEcho,
  extendCommandWithEndDetectorByEcho,
} from "@/datatypes/ShellSpecification";

export const PowerShellSpecification: ShellSpecification = {
  name: "PowerShell",
  pathKind: "win32",

  escapes: ["`"],
  scope: [
    { opener: "{", closer: "}" },
    { opener: "(", closer: ")" },
    { opener: "[", closer: "]" },
  ],
  stringScope: [
    { quote: "'", containsEscape: true },
    { quote: '"', containsEscape: false },
  ],
  lineComments: ["#"],
  lineContinuations: ["`"],

  extendCommandWithEndDetector: (command: string) => {
    return extendCommandWithEndDetectorByEcho(PowerShellSpecification, command);
  },

  detectEndOfCommandAndExitCode: (opts) => {
    const { stdout, endDetector } = opts;
    return detectEndOfCommandAndExitCodeByEcho(stdout, endDetector);
  },

  isExitCodeOK: (exitCode) => {
    console.log(`exitCode: ${exitCode}`);
    return exitCode === "True" || exitCode === "0";
  },

  directoryCommands: {
    getCurrent: () => "Convert-Path $(pwd)",
    changeCurrent: (dir) => `cd "${dir}"`,
    list: (dir) => `ls "${dir}"`,
    getUser: () => "whoami",
  },
};
