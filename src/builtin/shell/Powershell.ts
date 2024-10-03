import {
  ShellSpecification,
  defaultRandomEndDetector,
} from "@/datatypes/ShellSpecification";

export const PowerShellSpecification: ShellSpecification = {
  name: "PowerShell",
  path: "pwsh",
  pathKind: "win32",
  homeDirectory: "~",
  //encoding: "Shift_JIS",
  encoding: "UTF-8",

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
    const endDetector = defaultRandomEndDetector(PowerShellSpecification);
    return {
      // Sandwich the exit status with the end detector.
      newCommand: `${command}; echo "${endDetector}$?${endDetector}"`,
      endDetector: endDetector,
    };
  },

  detectEndOfCommandAndExitCode: (opts) => {
    const { stdout, endDetector } = opts;
    const first = stdout.indexOf(endDetector);
    if (first === -1) {
      return undefined;
    }
    const second = stdout.indexOf(endDetector, first + endDetector.length);
    if (second === -1) {
      return undefined;
    }
    // Here, first and second are by echo command.
    const last = stdout.lastIndexOf(endDetector);
    if (last === -1) {
      return undefined;
    }
    const lastButOne = stdout.lastIndexOf(endDetector, last);
    if (lastButOne !== -1 && lastButOne !== second && lastButOne !== first) {
      // Extract the exit status until the end detector.
      return stdout.slice(lastButOne + endDetector.length, last);
    }
    return undefined;
  },

  isExitCodeOK: (exitCode) => exitCode === "True",

  currentPathCommand: () => "Convert-Path $(pwd)",
  changeDirectoryCommand: (dir) => `cd "${dir}"`,
  listDirectoryCommand: (dir) => `ls "${dir}"`,
};
