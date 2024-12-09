import { Process, clockIncrement } from "@/server/types/Process";
import {
  Command,
  CommandID,
  emptyCommand,
  newCommand,
} from "@/datatypes/Command";
import { ShellConfig } from "@/datatypes/Config";
import { detectCommandResponseAndExitCodeByPrompt } from "@/server/ShellUtils/BoundaryDetectorByPrompt";
import {
  defaultRandomBoundaryDetector,
  isCommandEchoBackToStdout,
} from "@/server/ShellUtils/BoundaryDetectorUtils";
import { receiveCommandResponse } from "@/server/ShellUtils/ExecuteUtils";

function setPromptIsFinished(
  process: Process,
  boundaryDetector: string,
  stdout: string
) {
  let target = stdout;
  console.log(`setPromptIsFinished: stdout = ${stdout}`);
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
  console.log(`setPromptIsFinished: target = ${target}, result = ${result}`);
  return result !== -1;
}

async function setPrompt(process: Process, boundaryDetector: string) {
  // Set detector to the prompt.
  if (!process.shellSpec.promptCommands) {
    throw new Error("Prompt commands are not defined.");
  }
  let stdout = "";
  let finished = false;
  process.handle.onStdout((data: Buffer) => {
    if (finished) {
      return;
    }
    stdout = stdout.concat(data.toString());
    if (setPromptIsFinished(process, boundaryDetector, stdout)) {
      finished = true;
    }
  });
  const promptText = `${boundaryDetector}${process.shellSpec.exitCodeVariable}${boundaryDetector}`;
  const setCommand = process.shellSpec.promptCommands.set(promptText);
  console.log(`setPrompt: ${setCommand}`);
  process.handle.execute(setCommand);
  return new Promise<void>((resolve) => {
    // Wait until finished is set to true.
    const interval = setInterval(() => {
      if (finished) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
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
  const exactCommand = command.toString();
  console.log(
    `Execute command by prompt ${command} (exact: ${exactCommand}) in process ${process.id} cid: ${cid}`
  );
  process.currentCommand = newCommand(
    process.id,
    cid,
    exactCommand,
    exactCommand,
    process.currentDirectory,
    process.user,
    boundaryDetector,
    styledCommand,
    process.handle.getSize()
  );
  setPrompt(process, boundaryDetector).then(() => {
    // Execute the command and receive the response.
    receiveCommandResponse(
      process,
      detectCommandResponseAndExitCodeByPrompt,
      isSilent,
      onEnd
    ).then(() => {
      process.handle.execute(exactCommand);
    });
  });
}
