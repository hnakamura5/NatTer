import { ShellSpecification } from "@/datatypes/ShellSpecification";

export const BashSpecification: ShellSpecification = {
  name: "bash",
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

  isInteractionSupported: (interact) => {
    return interact === "command" || interact === "terminal";
  },

  commandNotEchoBack: (interact) => {
    return interact === "command";
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

  promptCommands: {
    get: () => "echo $PS1",
    set: (prompt) => `PS1="${prompt}"`,
  },
};

