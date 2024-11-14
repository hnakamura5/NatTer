import { ShellSpecification } from "@/datatypes/ShellSpecification";
import { defaultRandomBoundaryDetector } from "@/datatypes/ShellUtils/BoundaryDetectorUtils";

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

export function extendCommandWithBoundaryDetectorByEcho(
  shellSpec: ShellSpecification,
  command: string
) {
  const boundaryDetector = defaultRandomBoundaryDetector(false, shellSpec);
  //console.log(`boundaryDetector: ${boundaryDetector} len: ${boundaryDetector.length}`);
  const needDelimiter =
    command.length > 0 && !command.trim().endsWith(shellSpec.delimiter);
  const delimiter = needDelimiter ? shellSpec.delimiter : "";
  const startEcho = startEchoCommand(shellSpec, boundaryDetector);
  const endEcho = endEchoCommand(shellSpec, boundaryDetector);
  const newCommand = `${startEcho}${delimiter} ${command}${delimiter} ${endEcho}`;
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
  console.log(`detectByEchoWithoutCommandItself first: ${first}`);
  if (first === -1) {
    return undefined;
  }
  const second = target.indexOf(
    boundaryDetector,
    first + boundaryDetector.length
  );
  console.log(`detectByEchoWithoutCommandItself second: ${second}`);
  if (second === -1) {
    return undefined;
  }
  const third = target.indexOf(
    boundaryDetector,
    second + boundaryDetector.length
  );
  console.log(`detectByEchoWithoutCommandItself third: ${third}`);
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
    exitStatus: target.slice(second + boundaryDetector.length, third),
  };
}

function skipCommandWithEchoItself(
  shellSpec: ShellSpecification,
  stdout: string,
  boundaryDetector: string
) {
  // There is a case the command itself is NOT contained in stdout.
  // The command is not dressed with control characters.
  const echo = endEchoCommand(shellSpec, boundaryDetector);
  const findEcho = stdout.indexOf(echo);
  console.log(`skipCommandWithEchoItself echo: ${echo}, findEcho: ${findEcho}`);
  if (findEcho === -1) {
    return stdout;
  }
  return stdout.slice(findEcho + echo.length);
}

export function detectCommandResponseAndExitCodeByEcho(
  shellSpec: ShellSpecification,
  stdout: string,
  boundaryDetector: string
) {
  console.log(`detectCommandResponseAndExitCodeByEcho stdout: ${stdout}`);
  console.log(
    `detectCommandResponseAndExitCodeByEcho end. (len: ${stdout.length})`
  );
  const target = skipCommandWithEchoItself(
    shellSpec,
    stdout,
    boundaryDetector
  );
  console.log(`skipCommandWithEchoItself target: ${target}`);
  if (target === undefined) {
    return undefined;
  }
  const result = detectByEchoWithoutCommandItself(boundaryDetector, target);
  console.log(
    `detectByEchoWithoutCommandItself result: ${result?.response}, ${result?.exitStatus}`
  );
  return result;
}
