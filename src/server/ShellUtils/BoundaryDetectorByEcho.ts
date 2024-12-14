import { ShellInteractKind } from "@/datatypes/ShellInteract";
import { ShellSpecification } from "@/datatypes/ShellSpecification";
import {
  defaultRandomBoundaryDetector,
  isCommandEchoBackToStdout,
} from "@/server/ShellUtils/BoundaryDetectorUtils";
import { detectCommandResponseAndExitCodeFunctionType } from "@/server/ShellUtils/ExecuteUtils";
import { AnsiUp } from "@/datatypes/ansiUpCustom";
import stripAnsi from "strip-ansi";

import * as log from "electron-log/main";

// Implement detection algorithm using echo command.
// This is suitable for non-terminal shells.

function startEchoCommand(
  shellSpec: ShellSpecification,
  boundaryDetector: string
) {
  const quote = shellSpec.quoteLivesInString ? "" : '"';
  return `echo ${quote}${boundaryDetector}${quote}`;
}

function endEchoCommand(
  shellSpec: ShellSpecification,
  boundaryDetector: string
) {
  const quote = shellSpec.quoteLivesInString ? "" : '"';
  return `echo ${quote}${boundaryDetector}${shellSpec.exitCodeVariable}${boundaryDetector}${quote}`;
}

function lastNonEmptyIsDelimiter(command: Buffer, delimiter: string) {
  const lastDelimiter = command.lastIndexOf(delimiter);
  if (lastDelimiter === -1) {
    return false;
  }
  for (let i = lastDelimiter + delimiter.length; i < command.length; i++) {
    // If there is a non-whitespace character after the last delimiter.
    if (!command[i].toString().match(/\s/)) {
      return false;
    }
  }
}

export function extendCommandWithBoundaryDetectorByEcho(
  shellSpec: ShellSpecification,
  command: string
) {
  const boundaryDetector = defaultRandomBoundaryDetector(false, shellSpec);
  const needDelimiter =
    command.length > 0 && !command.trim().endsWith(shellSpec.delimiter);
  const delimiter = needDelimiter ? shellSpec.delimiter : "";
  const startEcho = startEchoCommand(shellSpec, boundaryDetector);
  const endEcho = endEchoCommand(shellSpec, boundaryDetector);
  const newCommand = `${startEcho}${delimiter} ${command} ${delimiter}${endEcho}`;
  // const newCommand = Buffer.concat([
  //   Buffer.from(startEcho + delimiter + " "),
  //   command,
  //   Buffer.from(delimiter + " " + endEcho),
  // ]);
  return {
    // Sandwich the exit status with the end detector.
    newCommand: newCommand,
    boundaryDetector: boundaryDetector,
  };
}

function detectByEchoWithoutCommandItself(
  boundaryDetector: string,
  target: string
) {
  const first = target.indexOf(boundaryDetector);
  log.debug(`detectByEchoWithoutCommandItself first: ${first}`);
  if (first === -1) {
    return undefined;
  }
  const second = target.indexOf(
    boundaryDetector,
    first + boundaryDetector.length
  );
  log.debug(`detectByEchoWithoutCommandItself second: ${second}`);
  if (second === -1) {
    return undefined;
  }
  const third = target.indexOf(
    boundaryDetector,
    second + boundaryDetector.length
  );
  log.debug(`detectByEchoWithoutCommandItself third: ${third}`);
  if (third === -1) {
    return undefined;
  }
  // Not enough boundary detectors.
  if (first === second || second === third) {
    return undefined;
  }
  // Extract the exit status until the end detector.
  return {
    response: target.slice(first + boundaryDetector.length, second),
    exitStatus: stripAnsi(
      target.slice(second + boundaryDetector.length, third)
    ),
  };
}

function skipCommandWithEchoItself(
  shellSpec: ShellSpecification,
  stdout: string,
  boundaryDetector: string
) {
  for (let i = 0; i < 3; i++) {
    const index = stdout.indexOf(boundaryDetector);
    if (index === -1) {
      return undefined;
    }
    stdout = stdout.slice(index + boundaryDetector.length);
  }
  return stdout.slice(1); // Skip the last quote.
}

export const detectCommandResponseAndExitCodeByEcho: detectCommandResponseAndExitCodeFunctionType =
  (
    shellSpec: ShellSpecification,
    interact: ShellInteractKind,
    stdout: string,
    boundaryDetector: string
  ) => {
    log.debug(`detectCommandResponseAndExitCodeByEcho stdout: ${stdout}`);
    log.debug(
      `detectCommandResponseAndExitCodeByEcho end. (len: ${stdout.length})`
    );
    let target: string | undefined = stdout;
    if (isCommandEchoBackToStdout(shellSpec, interact)) {
      target = skipCommandWithEchoItself(shellSpec, stdout, boundaryDetector);
    }
    log.debug(`skipCommandWithEchoItself target: ${target}`);
    if (target === undefined) {
      return undefined;
    }
    const result = detectByEchoWithoutCommandItself(boundaryDetector, target);
    log.debug(
      `detectByEchoWithoutCommandItself result: ${result?.response}, ${result?.exitStatus}`
    );
    return result;
  };
