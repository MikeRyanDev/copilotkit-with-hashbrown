import { z } from "zod";

export const structuredOutputSchema = z.object({
  response: z.string().describe("The response to show the user."),
  followUps: z
    .array(z.string())
    .describe("Optional follow-up questions the user could ask next.")
    .optional(),
});

export type StructuredOutput = z.infer<typeof structuredOutputSchema>;

export const structuredOutputJsonSchema = {
  title: "StructuredOutput",
  description: "Structured response schema for the CopilotKit agent.",
  type: "object",
  properties: {
    response: {
      type: "string",
      description: "The response to show the user.",
    },
    followUps: {
      type: "array",
      description: "Optional follow-up questions the user could ask next.",
      items: {
        type: "string",
      },
    },
  },
  required: ["response"],
};
