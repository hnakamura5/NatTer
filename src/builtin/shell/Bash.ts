import { ShellSpecification } from "@/datatypes/ShellSpecification";
import {
  detectCommandResponseAndExitCodeByEcho,
  extendCommandWithBoundaryDetectorByEcho,
} from "@/server/ShellUtils/BoundaryDetectorByEcho";

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

  isInteractionSupported: (kind) => {
    return kind === "command" || kind === "terminal";
  },

  extendCommandWithBoundaryDetector: (command: string) => {
    return extendCommandWithBoundaryDetectorByEcho(
      BashSpecification,
      command
    );
  },

  detectResponseAndExitCode: (opts) => {
    const {interact , stdout, boundaryDetector } = opts;
    return detectCommandResponseAndExitCodeByEcho(
      BashSpecification,
      stdout,
      boundaryDetector
    );
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

