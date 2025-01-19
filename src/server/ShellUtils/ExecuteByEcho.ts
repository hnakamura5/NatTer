import {
  Process,
  clockIncrement,
} from "@/server/types/Process";
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
import { receiveCommandResponse } from "@/server/ShellUtils/ExecuteUtils";

import { log } from "@/datatypes/Logger";

export function executeCommandAndReceiveResponseByEcho(
  process: Process,
  exactCommand: { newCommand: string; boundaryDetector: string },
  isSilent?: boolean,
  onEnd?: (command: Command) => void
) {
  // TODO: prompt detection have to set the prompt before the command.
  receiveCommandResponse(
    process,
    exactCommand.boundaryDetector,
    runOnStdoutAndDetectExitCodeByEcho,
    isSilent,
    onEnd
  ).then(() => {
    // Execute the command.
    process.handle.execute(exactCommand.newCommand);
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
  // The command including the detector.
  const exactCommand = extendCommandWithBoundaryDetectorByEcho(
    process.shellSpec,
    command
  );
  log.debug(`executeCommandByEcho: ${command}`);
  // Set new current command.
  process.currentCommand = newCommand(
    process.id,
    cid,
    command,
    exactCommand.newCommand,
    process.currentDirectory,
    process.user,
    exactCommand.boundaryDetector,
    exactCommand.lineIgnoreMarker,
    styledCommand,
    process.handle.getSize()
  );
  executeCommandAndReceiveResponseByEcho(
    process,
    exactCommand,
    isSilent,
    onEnd
  );
  return process.currentCommand;
}
