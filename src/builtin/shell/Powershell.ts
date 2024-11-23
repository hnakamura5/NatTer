import { ShellSpecification } from "@/datatypes/ShellSpecification";
import {
  detectCommandResponseAndExitCodeByEcho,
  extendCommandWithBoundaryDetectorByEcho,
} from "@/server/ShellUtils/BoundaryDetectorByEcho";

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

  extendCommandWithBoundaryDetector: (command: string) => {
    return extendCommandWithBoundaryDetectorByEcho(
      PowerShellSpecification,
      command
    );
  },

  detectResponseAndExitCode: (opts) => {
    const { interact, stdout, boundaryDetector } = opts;
    return detectCommandResponseAndExitCodeByEcho(
      PowerShellSpecification,
      interact,
      stdout,
      boundaryDetector
    );
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

  promptCommands: {
    get: () => "prompt",
    set: (prompt) => `function prompt{ return "${prompt}"; }`,
  },
};
