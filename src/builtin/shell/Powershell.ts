import {
  ShellSpecification,
  defaultRandomEndDetector,
} from "@/datatypes/ShellSpecification";

export const PowerShellSpecification: ShellSpecification = {
  name: "PowerShell",
  path: "pwsh",
  pathKind: "win32",
  homeDirectory: "~",
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

  detectEndOfCommandAndExitCodeResponse: (opts) => {
    const { commandResponse, endDetector } = opts;
    if (commandResponse.endsWith(endDetector)) {
      // Remove the latter detector.
      const response = commandResponse.slice(0, -endDetector.length);
      // Extract the exit status until former detector.
      const exitStatus = response.slice(response.lastIndexOf(endDetector));
      const result = parseInt(exitStatus);
      if (!isNaN(result)) {
        return result;
      } else {
        // TODO: error handling.
        return -1;
      }
    }
    return undefined;
  },

  currentDirectoryCommand: () => "pwd",
  changeDirectoryCommand: (dir) => `cd "${dir}"`,
  listDirectoryCommand: (dir) => `ls "${dir}"`,
};
