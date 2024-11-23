import { z } from "zod";
import { PathKindSchema } from "@/datatypes/PathAbstraction";
import { ShellInteractKindSchema } from "@/datatypes/ShellInteract";

const ScopeSchema = z.object({
  opener: z.string(),
  closer: z.string(),
  isRegionComment: z.boolean().optional(),
});
export type Scope = z.infer<typeof ScopeSchema>;

const StringScopeSchema = z.object({
  quote: z.string(),
  containsEscape: z.boolean().optional(),
  allowMultiline: z.boolean().optional(),
});
export type StringScope = z.infer<typeof StringScopeSchema>;

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
    delimiter: z.string(),
    exitCodeVariable: z.string(),
    // For some shell, quotation itself lives in string. e.g. cmd.
    quoteLivesInString: z.boolean().optional(),

    // Whether the specified interaction is supported.
    isInteractionSupported: z
      .function()
      .args(ShellInteractKindSchema)
      .returns(z.boolean()),

    // The command is not echo back to stdout unless tty. e.g. bash
    commandNotEchoBack: z
      .function()
      .args(ShellInteractKindSchema)
      .returns(z.boolean())
      .optional(),

    // If defined, overrides the default command closed detection.
    // In that case, syntax specification is ignored.
    isCommandClosedOverride: z
      .function()
      .args(z.string())
      .returns(z.boolean())
      .optional(),

    // Command end detection.
    boundaryDetectorCharset: z.array(z.string()).optional(),
    // Customize the command to enable the end detection.
    // Typically, echo some special string and exit code after the command.
    extendCommandWithBoundaryDetector: z
      .function()
      .args(z.string())
      .returns(
        z.object({
          newCommand: z.string(),
          boundaryDetector: z.string(),
        })
      ),
    // Detect the end of the command response.
    // The boundaryDetector is the string returned by extendCommandWithBoundaryDetector.
    detectResponseAndExitCode: z
      .function()
      .args(
        z.object({
          interact: ShellInteractKindSchema,
          stdout: z.string(),
          boundaryDetector: z.string(),
        })
      )
      .returns(
        z
          .object({
            response: z.string(),
            exitStatus: z.string(),
          })
          .optional()
      ), // Exit code or undefined.

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

    // Prompt control (optional functionality for terminal).
    promptCommands: z
      .object({
        // Get the prompt from the command response.
        get: z.function().args().returns(z.string()),
        // Change the prompt command.
        set: z.function().args(z.string()).returns(z.string()),
      })
      .optional(),
  })
  .refine((spec) => {
    // TODO: refine
    return true;
  });
export type ShellSpecification = z.infer<typeof ShellSpecificationSchema>;
