interface CommandParserScope {
  opener: string;
  closer: string;
  escapable: boolean;
  isString: boolean;
  isRegionComment: boolean;
}

export class ShellSpecification {
  constructor(
    public escapes: string[],
    public scope: CommandParserScope[],
    public lineComments: string[],
    public lineContinuations: string[],
    public extendCommandWithEndDetector:(command: string) => string,
    public detectEndOfCommandResponse:(response: string) => boolean
  ) {}

  // Judge if the command is closed.
  isCommandClosed(command: string): boolean {
    let restCommand = command;
    const scopeStack: CommandParserScope[] = [];
    while (restCommand.length > 0) {
      // Skip escaped characters.
      const escape = this.escapes.find((escape) =>
        restCommand.startsWith(escape)
      );
      if (escape) {
        restCommand = restCommand.slice(escape.length);
        continue;
      }
      // If the line comment is found, skip to the next line.
      const lineComment = this.lineComments.find((lineComment) =>
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
      const lineContinuation = this.lineContinuations.find((lineContinuation) =>
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
      for (const scope of this.scope) {
        if (restCommand.startsWith(scope.opener)) {
          scopeStack.push(scope);
          restCommand = restCommand.slice(scope.opener.length);
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
          }
          // Note we allow closer for unopened scope here.
          // .e.g. case of bash uses unopened ')'.
          // TODO: it wrongly closes the '(' scope opened before case.
          break;
        }
      }
    }
    return scopeStack.length === 0;
  }
}
