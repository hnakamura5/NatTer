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

export function receiveCommandResponse(
  process: Process,
  detectCommandResponseAndExitCode: detectCommandResponseAndExitCodeFunctionType,
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
    console.log(`detect stdoutResponse: ${current.stdoutResponse}, exitStatus: ${exitStatus}`);
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
