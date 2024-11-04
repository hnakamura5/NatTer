import { z } from "zod";
import { PathKindSchema } from "./PathAbstraction";
import { shell } from "electron";

const ScopeSchema = z.object({
  opener: z.string(),
  closer: z.string(),
  isRegionComment: z.boolean().optional(),
});
type Scope = z.infer<typeof ScopeSchema>;

const StringScopeSchema = z.object({
  quote: z.string(),
  containsEscape: z.boolean().optional(),
  allowMultiline: z.boolean().optional(),
});
type StringScope = z.infer<typeof StringScopeSchema>;

export const ShellSpecificationSchema = z
  .object({
    // Shell specification.
    name: z.string(),
    pathKind: PathKindSchema,

    // Command syntax specification.
    escapes: z.array(z.string()),
    scope: z.array(ScopeSchema),
    stringScope: z.array(StringScopeSchema),
    lineComments: z.array(z.string()),
    lineContinuations: z.array(z.string()),

    // If defined, overrides the default command closed detection.
    // In that case, syntax specification is ignored.
    isCommandClosedOverride: z
      .function()
      .args(z.string())
      .returns(z.boolean())
      .optional(),

    // Command end detection.
    endDetectorCharset: z.array(z.string()).optional(),
    // Customize the command to enable the end detection.
    // Typically, echo some special string and exit code after the command.
    extendCommandWithEndDetector: z
      .function()
      .args(z.string())
      .returns(
        z.object({
          newCommand: z.string(),
          endDetector: z.string(),
        })
      ),
    // Detect the end of the command response.
    // The endDetector is the string returned by extendCommandWithEndDetector.
    detectEndOfCommandAndExitCode: z
      .function()
      .args(
        z.object({
          stdout: z.string(),
          endDetector: z.string(),
        })
      )
      .returns(z.string().optional()), // Exit code or undefined.

    // Check if the exit code is OK.
    isExitCodeOK: z.function().args(z.string()).returns(z.boolean()),

    // Current directory controls (optional functionality).
    directoryCommands: z
      .object({
        // If defined, the shell starts from the directory.
        defaultHome: z.string().optional(),
        // Get the current directory from the command response.
        getCurrent: z.function().args().returns(z.string()),
        // Change the current directory command.
        changeCurrent: z.function().args(z.string()).returns(z.string()),
        // Get the content of the directory.
        list: z.function().args(z.string()).returns(z.string()),
        // Get current user.
        getUser: z.function().args().returns(z.string()),
      })
      .optional(),
  })
  .refine((spec) => {
    // TODO: refine
    return true;
  });
export type ShellSpecification = z.infer<typeof ShellSpecificationSchema>;

function consumeString(
  shell: ShellSpecification,
  command: string,
  inString: StringScope
): string | undefined {
  let restCommand = command;
  while (restCommand.length > 0) {
    // Skip escaped characters.
    if (inString.containsEscape) {
      const escape = shell.escapes.find((escape) =>
        restCommand.startsWith(escape)
      );
      if (escape) {
        restCommand = restCommand.slice(escape.length + 1);
        continue;
      }
    }
    // Check if the string is closed.
    if (restCommand.startsWith(inString.quote)) {
      return restCommand.slice(1);
    }
    // Newline is only allowed in multiline string.
    if (restCommand.startsWith("\n")) {
      if (!inString.allowMultiline) {
        return undefined;
      }
    }
    restCommand = restCommand.slice(1);
  }
  return undefined;
}

function consumeRegionComment(
  shell: ShellSpecification,
  command: string,
  inScope: Scope
): string | undefined {
  let restCommand = command;
  while (restCommand.length > 0) {
    if (restCommand.startsWith(inScope.closer)) {
      return restCommand.slice(inScope.closer.length);
    }
    restCommand = restCommand.slice(1);
  }
  return undefined;
}

// Judge if the command is closed.
// TODO: return why the command is not closed.
export function isCommandClosed(
  shell: ShellSpecification,
  command: string
): boolean {
  if (shell.isCommandClosedOverride) {
    return shell.isCommandClosedOverride(command);
  }
  // Do not allow empty command.
  if (command.length === 0) {
    return false;
  }
  let restCommand = command;
  const scopeStack: Scope[] = [];
  while (restCommand.length > 0) {
    // Skip the string.
    {
      for (const scope of shell.stringScope) {
        // If the string is closed, pop the scope.
        if (restCommand.startsWith(scope.quote)) {
          const consumed = consumeString(shell, restCommand, scope);
          if (consumed === undefined) {
            // The string is not closed.
            return false;
          }
          restCommand = consumed;
        }
      }
    }
    // If the line comment is found, skip to the next line.
    {
      const lineComment = shell.lineComments.find((lineComment) =>
        restCommand.startsWith(lineComment)
      );
      if (lineComment) {
        const nextNewLine = restCommand.indexOf("\n");
        if (nextNewLine === -1) {
          break; // Skip the rest of the command.
        }
        restCommand = restCommand.slice(nextNewLine + 1);
      }
    }
    // If the line continuation is found, skip the newline.
    {
      const lineContinuation = shell.lineContinuations.find(
        (lineContinuation) => restCommand.startsWith(lineContinuation)
      );
      if (lineContinuation) {
        restCommand = restCommand.slice(lineContinuation.length);
        if (restCommand.length === 0) {
          return false; // The command cannot end with a line continuation.
        }
        if (restCommand.startsWith("\n")) {
          restCommand = restCommand.slice(lineContinuation.length + 1);
          continue;
        }
      }
    }
    // Now parse the scope.
    {
      let Mutated = false;
      for (const scope of shell.scope) {
        if (restCommand.startsWith(scope.opener)) {
          // Skip the region comment directly.
          if (scope.isRegionComment) {
            const consumed = consumeRegionComment(shell, restCommand, scope);
            if (consumed === undefined) {
              // The region comment is not closed.
              return false;
            }
            restCommand = consumed;
            break;
          }
          scopeStack.push(scope);
          restCommand = restCommand.slice(scope.opener.length);
          Mutated = true;
          break;
        }
        if (restCommand.startsWith(scope.closer)) {
          if (scopeStack.length === 0) {
            return false;
          }
          restCommand = restCommand.slice(scope.closer.length);
          Mutated = true;
          if (scopeStack[scopeStack.length - 1] !== scope) {
            // Pop the scope.
            scopeStack.pop();
          }
          // Note we allow closer for unopened scope here.
          // .e.g. crazy case syntax of bash uses unopened ')'.
          // TODO: but it may wrongly closes the '(' scope opened before case.
          break;
        }
      }
      if (!Mutated) {
        restCommand = restCommand.slice(1);
      }
    }
  }
  // Check all the scopes are closed.
  return scopeStack.length === 0;
}

function defaultRandomEndDetector(
  shellSpec: ShellSpecification
): string {
  const EOT = String.fromCharCode(4);
  const ENQ = String.fromCharCode(5);
  const ACK = String.fromCharCode(6);

  let set = shellSpec.endDetectorCharset;
  if (set === undefined) {
    set = [EOT, ENQ, ACK];
  }
  if (set.length < 3) {
    set = set.concat([EOT, ENQ, ACK]);
  }
  // TODO: randomize and make the result string length 4.
  let result = "";
  for (let i = 0; i < 4; i++) {
    const rand = Math.random();
    result = result.concat(set[Math.floor(rand * set.length)]);
  }
  return result;
}

export function extendCommandWithEndDetectorByEcho(
  shellSpec: ShellSpecification,
  command: string
) {
  const endDetector = defaultRandomEndDetector(shellSpec);
  return {
    // Sandwich the exit status with the end detector.
    newCommand: `${command}; echo "${endDetector}$?${endDetector}"`,
    endDetector: endDetector,
  };
}

export function detectEndOfCommandAndExitCodeByEcho(
  stdout: string,
  endDetector: string
) {
  const first = stdout.indexOf(endDetector);
  if (first === -1) {
    return undefined;
  }
  const second = stdout.indexOf(endDetector, first + endDetector.length);
  if (second === -1) {
    return undefined;
  }
  // Here, first and second are by echo command.
  const last = stdout.lastIndexOf(endDetector);
  if (last === -1) {
    return undefined;
  }
  const lastButOne = stdout.lastIndexOf(endDetector, last - 1);
  if (lastButOne !== -1 && lastButOne !== second && lastButOne !== first) {
    // Extract the exit status until the end detector.
    return stdout.slice(lastButOne + endDetector.length, last);
  }
  return undefined;
}
