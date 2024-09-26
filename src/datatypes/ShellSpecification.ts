import { z } from "zod";

const CommandParserScopeSchema = z.object({
  opener: z.string(),
  closer: z.string(),
  escapable: z.boolean(),
  isString: z.boolean(),
  isRegionComment: z.boolean(),
});
type CommandParserScope = z.infer<typeof CommandParserScopeSchema>;

export const ShellSpecificationSchema = z.object({
  // Shell specification.
  name: z.string(),
  path: z.string(),

  // Command syntax specification.
  escapes: z.array(z.string()),
  scope: z.array(CommandParserScopeSchema),
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
  // Customize the command to enable the end detection.
  // Typically, echo some special string after the command.
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
  detectEndOfCommandResponse: z
    .function()
    .args(
      z.object({
        commandResponse: z.string(),
        endDetector: z.string(),
      })
    )
    .returns(z.boolean()),
});
export type ShellSpecification = z.infer<typeof ShellSpecificationSchema>;

// Judge if the command is closed.
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
  const scopeStack: CommandParserScope[] = [];
  let isInString = false;
  while (restCommand.length > 0) {
    // Skip escaped characters.
    const escape = shell.escapes.find((escape) =>
      restCommand.startsWith(escape)
    );
    if (escape) {
      restCommand = restCommand.slice(escape.length);
      continue;
    }
    // If the current is in a string, skip other scope effects.
    if (isInString) {
      let isMutated = false;
      for (const scope of shell.scope) {
        // If the string is closed, pop the scope.
        if (scope.isString && restCommand.startsWith(scope.closer)) {
          restCommand = restCommand.slice(scope.closer.length);
          scopeStack.pop();
          isInString = scopeStack.some((s) => s.isString);
          isMutated = true;
          break;
        }
      }
      if (isMutated) {
        continue;
      }
    }
    // If the line comment is found, skip to the next line.
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
    // If the line continuation is found, skip the newline.
    const lineContinuation = shell.lineContinuations.find((lineContinuation) =>
      restCommand.startsWith(lineContinuation)
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
    // Now parse the scope.
    for (const scope of shell.scope) {
      if (restCommand.startsWith(scope.opener)) {
        scopeStack.push(scope);
        restCommand = restCommand.slice(scope.opener.length);
        isInString = scopeStack.some((s) => s.isString);
        break;
      }
      if (restCommand.startsWith(scope.closer)) {
        if (scopeStack.length === 0) {
          return false;
        }
        restCommand = restCommand.slice(scope.closer.length);
        if (scopeStack[scopeStack.length - 1] !== scope) {
          // Pop the scope.
          scopeStack.pop();
          isInString = scopeStack.some((s) => s.isString);
        }
        // Note we allow closer for unopened scope here.
        // .e.g. crazy case syntax of bash uses unopened ')'.
        // TODO: but it may wrongly closes the '(' scope opened before case.
        break;
      }
    }
  }
  return scopeStack.length === 0;
}
