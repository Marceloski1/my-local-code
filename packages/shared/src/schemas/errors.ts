import { z } from 'zod';

export const ErrorContextSchema = z
  .object({
    operation: z.string(),
    sessionId: z.string().optional(),
    toolName: z.string().optional(),
    modelName: z.string().optional(),
  })
  .passthrough();

export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  context: ErrorContextSchema.optional(),
  suggestion: z.string().optional(),
});

export type ErrorContext = z.infer<typeof ErrorContextSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
