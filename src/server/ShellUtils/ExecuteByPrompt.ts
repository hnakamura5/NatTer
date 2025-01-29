import { Process, clockIncrement } from "@/server/types/Process";
import {
  Command,
  CommandID,
  emptyCommand,
  newCommand,
} from "@/datatypes/Command";
import { ShellConfig } from "@/datatypes/Config";
import {
  runOnStdoutAndDetectExitCodeByPrompt,
  runOnStdoutAndDetectPartialLineFinishByPrompt,
} from "@/server/ShellUtils/BoundaryDetectorByPrompt";
import {
  defaultRandomBoundaryDetector,
  isCommandEchoBackToStdout,
  nonDuplicateDefaultRandomBoundaryDetector,
} from "@/server/ShellUtils/BoundaryDetectorUtils";
import {
  addStdout,
  commandFinishedHandler,
  commandToHtml,
  receiveCommandResponse,
  receivePartialLineResponse,
  saveCommandToTempFile,
} from "@/server/ShellUtils/ExecuteUtils";

import { log } from "@/datatypes/Logger";
import {
  ShellSpecification,
  isExitCodeOK,
  setContinuationPromptCommand,
  setPromptCommand,
  sourceCommand,
} from "@/datatypes/ShellSpecification";

function setPromptIsFinished(
  process: Process,
  boundaryDetector: string,
  stdout: string
) {
  let target = stdout;
  log.debug(`setPromptIsFinished: stdout = ${stdout}`);
  if (isCommandEchoBackToStdout(process.shellSpec, process.config.interact)) {
    for (let i = 0; i < 2; i++) {
      const index = target.indexOf(boundaryDetector); // Of prompt set command.
      if (index === -1) {
        return false;
      }
      target = target.slice(index + boundaryDetector.length);
    }
  }
  const result = target.indexOf(boundaryDetector);
  log.debug(`setPromptIsFinished: target = ${target}, result = ${result}`);
  return result !== -1;
}

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
  }${continuationPrompt || ""} ;echo "echotest"`;
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
    } else if (shellSpec.sourceCommand) {
      // When the command is multiline and has source command, run it by source command.
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
            isSilent,
            onEnd
          ).then(() => {
            process.handle.execute(source || command.exactCommand);
          });
        }
      );
    }
  }
  log.debug(
    `Execute single line exact command ${command.exactCommand} in process ${process.id}`
  );
  // Otherwise, run the command directly.
  if (true /* for test */) {
    return executeMultilineCommandLineByLine(
      process,
      command,
      command.exactCommand,
      boundaryDetector,
      continuationDetector,
      onEnd
    );
  }
  return receiveCommandResponse(
    process,
    boundaryDetector,
    runOnStdoutAndDetectExitCodeByPrompt,
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
