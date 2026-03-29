import { z } from 'zod';

// Error schemas
export { ErrorContextSchema, ErrorResponseSchema } from './schemas/errors.js';
export type { ErrorContext, ErrorResponse } from './schemas/errors.js';

// Roles
export const ROLES = ['user', 'assistant', 'tool_call', 'tool_result', 'system'] as const;
export type Role = (typeof ROLES)[number];

// Modes
export const MODES = ['plan', 'build'] as const;
export type Mode = (typeof MODES)[number];

// Basic Message
export const MessageSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  role: z.enum(ROLES),
  content: z.string(),
  toolName: z.string().optional(),
  toolArgs: z.string().optional(),
  toolResult: z.string().optional(),
  sequence: z.number(),
  createdAt: z.string(),
});

export type Message = z.infer<typeof MessageSchema>;

// Tool Result
export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

// Tool Spec (internal format)
export interface ToolSpec {
  name: string;
  description: string;
  schema: z.ZodSchema;
  requiresPermission: boolean;
  execute: (params: unknown) => Promise<ToolResult>;
}

// Defaults
export const DEFAULTS = {
  MAX_ITERATIONS: 25,
  CONTEXT_COMPACTION_THRESHOLD: 0.8,
  TOOL_TIMEOUT_MS: 30_000,
  OLLAMA_TIMEOUT_MS: 120_000,
  PERMISSION_TIMEOUT_MS: 300_000,
  LIST_FILES_DEFAULT_DEPTH: 3,
  LIST_FILES_MAX_DEPTH: 10,
  READ_FILE_MAX_SIZE: 100 * 1024,
  BASH_MAX_OUTPUT: 50 * 1024,
  DESTRUCTIVE_TOOL_DELAY_MS: 500,
  STREAMING_THROTTLE_MS: 50,
};
