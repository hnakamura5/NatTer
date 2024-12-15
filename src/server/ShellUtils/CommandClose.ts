import {
  ShellSpecification,
  Scope,
  StringScope,
} from "@/datatypes/ShellSpecification";

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
