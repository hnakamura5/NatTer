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
import { ShellSpecification } from "@/datatypes/ShellSpecification";
import { ShellInteractKind } from "@/datatypes/ShellInteract";

function addStdout(config: ShellConfig, current: Command, response: string) {
  current.stdout = current.stdout.concat(response);
}

export type detectCommandResponseAndExitCodeFunctionType = (
  shellSpec: ShellSpecification,
  interact: ShellInteractKind,
  stdout: string,
  boundaryDetector: string
) => { response: string; exitStatus: string } | undefined;

export function withCanonicalTerminalSizeTemporarily(
  process: Process,
  onEnd?: (command: Command) => void
) {
  const size = process.handle.getSize();
  if (size?.cols === 512 && size?.rows === 16) {
    return onEnd;
  }
  process.handle.resize(512, 16);
  return (command: Command) => {
    if (size) {
      process.handle.resize(size.rows, size.cols);
    }
    if (onEnd) {
      onEnd(command);
    }
  };
}

export function receiveCommandResponse(
  process: Process,
  detectCommandResponseAndExitCode: detectCommandResponseAndExitCodeFunctionType,
  isSilent?: boolean,
  onEnd?: (command: Command) => void
) {
  const current = process.currentCommand;
  if (isSilent) {
    //onEnd = withCanonicalTerminalSizeTemporarily(process, onEnd);
  }
  // stdout handling.
  process.handle.onStdout((data: Buffer) => {
    // console.log(
    //   `Received data in command ${current.command} in process ${process.id} data: ${data} len: ${data.length}`
    // );
    const response = decodeFromShellEncoding(process, data);
    console.log(`onStdout: ${response}`);
    if (current.isFinished) {
      console.log(`onStdout for finished end.`);
      return true;
    }
    console.log(`onStdout end.`);
    // Stdout handling. Emit the event, add to the command, and increment the clock.
    process.event.emit("stdout", {
      cid: current.cid,
      stdout: response,
      isFinished: current.isFinished,
      clock: process.clock,
    });
    addStdout(process.config, current, response);
    clockIncrement(process);
    // Check if the command is finished.
    const detected = detectCommandResponseAndExitCode(
      process.shellSpec,
      process.config.interact,
      current.stdout,
      current.boundaryDetector
    );
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
    console.log(
      `detect stdoutResponse: ${current.stdoutResponse}, exitStatus: ${exitStatus}`
    );
    process.handle.clear(); // TODO: Is this required?
    process.event.emit("finish", current);
    if (onEnd !== undefined) {
      console.log(
        `Call onEnd in process ${process.id} for command ${current.exactCommand}`
      );
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
