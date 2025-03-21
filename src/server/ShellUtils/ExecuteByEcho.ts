import { Process } from "@/server/types/Process";
import { Command, CommandID, newCommand } from "@/datatypes/Command";
import {
  receiveCommandResponse,
  saveCommandToTempFile,
} from "@/server/ShellUtils/ExecuteUtils";
import {
  handleIgnoreLine,
  defaultRandomBoundaryDetector,
  nonDuplicateDefaultRandomBoundaryDetector,
} from "@/server/ShellUtils/BoundaryDetectorUtils";
import { log } from "@/datatypes/Logger";
import {
  ShellSpecification,
  echoToStderr,
  echoToStdout,
  setContinuationPromptCommand,
  setPromptCommand,
  sourceCommand,
} from "@/datatypes/ShellSpecification";
import {
  addStdout,
  addStdoutResponse,
  runOnStdoutAndDetectExitCodeFuncType,
  runOnStderrAndDetectEndFuncType,
} from "@/server/ShellUtils/ExecuteUtils";
import stripAnsi from "strip-ansi";

// Implement detection algorithm using echo command.
// This is suitable for non-terminal shells.

function startEchoCommand(
  shellSpec: ShellSpecification,
  boundaryDetector: string,
  lineIgnoreMarker: string
) {
  const delimiter = shellSpec.delimiter;
  // TODO: setContinuationPromptCommand does not work in powershell.
  // TODO: We have to save to temporary file and source it.
  const setPrompt = setPromptCommand(shellSpec, lineIgnoreMarker);
  const setContinuationPrompt = setContinuationPromptCommand(
    shellSpec,
    lineIgnoreMarker
  );
  const echoStdout = echoToStdout(shellSpec, boundaryDetector);
  return `${setPrompt || ""}${setPrompt ? delimiter : ""}${
    setContinuationPrompt || ""
  }${setContinuationPrompt ? delimiter : ""}${echoStdout || ""}`;
}

function endEchoCommand(
  shellSpec: ShellSpecification,
  boundaryDetector: string
) {
  // NOTE:Add a space at the end of the command for the case quote is empty. for the case multiline execution.
  const delimiter = shellSpec.delimiter;
  const echoStdErr = echoToStderr(shellSpec, boundaryDetector);
  const echoStdout = echoToStdout(
    shellSpec,
    `${boundaryDetector}${shellSpec.exitCodeVariable}${boundaryDetector}`
  );
  return `${echoStdout || ""}${echoStdout && echoStdErr ? delimiter : ""}${
    echoStdErr || ""
  }`;
}

// Extend the command with the boundary detector.
/* The result command will output
 * <boundaryDetector>
 * <command output>
 * <boundaryDetector><exitCodeVariable><boundaryDetector>
 * We can detect detect the start of the output by <boundaryDetector>\n
 * And detect the end of the output by \n<boundaryDetector>
 */
function extendCommandWithBoundaryDetectorByEcho(
  shellSpec: ShellSpecification,
  command: string,
  boundaryDetector: string,
  lineIgnoreMarker: string
) {
  const needDelimiterAfterCommand =
    command.length > 0 && !command.trim().endsWith(shellSpec.delimiter);
  const delimiterAfterCommand = needDelimiterAfterCommand
    ? shellSpec.delimiter
    : "";
  const commandSeparator = command.includes("\n") ? shellSpec.lineEnding : " ";
  const delimiterBeforeCommand = shellSpec.delimiter;
  const startEcho = startEchoCommand(
    shellSpec,
    boundaryDetector,
    lineIgnoreMarker
  );
  const endEcho = endEchoCommand(shellSpec, boundaryDetector);
  const newCommand = `${startEcho}${delimiterBeforeCommand}${command}${commandSeparator}${delimiterAfterCommand}${endEcho}`;
  return newCommand;
}

function detectStartOfResponseByEcho(
  shellSpec: ShellSpecification,
  boundaryDetector: string,
  target: string
) {
  log.debug(
    `detectStartOfResponseByEcho: ${target} detector:${boundaryDetector}`
  );
  const startDetect = target.indexOf(boundaryDetector + shellSpec.lineEnding);
  if (startDetect === -1) {
    return undefined;
  }
  return startDetect + boundaryDetector.length + shellSpec.lineEnding.length;
}

function detectEndOfResponseByEcho(
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
    `detectEndOfResponseByEcho: ${target} detector:${boundaryDetector} endDetect:${endDetect} toDetect:${toDetect} responseHead:${responseHead}`
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

const runOnStdoutAndDetectExitCodeByEcho: runOnStdoutAndDetectExitCodeFuncType =
  (
    process: Process,
    current: Command,
    shellSpec: ShellSpecification,
    stdoutData: string,
    boundaryDetector: string
  ) => {
    log.debug(
      `runOnStdoutAndDetectExitCodeFunc stdout:\n=====\n${stdoutData} \n=====\nrunOnStdoutAndDetectExitCodeFunc end. (len: ${stdoutData.length})`
    );
    addStdout(current, stdoutData);
    // TODO: Handle ignore line before the response starts and end detection?
    // TODO: ignoreLineMarker may be separated in several stdout onData.
    // Check if the response of the command is started.
    let startDetect: number | undefined = undefined;
    if (!current.responseStarted) {
      startDetect = detectStartOfResponseByEcho(
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
    const result = detectEndOfResponseByEcho(
      shellSpec,
      boundaryDetector,
      extendedResponse,
      startInThisData || current.stdoutResponse.length === 0
    );
    // TODO: Boundary detector for stderr.
    // log.debug(
    //   `  detectEndOfResponseByEcho extendedResponse: ${extendedResponse}, result: `,
    //   result
    // );
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

const runOnStderrAndDetectExitCodeByEcho: runOnStderrAndDetectEndFuncType = (
  process: Process,
  current: Command,
  shellSpec: ShellSpecification,
  stderrData: string,
  boundaryDetector: string
) => {
  const extendedStderr = current.stderr + stderrData;
  const endDetect = extendedStderr.indexOf(boundaryDetector);
  if (endDetect === -1) {
    return false;
  }
  current.stderr = extendedStderr.slice(0, endDetect);
  return true;
};

function executeCommandAndReceiveResponseByEcho(
  process: Process,
  current: Command,
  command: string,
  boundaryDetector: string,
  lineContinuationDetector: string,
  isSilent?: boolean,
  onEnd?: (command: Command) => void
) {
  // TODO: prompt detection have to set the prompt before the command.
  const exactCommand = extendCommandWithBoundaryDetectorByEcho(
    process.shellSpec,
    command,
    boundaryDetector,
    lineContinuationDetector
  );
  log.debug(`executeCommandByEcho: ${command} exact: ${exactCommand}`);
  // Set new current command.
  process.currentCommand = current;
  return receiveCommandResponse(
    process,
    boundaryDetector,
    runOnStdoutAndDetectExitCodeByEcho,
    runOnStderrAndDetectExitCodeByEcho,
    isSilent,
    onEnd
  ).then(() => {
    process.shell.execute(exactCommand);
  });
}

export function executeCommandByEcho(
  process: Process,
  command: string,
  cid: CommandID,
  styledCommand?: string,
  isSilent?: boolean,
  onEnd?: (command: Command) => void
): Command {
  const shellSpec = process.shellSpec;
  const boundaryDetector = defaultRandomBoundaryDetector(false, shellSpec);
  const lineContinuationDetector = nonDuplicateDefaultRandomBoundaryDetector(
    process.config.interact === "terminal",
    shellSpec,
    boundaryDetector
  );
  // The command including the detector.
  // TODO: In order to deal with syntax error, We have to use save file mode.
  const current = newCommand(
    process.id,
    cid,
    command,
    command,
    process.currentDirectory,
    process.user,
    boundaryDetector,
    lineContinuationDetector,
    styledCommand,
    process.pty?.getSize()
  );
  if (shellSpec.sourceCommand) {
    // When the shell has source command, run by it for safety over syntax error.
    log.debug(
      `executeCommandByEcho temp file ${command} in process ${process.id} cid: ${cid}`
    );
    saveCommandToTempFile(process, command).then((filePath) => {
      const source = sourceCommand(shellSpec, filePath);
      executeCommandAndReceiveResponseByEcho(
        process,
        current,
        source || command,
        boundaryDetector,
        lineContinuationDetector,
        isSilent,
        onEnd
      );
    });
  } else {
    // Execute the command in raw.
    // TODO: How to detect end on error?
    log.debug(
      `executeCommandByEcho direct ${command} in process ${process.id} cid: ${cid}`
    );
    executeCommandAndReceiveResponseByEcho(
      process,
      current,
      command,
      boundaryDetector,
      lineContinuationDetector,
      isSilent,
      onEnd
    );
  }
  return current;
}
