import { ShellSpecification } from "@/datatypes/ShellSpecification";
import {
  defaultRandomBoundaryDetector,
  getCommandWithDelimiterSandwichOnDemand,
} from "@/datatypes/ShellUtils/BoundaryDetectorUtils";

// Implement detection algorithm using prompt.
// This is suitable for terminal shells with prompt.

export function extendCommandWithBoundaryDetectorByPrompt(
  shellSpec: ShellSpecification,
  usePty: boolean,
  command: string
) {
  const boundaryDetector = defaultRandomBoundaryDetector(usePty, shellSpec);
  const prompt = shellSpec.promptCommands?.set(boundaryDetector) ?? "";
  const newCommand = `${prompt}${getCommandWithDelimiterSandwichOnDemand(
    shellSpec,
    command
  )}`;
  return {
    newCommand: newCommand,
    boundaryDetector: boundaryDetector,
  };
}

