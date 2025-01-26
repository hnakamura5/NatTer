import { ShellInteractKind } from "@/datatypes/ShellInteract";
import {
  ShellSpecification,
  setPromptCommand,
} from "@/datatypes/ShellSpecification";
import {
  defaultRandomBoundaryDetector,
  getCommandWithDelimiterSandwichOnDemand,
  handleIgnoreLine,
  isCommandEchoBackToStdout,
} from "@/server/ShellUtils/BoundaryDetectorUtils";
import {
  addStdout,
  addStdoutResponse,
  runOnStdoutAndDetectExitCodeFuncType,
  runOnStdoutAndDetectPartialLineEndFuncType,
} from "@/server/ShellUtils/ExecuteUtils";
import stripAnsi from "strip-ansi";

import { log } from "@/datatypes/Logger";
import { Command } from "@/datatypes/Command";
import { Process } from "../types/Process";

// Implement detection algorithm using prompt.
// This is suitable for terminal shells with prompt.

function extendCommandWithBoundaryDetectorByPrompt(
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

// Detect the start of the response. Only to find the first line ending.
function detectStartOfResponseByPrompt(
  shellSpec: ShellSpecification,
  boundaryDetector: string,
  target: string
) {
  const startDetect = target.indexOf(shellSpec.lineEnding);
  log.debug(
    `detectStartOfResponseByPrompt: ${target} startDetect:${startDetect} newlineDetect:${target.indexOf(
      "\n"
    )} returnDetect: ${target.indexOf("\r")}`
  );
  if (startDetect === -1) {
    return undefined;
  }
  return startDetect + shellSpec.lineEnding.length;
}

// Detect the end of the response. Find the first detector after the line ending.
function detectEndOfResponseByPrompt(
  shellSpec: ShellSpecification,
  boundaryDetector: string,
  target: string,
  responseHead: boolean
) {
  const toDetect = responseHead
    ? boundaryDetector
    : shellSpec.lineEnding + boundaryDetector;
  const endDetect = target.indexOf(toDetect);
  log.debug(
    `detectEndOfResponseByPrompt: ${target} detector:${boundaryDetector} endDetect:${endDetect} toDetect:${toDetect} responseHead:${responseHead}`
  );
  if (endDetect === -1) {
    return undefined;
  }
  const exitStatusStart = endDetect + toDetect.length;
  const exitStatusDetect = target
    .slice(exitStatusStart)
    .indexOf(boundaryDetector);
  // Extract the exit status until the end detector.
  return {
    responseEndIndex: endDetect,
    exitStatus: stripAnsi(
      target.slice(exitStatusStart, exitStatusStart + exitStatusDetect)
    ),
  };
}

function detectEndOfPartialLineResponseByPrompt(
  shellSpec: ShellSpecification,
  boundaryDetector: string,
  continuationLineDetector: string,
  target: string,
  responseHead: boolean
) {
  const endDetect = detectEndOfResponseByPrompt(
    shellSpec,
    boundaryDetector,
    target,
    responseHead
  );
  if (endDetect) {
    return endDetect;
  }
  const toDetect = responseHead
    ? continuationLineDetector
    : shellSpec.lineEnding + continuationLineDetector;
  const continuationLineDetect = target.indexOf(toDetect);
  if (continuationLineDetect === -1) {
    return undefined;
  }
  return {
    responseEndIndex: continuationLineDetect,
    exitStatus: undefined,
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
    log.debug(
      `runOnStdoutAndDetectExitCodeByPrompt stdout:\n=====\n${stdoutData} \n=====\nrunOnStdoutAndDetectExitCodeByFunc end. (len: ${stdoutData.length})`
    );
    addStdout(current, stdoutData);
    // Find the first line ending, that exists after the prompt and the command.
    let startDetect: number | undefined = undefined;
    if (!current.responseStarted) {
      startDetect = detectStartOfResponseByPrompt(
        shellSpec,
        boundaryDetector,
        current.stdout
      );
      if (startDetect === undefined) {
        return undefined;
      }
      current.responseStarted = true;
      log.debug(
        `Response started in command ${
          current.command
        } with index ${startDetect} in ${
          current.stdout
        }@(${current.stdout.slice(0, startDetect)})`
      );
    }
    const startInThisData = startDetect !== undefined;
    const extendedResponse = startInThisData
      ? // Start is detected in this part. stdoutResponse is empty now.
        current.stdout.slice(startDetect)
      : current.stdoutResponse + stdoutData;
    const result = detectEndOfResponseByPrompt(
      shellSpec,
      boundaryDetector,
      extendedResponse,
      startInThisData || current.stdoutResponse.length === 0
    );
    if (!result) {
      const response = startInThisData
        ? // stdoutResponse is empty now.
          // Not all the stdout is in the response. It may contain the part before start.
          extendedResponse
        : stdoutData;
      // Ignore the line beginning with the ignoreLineMarker.
      addStdoutResponse(
        process,
        current,
        handleIgnoreLine(
          current,
          shellSpec,
          response,
          current.stdoutResponse.length === 0 ||
            current.stdoutResponse.endsWith(shellSpec.lineEnding)
        )
      );
      return undefined;
    }
    // All the stdout is in the response. Recompute ignore line.
    current.stdoutIgnoringLine = undefined;
    const totalResponse = handleIgnoreLine(
      current,
      shellSpec,
      extendedResponse.slice(0, result.responseEndIndex),
      true
    );
    log.debug(`runOnStdoutAndDetectExitCode total response: `, totalResponse);
    current.stdoutResponse = totalResponse;
    return result.exitStatus;
  };

export const runOnStdoutAndDetectPartialLineFinishByPrompt: () => runOnStdoutAndDetectPartialLineEndFuncType =
  () => {
    let started = false;
    let stdoutForThisLine = "";
    let stdoutResponseForThisLine = "";

    return (
      process: Process,
      current: Command,
      shellSpec: ShellSpecification,
      stdoutData: string,
      boundaryDetector: string,
      continuationLineDetector: string
    ) => {
      addStdout(current, stdoutData);
      stdoutForThisLine += stdoutData;
      let startDetect: number | undefined = undefined;
      if (!started) {
        startDetect = detectStartOfResponseByPrompt(
          shellSpec,
          boundaryDetector,
          current.stdout
        );
        if (startDetect === undefined) {
          return false;
        }
        started = true;
        current.responseStarted = true;
        log.debug(
          `Response started in multiline command line: ${
            current.command
          } with index ${startDetect} in ${
            current.stdout
          }@(${current.stdout.slice(0, startDetect)})`
        );
      }
      const startInThisData = startDetect !== undefined;
      const extendedResponse = startInThisData
        ? // Start is detected in this part. stdoutResponse is empty now.
          stdoutForThisLine.slice(startDetect)
        : stdoutResponseForThisLine + stdoutData;
      const result = detectEndOfPartialLineResponseByPrompt(
        shellSpec,
        boundaryDetector,
        continuationLineDetector,
        extendedResponse,
        startInThisData || stdoutResponseForThisLine.length === 0
      );
      if (!result) {
        const response = startInThisData
          ? // stdoutResponse is empty now.
            // Not all the stdout is in the response. It may contain the part before start.
            extendedResponse
          : stdoutData;
        // Ignore the line beginning with the ignoreLineMarker.
        addStdoutResponse(process, current, response);
        stdoutResponseForThisLine += response;
        return false;
      }
      addStdoutResponse(
        process,
        current,
        extendedResponse.slice(0, result.responseEndIndex)
      );
      // Found exit status. Memorize it in current. (Possibly overwritten by others.)
      if (result.exitStatus !== undefined) {
        current.exitStatus = result.exitStatus;
      }
      return true;
    };
  };
