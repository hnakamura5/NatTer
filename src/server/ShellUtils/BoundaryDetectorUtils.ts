import { ShellSpecification } from "@/datatypes/ShellSpecification";
import { ShellInteractKind } from "@/datatypes/ShellInteract";

function stringToList(s: string): string[] {
  return s.split("");
}

export function defaultRandomBoundaryDetector(
  usePty: boolean,
  shellSpec: ShellSpecification
): string {
  const EOT = String.fromCharCode(4);
  const ENQ = String.fromCharCode(5);
  const ACK = String.fromCharCode(6);
  let Additional = [EOT, ENQ, ACK];
  if (usePty) {
    // With PTY, control characters are displayed in escaped form.
    Additional = ["@", "%", "~"]; // TODO: temporary.
  }

  let set = shellSpec.boundaryDetectorCharset
    ? stringToList(shellSpec.boundaryDetectorCharset.boundary)
    : undefined;
  if (set === undefined) {
    set = Additional;
  }
  if (set.length < 3) {
    set = set.concat(Additional);
  }
  // TODO: randomize and make the result string length 4.
  let result = "";
  for (let i = 0; i < 4; i++) {
    const rand = Math.random();
    result = result.concat(set[Math.floor(rand * set.length)]);
  }
  return result;
}

export function getCommandWithDelimiterAfterOnDemand(
  shellSpec: ShellSpecification,
  command: string
): string {
  if (command.length > 0 && !command.trim().endsWith(shellSpec.delimiter)) {
    return `${command}${shellSpec.delimiter}`;
  }
  return command;
}

export function getCommandWithDelimiterSandwichOnDemand(
  shellSpec: ShellSpecification,
  command: string
): string {
  if (command.length > 0 && !command.trim().endsWith(shellSpec.delimiter)) {
    command = `${command}${shellSpec.delimiter}`;
  }
  if (command.length > 0 && !command.trim().startsWith(shellSpec.delimiter)) {
    command = `${shellSpec.delimiter}${command}`;
  }
  return command;
}

export function isCommandEchoBackToStdout(
  shellSpec: ShellSpecification,
  interact: ShellInteractKind
) {
  if (shellSpec.commandNotEchoBack === undefined) {
    return true;
  }
  if (interact === "terminal") {
    return true;
  }
  return !shellSpec.commandNotEchoBack;
}
