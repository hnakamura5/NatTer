import {
  Process,
  newProcess,
  clockIncrement,
  decodeFromShellEncoding,
  encodeToShellEncoding,
} from "@/server/types/Process";

import {
  Command,
  CommandID,
  CommandSchema,
  ProcessID,
  emptyCommand,
  getOutputPartOfStdout,
} from "@/datatypes/Command";
import { ShellConfig } from "@/datatypes/Config";

function addStdout(config: ShellConfig, current: Command, response: string) {
  current.stdout = current.stdout.concat(response);
}
function receiveCommandResponse(
  process: Process,
  onEnd?: (command: Command) => void
) {
  const current = process.currentCommand;
  // stdout handling.
  process.handle.onStdout((data: Buffer) => {
    // console.log(
    //   `Received data in command ${current.command} in process ${process.id} data: ${data} len: ${data.length}`
    // );
    if (current.isFinished) {
      console.log(`Received in Finished command`);
      return true;
    }
    const response = decodeFromShellEncoding(process, data);
    console.log(`onStdout: ${response}`);
    console.log(`onStdout: end.`);
    // Stdout handling. Emit the event, add to the command, and increment the clock.
    process.event.emit("stdout", {
      stdout: response,
      commandId: current.cid,
      clock: process.clock,
    });
    addStdout(process.config, current, response);
    clockIncrement(process);
    // Check if the command is finished.
    const detected = process.shellSpec.detectResponseAndExitCode({
      interact: process.config.interact,
      stdout: current.stdout,
      boundaryDetector: current.boundaryDetector,
    });
    const commandFinished = detected !== undefined;
    if (!commandFinished) {
      return false;
    }
    // Finish the command.
    const exitStatus = detected.exitStatus;
    current.isFinished = true;
    current.exitStatus = exitStatus;
    current.exitStatusIsOK = process.shellSpec.isExitCodeOK(exitStatus);
    console.log(
      `Finished ${process.id}-${current.cid} ${current.command} by status ${current.exitStatus} in process ${process.id}`
    );
    current.stdoutResponse = detected.response;
    console.log(`stdoutResponsePart: ${current.stdoutResponse}`);
    process.event.emit("finish", current);
    if (onEnd !== undefined) {
      console.log(`Call onEnd in process ${process.id}`);
      onEnd(current);
    }
    return true;
  });
  // stderr handling.
  process.handle.onStderr((data: Buffer) => {
    if (current.isFinished) {
      return;
    }
    const response = decodeFromShellEncoding(process, data);
    //console.log(`stderr: ${response}`);
    current.stderr = current.stderr.concat(response);
    process.event.emit("stderr", response);
    clockIncrement(process);
  });
}

export function executeCommandAndReceiveResponseByEcho(
  process: Process,
  exactCommand: { newCommand: string; boundaryDetector: string },
  onEnd?: (command: Command) => void
) {
  // TODO: prompt detection have to set the prompt before the command.
  receiveCommandResponse(process, onEnd);
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
  // The command including the end detector.
  console.log(`Execute command ${command} in process ${process.id}`);
  const encoded = encodeToShellEncoding(process, command);
  const exactCommand = process.shellSpec.extendCommandWithBoundaryDetector(
    encoded.toString()
  );
  console.log(
    `Execute command ${command} (exact: ${exactCommand.newCommand}) in process ${process.id}`
  );
  // Set new current command.
  process.currentCommand = emptyCommand(process.id, cid);
  const current = process.currentCommand;
  current.command = command;
  current.exactCommand = exactCommand.newCommand;
  current.currentDirectory = process.currentDirectory;
  current.user = process.user;
  current.boundaryDetector = exactCommand.boundaryDetector;
  current.styledCommand = styledCommand;
  executeCommandAndReceiveResponseByEcho(process, exactCommand, onEnd);
  console.log(`Executed command ${command} in process ${process.id}`);
  return process.currentCommand;
}
