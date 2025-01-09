import { z } from "zod";
import JSON5 from "json5";

// All the labels used in the application.
export const LabelsSchema = z.object({
  input: z.object({
    tooltip: z.object({
      run: z.string(),
      runBackground: z.string(),
      stop: z.string(),
    }),
  }),
  fileManager: z.object({
    header: z.object({
      tooltip: z.object({
        forward: z.string(),
        back: z.string(),
        linkToCurrent: z.string(),
        bookmark: z.string(),
        history: z.string(),
        search: z.string(),
      }),
    }),
    footer: z.object({
      tooltip: z.object({
        splitTile: z.string(),
      }),
    }),
    context: z.object({
      newFile: z.string(),
      newDirectory: z.string(),
      rename: z.string(),
      delete: z.string(),
      deletePermanently: z.string(),
      trash : z.string(),
      copy: z.string(),
      paste: z.string(),
      cut: z.string(),
      copyPath: z.string(),
      properties: z.string(),
    }),
  }),
});
export type Labels = z.infer<typeof LabelsSchema>;

export function parseLabels(json: string): Labels | undefined {
  try {
    return LabelsSchema.parse(JSON5.parse(json));
  } catch (e) {
    console.error("Failed to parse labels: ", e);
    return undefined;
  }
}
