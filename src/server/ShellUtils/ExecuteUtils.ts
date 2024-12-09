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
import { ShellSpecification } from "@/datatypes/ShellSpecification";
import { ShellInteractKind } from "@/datatypes/ShellInteract";
import { Terminal } from "@xterm/headless";
import stripAnsi from "strip-ansi";
import { SerializeAddon } from "@xterm/addon-serialize";

import DOMPurify from "dompurify";
import { AnsiUp } from "@/datatypes/ansiUpCustom";

const Cols = 512;
const Rows = 64;

function stripAnsiInTerminal(text: string) {
  const xterm = new Terminal({
    allowProposedApi: true,
  });
  const serializeAddon = new SerializeAddon();
  xterm.loadAddon(serializeAddon);
  xterm.clear();
  xterm.reset();
  xterm.resize(Cols, Rows);
  console.log(`stripAnsi: write ${text}`);
  let result: string | undefined = undefined;
  xterm.write(text, () => {
    result = serializeAddon.serialize();
    console.log(`stripAnsi: write done serial: ${result}`);
  });
  return new Promise<string>((resolve) => {
    const interval = setInterval(() => {
      if (result) {
        clearInterval(interval);
        resolve(stripAnsi(result));
      }
    }, 100);
  });
}

async function ansiToHtmlInTerminal(cols: number, rows: number, text: string) {
  const xterm = new Terminal({
    allowProposedApi: true,
  });
  const serializeAddon = new SerializeAddon();
  xterm.loadAddon(serializeAddon);
  xterm.resize(cols, rows);
  return new Promise<string>((resolve) => {
    xterm.write(text, () => {
      resolve(serializeAddon.serializeAsHTML());
    });
  });
}

const ansiUp = new AnsiUp();
function ansiToHtmlNonTerminal(text: string) {
  return ansiUp.ansi_to_html(text).replace(/\n/g, "<br>");
}

export async function commandToHtml(process: Process, command: Command) {
  const interact = process.config.interact;
  if (interact === "terminal") {
    const { cols, rows } = process.handle.getSize() || {
      cols: Cols,
      rows: Rows,
    };
    const stdoutHTML = await ansiToHtmlInTerminal(
      cols,
      rows,
      command.stdoutResponse
    );
    const stderrHTML = await ansiToHtmlInTerminal(cols, rows, command.stderr);
    return { stdoutHTML, stderrHTML };
  } else {
    const stdoutHTML = ansiToHtmlNonTerminal(command.stdoutResponse);
    const stderrHTML = ansiToHtmlNonTerminal(command.stderr);
    return { stdoutHTML, stderrHTML };
  }
}

// Convert ANSI to plain text and remove the command itself if included.
// The caller must remove end boundaryDetector by themselves.
export async function getStdoutOutputPartInPlain(
  command: Command,
  includesCommandItSelf: boolean
) {
  const result = (await stripAnsiInTerminal(command.stdoutResponse)).trim();
  console.log(
    `getStdoutOutputPartInPlain: pid=${command.pid} result=${result}, includesCommandItSelf=${includesCommandItSelf} exactCommand=${command.exactCommand}`
  );
  if (!includesCommandItSelf) {
    return result;
  }
  const commandIndex = result.indexOf(command.exactCommand);
  console.log(
    `getStdoutOutputPartInPlain: commandIndex: ${commandIndex} (-1 but OK)`
  );
  if (commandIndex === -1) {
    return result;
  }
  const sliceStart = commandIndex + command.exactCommand.length + 1;
  return result.slice(sliceStart).trim();
}

function addStdout(config: ShellConfig, current: Command, response: string) {
  current.stdout = current.stdout.concat(response);
}

export type detectCommandResponseAndExitCodeFunctionType = (
  shellSpec: ShellSpecification,
  interact: ShellInteractKind,
  stdout: string,
  boundaryDetector: string
) => { response: string; exitStatus: string } | undefined;

async function resizeAndWait(process: Process, cols: number, rows: number) {
  // TODO: Too a dirty hack to detect the end of the resizing.
  let completed = false;
  let interval: NodeJS.Timeout | undefined = undefined;
  process.handle.onStdout((data: Buffer) => {
    // Dispose the rewriting of stdout by resize.
    const response = data.toString();
    console.log(`onStdout by resize: ${response}`);
    if (interval) {
      clearInterval(interval);
    }
    interval = setInterval(() => {
      completed = true;
    }, 100);
  });
  process.handle.resize(Cols, Rows);
  // wait 500 ms
  //await new Promise((resolve) => setTimeout(resolve, 500));
  let count = 0;
  while (!completed) {
    if (count++ > 100) {
      throw new Error("Resize failed.");
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function withCanonicalTerminalSizeTemporarily(
  process: Process,
  onEnd?: (command: Command) => void
) {
  const size = process.handle.getSize();
  if (size?.cols === Cols && size?.rows === Rows) {
    return onEnd;
  }
  console.log(`cols: ${size?.cols}, rows: ${size?.rows}`);
  // TODO: Resizing causes the terminal puts many lines to the stdout.
  // TODO: e.g. \e[K (line clear) and previous commands.
  await resizeAndWait(process, Cols, Rows);
  console.log(`Resize done.`);
  return (command: Command) => {
    if (size) {
      resizeAndWait(process, size.cols, size.rows).then(() => {
        if (onEnd) {
          onEnd(command);
        }
      });
    } else {
      if (onEnd) {
        onEnd(command);
      }
    }
  };
}

export async function receiveCommandResponse(
  process: Process,
  detectCommandResponseAndExitCode: detectCommandResponseAndExitCodeFunctionType,
  isSilent?: boolean,
  onEnd?: (command: Command) => void
) {
  const current = process.currentCommand;
  if (isSilent && process.config.interact === "terminal") {
    onEnd = await withCanonicalTerminalSizeTemporarily(process, onEnd);
  }
  // stdout handling.
  process.handle.onStdout((data: Buffer) => {
    // console.log(
    //   `Received data in command ${current.command} in process ${process.id} data: ${data} len: ${data.length}`
    // );
    const response = data.toString();
    if (current.isFinished) {
      console.log(`onStdout for finished end.`);
      return true;
    }
    console.log(`onStdout end.`);
    addStdout(process.config, current, response);
    clockIncrement(process);
    // Stdout handling. Emit the event, add to the command, and increment the clock.
    // Note stdout is concatenated in the command before emitting the event.
    // See onStdout in ShellProcess.ts.
    process.event.emit("stdout", {
      cid: current.cid,
      stdout: response,
      isFinished: current.isFinished,
      clock: process.clock,
    });
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
    commandToHtml(process, current).then(({ stdoutHTML, stderrHTML }) => {
      current.stdoutHTML = stdoutHTML;
      current.stderrHTML = stderrHTML;
      current.outputCompleted = true;
    });
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
    const response = data.toString();
    //console.log(`stderr: ${response}`);
    current.stderr = current.stderr.concat(response);
    process.event.emit("stderr", response);
    clockIncrement(process);
  });
}
