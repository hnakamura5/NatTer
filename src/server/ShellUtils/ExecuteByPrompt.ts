import { Process, clockIncrement } from "@/server/types/Process";
import { Command, CommandID, newCommand } from "@/datatypes/Command";
import {
  defaultRandomBoundaryDetector,
  nonDuplicateDefaultRandomBoundaryDetector,
  getCommandWithDelimiterSandwichOnDemand,
  handleIgnoreLine,
} from "@/server/ShellUtils/BoundaryDetectorUtils";

import {
  addStdout,
  commandFinishedHandler,
  commandToHtml,
  receiveCommandResponse,
  receivePartialLineResponse,
  saveCommandToTempFile,
  addStdoutResponse,
  replaceStdoutResponse,
  runOnStdoutAndDetectExitCodeFuncType,
  runOnStdoutAndDetectPartialLineEndFuncType,
} from "@/server/ShellUtils/ExecuteUtils";
import { log } from "@/datatypes/Logger";
import {
  setContinuationPromptCommand,
  sourceCommand,
} from "@/datatypes/ShellSpecification";
import {
  ShellSpecification,
  setPromptCommand,
} from "@/datatypes/ShellSpecification";
import stripAnsi from "strip-ansi";

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
    )} \\rDetect: ${target.indexOf("\r")}`
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

const runOnStdoutAndDetectExitCodeByPrompt: runOnStdoutAndDetectExitCodeFuncType =
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

const runOnStdoutAndDetectPartialLineFinishByPrompt: () => runOnStdoutAndDetectPartialLineEndFuncType =
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
          stdoutForThisLine
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
          } at after (${stdoutForThisLine.slice(0, startDetect)})`
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
      const totalResponse = extendedResponse.slice(0, result.responseEndIndex);
      replaceStdoutResponse(current, stdoutResponseForThisLine, totalResponse);
      // TODO: Ad hoc newline.
      if (current.exactCommand.length > 0 && totalResponse.length > 0) {
        current.stdoutResponse += shellSpec.lineEnding;
      }
      // Found exit status. Memorize it in current. (Possibly overwritten by others.)
      if (result.exitStatus !== undefined) {
        current.exitStatus = result.exitStatus;
      }
      return true;
    };
  };

async function setPrompt(
  process: Process,
  cid: CommandID,
  boundaryDetector: string,
  ignoreLineMarker: string,
  onEnd?: (command: Command) => void
) {
  // Set detector to the prompt.
  if (!process.shellSpec.promptCommands) {
    throw new Error("Prompt commands are not defined.");
  }
  const promptText = `${boundaryDetector}${process.shellSpec.exitCodeVariable}${boundaryDetector}`;
  const continuationPrompt = setContinuationPromptCommand(
    process.shellSpec,
    ignoreLineMarker
  );
  const setCommand = setPromptCommand(process.shellSpec, promptText);
  if (!setCommand) {
    throw new Error("Prompt command is not defined.");
  }
  const setBothCommand = `${setCommand}${
    continuationPrompt ? process.shellSpec.delimiter : ""
  }${continuationPrompt || ""}`;
  log.debug(`setPrompt: ${setBothCommand}`);
  process.currentCommand = newCommand(
    process.id,
    cid,
    setBothCommand,
    setBothCommand,
    process.currentDirectory,
    process.user,
    boundaryDetector,
    undefined,
    undefined,
    process.handle.getSize()
  );
  const continuationDetector = nonDuplicateDefaultRandomBoundaryDetector(
    process.config.interact === "terminal",
    process.shellSpec,
    boundaryDetector
  );
  receiveCommandResponse(
    process,
    boundaryDetector,
    runOnStdoutAndDetectExitCodeByPrompt,
    /* runOnStderrAndDetectExitCode */ undefined,
    true, // silent
    onEnd
  ).then(() => {
    process.handle.execute(setBothCommand!);
  });
}

async function executePartialLine(
  process: Process,
  line: string,
  boundaryDetector: string,
  ignoreLineMarker: string
) {
  // Promise waiting for the end of the line.
  return new Promise((resolve) => {
    receivePartialLineResponse(
      process,
      boundaryDetector,
      ignoreLineMarker,
      runOnStdoutAndDetectPartialLineFinishByPrompt(),
      /* onFinished */ () => {
        resolve(true);
      }
    );
    log.debug(`executePartialLine: ${line} in process ${process.id}`);
    process.handle.execute(line);
  });
}

async function executeMultilineCommandLineByLine(
  process: Process,
  current: Command,
  command: string,
  boundaryDetector: string,
  continuationDetector: string,
  onEnd?: (command: Command) => void
) {
  if (!process.shellSpec.promptCommands?.setContinuation) {
    log.debugTrace(
      `executeMultilineCommandLineByLine: setContinuation is not defined: ${process.shellSpec.name}`
    );
    throw new Error("Prompt commands are not defined.");
  }
  for (const line of command.split("\n")) {
    await executePartialLine(
      process,
      line,
      boundaryDetector,
      continuationDetector
    );
  }
  commandFinishedHandler(process, current, onEnd);
  return true;
}

function executeExactCommand(
  process: Process,
  command: Command,
  boundaryDetector: string,
  continuationDetector: string,
  isSilent?: boolean,
  onEnd?: (command: Command) => void
) {
  log.debug(
    `Execute exact command ${command.exactCommand} in process ${process.id}`
  );
  const shellSpec = process.shellSpec;
  process.currentCommand = command;
  if (shellSpec.sourceCommand) {
    // Source command is the best way now. Robust for syntax error and multiline.
    return saveCommandToTempFile(process, command.exactCommand).then(
      (filePath) => {
        const source = sourceCommand(shellSpec, filePath);
        log.debug(
          `Execute multiline command by source ${command.exactCommand} with source command ${sourceCommand} in process ${process.id}`
        );
        return receiveCommandResponse(
          process,
          boundaryDetector,
          runOnStdoutAndDetectExitCodeByPrompt,
          /* runOnStderrAndDetectExitCode */ undefined,
          isSilent,
          onEnd
        ).then(() => {
          process.handle.execute(source || command.exactCommand);
        });
      }
    );
  }
  const isMultiline = command.exactCommand.includes("\n");
  if (isMultiline) {
    if (shellSpec.promptCommands?.setContinuation) {
      // When the command is multiline, run it one line by one.
      log.debug(
        `Execute multiline command line by line ${command.exactCommand} in process ${process.id}`
      );
      return executeMultilineCommandLineByLine(
        process,
        command,
        command.exactCommand,
        boundaryDetector,
        continuationDetector,
        onEnd
      );
    }
  }
  log.debug(
    `Execute single line exact command ${command.exactCommand} in process ${process.id}`
  );
  // Otherwise, run the command directly. This is not robust.
  return receiveCommandResponse(
    process,
    boundaryDetector,
    runOnStdoutAndDetectExitCodeByPrompt,
    /* runOnStderrAndDetectExitCode */ undefined,
    isSilent,
    onEnd
  ).then(() => {
    process.handle.execute(command.exactCommand);
  });
}

export function executeCommandByPrompt(
  process: Process,
  command: string,
  cid: CommandID,
  styledCommand?: string,
  isSilent?: boolean,
  onEnd?: (command: Command) => void
) {
  // The command including the detector
  const boundaryDetector = defaultRandomBoundaryDetector(
    process.config.interact === "terminal",
    process.shellSpec
  );
  const continuationDetector = nonDuplicateDefaultRandomBoundaryDetector(
    process.config.interact === "terminal",
    process.shellSpec,
    boundaryDetector
  );
  const exactCommand = command;
  log.debug(
    `Execute command by prompt ${command} (exact: ${exactCommand}) in process ${process.id} cid: ${cid}`
  );
  // Command to execute the command. setCommand uses another command.
  const currentCommand = newCommand(
    process.id,
    cid,
    exactCommand,
    exactCommand,
    process.currentDirectory,
    process.user,
    boundaryDetector,
    undefined,
    styledCommand,
    process.handle.getSize()
  );
  // First, set the prompt and wait it to finish. Then, execute the command.
  setPrompt(
    process,
    cid,
    boundaryDetector,
    continuationDetector,
    /* onEnd */ () => {
      log.debug(
        `setPrompt finished. Execute command ${exactCommand} in process ${process.id} cid: ${cid}`
      );
      // Execute the command and receive the response.
      executeExactCommand(
        process,
        currentCommand,
        boundaryDetector,
        continuationDetector,
        isSilent,
        onEnd
      );
    }
  );
  return currentCommand;
}
