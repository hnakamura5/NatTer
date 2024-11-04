import {
  ShellSpecification,
  detectEndOfCommandAndExitCodeByEcho,
  extendCommandWithEndDetectorByEcho,
} from "@/datatypes/ShellSpecification";

export const BashSpecification: ShellSpecification = {
  name: "Bash",
  pathKind: "posix",

  escapes: ["\\"],
  scope: [
    { opener: "{", closer: "}" },
    { opener: "(", closer: ")" },
    { opener: "[", closer: "]" },
  ],
  stringScope: [
    { quote: "'", containsEscape: true },
    { quote: '"', containsEscape: true },
  ],
  lineComments: ["#"],
  lineContinuations: ["\\"],
  delimiter: ";",
  exitCodeVariable: "$?",


  extendCommandWithEndDetector: (command: string) => {
    return extendCommandWithEndDetectorByEcho(BashSpecification, command);
  },

  detectEndOfCommandAndExitCode: (opts) => {
    const { stdout, endDetector } = opts;
    return detectEndOfCommandAndExitCodeByEcho(stdout, endDetector);
  },

  isExitCodeOK: (exitCode) => {
    return exitCode === "0";
  },

  directoryCommands: {
    getCurrent: () => "pwd",
    changeCurrent: (dir) => `cd ${dir}`,
    list: (dir) => `ls -lA ${dir}`,
    getUser: () => "whoami",
  },
};
