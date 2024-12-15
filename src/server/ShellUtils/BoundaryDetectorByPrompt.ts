import { ShellInteractKind } from "@/datatypes/ShellInteract";
import { ShellSpecification } from "@/datatypes/ShellSpecification";
import {
  defaultRandomBoundaryDetector,
  getCommandWithDelimiterSandwichOnDemand,
  isCommandEchoBackToStdout,
} from "@/server/ShellUtils/BoundaryDetectorUtils";
import { detectCommandResponseAndExitCodeFunctionType } from "@/server/ShellUtils/ExecuteUtils";
import stripAnsi from "strip-ansi";

import { log } from "@/datatypes/Logger";

// Implement detection algorithm using prompt.
// This is suitable for terminal shells with prompt.

export function extendCommandWithBoundaryDetectorByPrompt(
  shellSpec: ShellSpecification,
  command: string,
  boundaryDetector: string
) {
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

export const detectCommandResponseAndExitCodeByPrompt: detectCommandResponseAndExitCodeFunctionType =
  (
    shellSpec: ShellSpecification,
    interact: ShellInteractKind,
    stdout: string,
    boundaryDetector: string
  ) => {
    // Find the first boundary detector, that is the next prompt.
    const first = stdout.indexOf(boundaryDetector);
    log.debug(`detectCommandResponseAndExitCodeByPrompt first: ${first}`);
    if (first === -1) {
      return undefined;
    }
    const second = stdout.indexOf(
      boundaryDetector,
      first + boundaryDetector.length
    );
    log.debug(`detectCommandResponseAndExitCodeByPrompt second: ${second}`);
    if (second === -1) {
      return undefined;
    }
    return {
      response: stdout.slice(0, first),
      exitStatus: stripAnsi(
        stdout.slice(first + boundaryDetector.length, second)
      ),
    };
  };
