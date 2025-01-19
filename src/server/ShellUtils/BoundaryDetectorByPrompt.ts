import { ShellInteractKind } from "@/datatypes/ShellInteract";
import {
  ShellSpecification,
  setPromptCommand,
} from "@/datatypes/ShellSpecification";
import {
  defaultRandomBoundaryDetector,
  getCommandWithDelimiterSandwichOnDemand,
  isCommandEchoBackToStdout,
} from "@/server/ShellUtils/BoundaryDetectorUtils";
import {
  addStdout,
  runOnStdoutAndDetectExitCodeFuncType,
} from "@/server/ShellUtils/ExecuteUtils";
import stripAnsi from "strip-ansi";

import { log } from "@/datatypes/Logger";
import { Command } from "@/datatypes/Command";
import { Process } from "../types/Process";

// Implement detection algorithm using prompt.
// This is suitable for terminal shells with prompt.

export function extendCommandWithBoundaryDetectorByPrompt(
  shellSpec: ShellSpecification,
  command: string,
  boundaryDetector: string
) {
  const prompt = setPromptCommand(shellSpec, boundaryDetector) ?? "";
  const newCommand = `${prompt}${getCommandWithDelimiterSandwichOnDemand(
    shellSpec,
    command
  )}`;
  return {
    newCommand: newCommand,
    boundaryDetector: boundaryDetector,
  };
}

export const runOnStdoutAndDetectExitCodeByPrompt: runOnStdoutAndDetectExitCodeFuncType =
  (
    process: Process,
    current: Command,
    shellSpec: ShellSpecification,
    stdoutData: string,
    boundaryDetector: string
  ) => {
    addStdout(current, stdoutData);
    // Find the first boundary detector, that is the next prompt.
    const first = stdoutData.indexOf(boundaryDetector);
    log.debug(`detectCommandResponseAndExitCodeByPrompt first: ${first}`);
    if (first === -1) {
      return undefined;
    }
    const second = stdoutData.indexOf(
      boundaryDetector,
      first + boundaryDetector.length
    );
    log.debug(`detectCommandResponseAndExitCodeByPrompt second: ${second}`);
    if (second === -1) {
      return undefined;
    }
    return stripAnsi(stdoutData.slice(first + boundaryDetector.length, second));
  };
