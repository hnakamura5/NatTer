import {
  ShellSpecification,
  defaultRandomEndDetector,
} from "@/datatypes/ShellSpecification";

export const PowerShellSpecification: ShellSpecification = {
  name: "PowerShell",
  path: "pwsh",
  pathKind: "win32",
  homeDirectory: "~",
  encoding: "Shift_JIS",

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
      newCommand: `${command}; echo ${endDetector}$?${endDetector}`,
      endDetector: endDetector,
    };
  },

  detectEndOfCommandAndExitCode: (opts) => {
    const { commandResponse, endDetector } = opts;
    if (commandResponse.endsWith(endDetector)) {
      // Remove the latter detector.
      const response = commandResponse.slice(0, -endDetector.length);
      // Extract the exit status until former detector.
      return response.slice(response.lastIndexOf(endDetector));
    }
    return undefined;
  },

  isExitCodeOK: (exitCode) => exitCode === "0",

  currentDirectoryCommand: () => "pwd",
  changeDirectoryCommand: (dir) => `cd "${dir}"`,
  listDirectoryCommand: (dir) => `ls "${dir}"`,
};
