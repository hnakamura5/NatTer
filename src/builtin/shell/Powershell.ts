import { ShellSpecification } from "@/datatypes/ShellSpecification";

export const PowerShellSpecification: ShellSpecification = {
  name: "powershell",
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
  delimiter: ";",
  exitCodeVariable: "$?",

  isInteractionSupported: (kind) => {
    return kind === "command" || kind === "terminal";
  },

  isExitCodeOK: (exitCode) => {
    return exitCode === "True" || exitCode === "0";
  },

  directoryCommands: {
    //getCurrent: () => "Convert-Path $(pwd)",
    getCurrent: () => "Convert-Path .",
    changeCurrent: (dir) => `cd "${dir}"`,
    list: (dir) => `ls "${dir}"`,
    getUser: () => "whoami",
  },

  promptCommands: {
    get: () => "prompt",
    set: (prompt) => `function prompt{ return "${prompt}"; }`,
  },
};
