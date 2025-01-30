import { Process, clockIncrement } from "@/server/types/Process";
import {
  Command,
  CommandID,
  emptyCommand,
  newCommand,
} from "@/datatypes/Command";
import { ShellConfig } from "@/datatypes/Config";
import {
  runOnStdoutAndDetectExitCodeByEcho,
  extendCommandWithBoundaryDetectorByEcho,
} from "./BoundaryDetectorByEcho";
import {
  receiveCommandResponse,
  saveCommandToTempFile,
} from "@/server/ShellUtils/ExecuteUtils";

import { log } from "@/datatypes/Logger";
import { parenCommand, sourceCommand } from "@/datatypes/ShellSpecification";
import {
  defaultRandomBoundaryDetector,
  nonDuplicateDefaultRandomBoundaryDetector,
} from "./BoundaryDetectorUtils";

export function executeCommandAndReceiveResponseByEcho(
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
  log.debug(`executeCommandByEcho: ${command}`);
  // Set new current command.
  process.currentCommand = current;
  return receiveCommandResponse(
    process,
    boundaryDetector,
    runOnStdoutAndDetectExitCodeByEcho,
    isSilent,
    onEnd
  ).then(() => {
    process.handle.execute(exactCommand);
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
    process.handle.getSize()
  );
  if (shellSpec.sourceCommand) {
    // When the shell has source command, run by it for safety over syntax error.
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
