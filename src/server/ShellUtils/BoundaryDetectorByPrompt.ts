import { ShellInteractKind } from "@/datatypes/ShellInteract";
import { ShellSpecification } from "@/datatypes/ShellSpecification";
import {
  defaultRandomBoundaryDetector,
  getCommandWithDelimiterSandwichOnDemand,
  isCommandEchoBackToStdout,
} from "@/server/ShellUtils/BoundaryDetectorUtils";
import { detectCommandResponseAndExitCodeFunctionType } from "@/server/ShellUtils/ExecuteUtils";
import { AnsiUp } from "@/datatypes/ansiUpCustom";

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

// TODO: implement detection algorithm using prompt.
// TODO:  or implement echo and prompt as executor?

const ansiUp = new AnsiUp();
export const detectCommandResponseAndExitCodeByPrompt: detectCommandResponseAndExitCodeFunctionType =
  (
    shellSpec: ShellSpecification,
    interact: ShellInteractKind,
    stdout: string,
    boundaryDetector: string
  ) => {
    // Find the first boundary detector, that is the next prompt.
    const first = stdout.indexOf(boundaryDetector);
    console.log(`detectCommandResponseAndExitCodeByPrompt first: ${first}`);
    if (first === -1) {
      return undefined;
    }
    const second = stdout.indexOf(
      boundaryDetector,
      first + boundaryDetector.length
    );
    console.log(`detectCommandResponseAndExitCodeByPrompt second: ${second}`);
    if (second === -1) {
      return undefined;
    }
    return {
      response: stdout.slice(0, first),
      exitStatus: ansiUp.ansi_to_text(
        stdout.slice(first + boundaryDetector.length, second)
      ),
    };
  };
