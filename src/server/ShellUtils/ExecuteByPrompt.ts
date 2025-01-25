import { Process, clockIncrement } from "@/server/types/Process";
import {
  Command,
  CommandID,
  emptyCommand,
  newCommand,
} from "@/datatypes/Command";
import { ShellConfig } from "@/datatypes/Config";
import { runOnStdoutAndDetectExitCodeByPrompt } from "@/server/ShellUtils/BoundaryDetectorByPrompt";
import {
  defaultRandomBoundaryDetector,
  isCommandEchoBackToStdout,
} from "@/server/ShellUtils/BoundaryDetectorUtils";
import { receiveCommandResponse } from "@/server/ShellUtils/ExecuteUtils";

import { log } from "@/datatypes/Logger";
import { setPromptCommand } from "@/datatypes/ShellSpecification";

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
  onEnd?: (command: Command) => void
) {
  // Set detector to the prompt.
  if (!process.shellSpec.promptCommands) {
    throw new Error("Prompt commands are not defined.");
  }

  const promptText = `${boundaryDetector}${process.shellSpec.exitCodeVariable}${boundaryDetector}`;
  const setCommand = setPromptCommand(process.shellSpec, promptText);
  if (!setCommand) {
    throw new Error("Prompt command is not defined.");
  }
  log.debug(`setPrompt: ${setCommand}`);
  process.currentCommand = newCommand(
    process.id,
    cid,
    setCommand,
    setCommand,
    process.currentDirectory,
    process.user,
    boundaryDetector,
    undefined,
    undefined,
    process.handle.getSize()
  );
  receiveCommandResponse(
    process,
    boundaryDetector,
    runOnStdoutAndDetectExitCodeByPrompt,
    true, // silent
    onEnd
  ).then(() => {
    process.handle.execute(setCommand!);
  });
}

function executeExactCommand(
  process: Process,
  command: Command,
  boundaryDetector: string,
  isSilent?: boolean,
  onEnd?: (command: Command) => void
) {
  log.debug(
    `Execute exact command ${command.exactCommand} in process ${process.id}`
  );
  process.currentCommand = command;
  receiveCommandResponse(
    process,
    boundaryDetector,
    runOnStdoutAndDetectExitCodeByPrompt,
    isSilent,
    onEnd
  ).then(() => {
    process.handle.execute(command.exactCommand);
  });
}

function executeCommandAndReceiveResponseByPrompt(
  process: Process,
  command: string,
  cid: CommandID,
  boundaryDetector: string,
  styledCommand?: string,
  isSilent?: boolean,
  onEnd?: (command: Command) => void
) {}

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
    /* onEnd */ () => {
      log.debug(
        `setPrompt finished. Execute command ${exactCommand} in process ${process.id} cid: ${cid}`
      );
      // Execute the command and receive the response.
      executeExactCommand(
        process,
        currentCommand,
        boundaryDetector,
        isSilent,
        onEnd
      );
    }
  );
  return currentCommand;
}
