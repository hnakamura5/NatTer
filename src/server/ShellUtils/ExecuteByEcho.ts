import {
  Process,
  clockIncrement,
  decodeFromShellEncoding,
  encodeToShellEncoding,
} from "@/server/types/Process";
import {
  Command,
  CommandID,
  emptyCommand,
  newCommand,
} from "@/datatypes/Command";
import { ShellConfig } from "@/datatypes/Config";
import {
  detectCommandResponseAndExitCodeByEcho,
  extendCommandWithBoundaryDetectorByEcho,
} from "./BoundaryDetectorByEcho";
import { receiveCommandResponse } from "./ExecuteUtils";

export function executeCommandAndReceiveResponseByEcho(
  process: Process,
  exactCommand: { newCommand: string; boundaryDetector: string },
  onEnd?: (command: Command) => void
) {
  // TODO: prompt detection have to set the prompt before the command.
  receiveCommandResponse(
    process,
    detectCommandResponseAndExitCodeByEcho,
    onEnd
  );
  // Execute the command.
  process.handle.execute(exactCommand.newCommand);
}

export function executeCommandByEcho(
  process: Process,
  command: string,
  cid: CommandID,
  styledCommand?: string,
  onEnd?: (command: Command) => void
): Command {
  // The command including the detector.
  const encoded = encodeToShellEncoding(process, command);
  const exactCommand = extendCommandWithBoundaryDetectorByEcho(
    process.shellSpec,
    encoded.toString()
  );
  console.log(
    `Execute command ${command} (exact: ${exactCommand.newCommand}) in process ${process.id} cid: ${cid}`
  );
  // Set new current command.
  process.currentCommand = newCommand(
    process.id,
    cid,
    command,
    exactCommand.newCommand,
    process.currentDirectory,
    process.user,
    exactCommand.boundaryDetector,
    styledCommand
  );
  executeCommandAndReceiveResponseByEcho(process, exactCommand, onEnd);
  console.log(`Executed command ${command} in process ${process.id}`);
  return process.currentCommand;
}
