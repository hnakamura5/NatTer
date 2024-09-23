import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { ShellSpecification } from "@/datatypes/ShellSpecification";

export type OpaqueProcess = {
  handle: ChildProcessWithoutNullStreams;
  shellSpec: ShellSpecification;
};

export function startProcess(
  shellSpec: ShellSpecification,
  command: string,
  args: string[]
): OpaqueProcess {
  const process = spawn(command, args);
  return { handle: process, shellSpec: shellSpec };
}

export function executeCommand(
  process: OpaqueProcess,
  command: string,
  receiveStdout: (response: string) => void,
  receiveStdError: (response: string) => void,
  receiveEndOfCommand: () => void
) {
  const commandExtended =
    process.shellSpec.extendCommandWithEndDetector(command);
  process.handle.stdin.write(commandExtended + "\n");
  process.handle.stdout.on("data", (data) => {
    // TODO: encoding?
    const response = data.toString();
    receiveStdout(response);
    if (process.shellSpec.detectEndOfCommandResponse(response)) {
      // End of command.
      receiveEndOfCommand();
    }
  });
  process.handle.stderr.on("data", (data) => {
    const response = data.toString();
    receiveStdError(response);
  });
}

export function stopProcess(process: OpaqueProcess) {
  process.handle.kill();
}
