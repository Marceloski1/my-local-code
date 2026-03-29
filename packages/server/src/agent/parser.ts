import { z } from 'zod';

const TOOL_CALL_REGEX = /<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/g;

export interface ParsedToolCall {
  name: string;
  args: Record<string, unknown>;
}

/**
 * Parse tool calls from text using regex + Zod validation
 * Returns array of tool calls found, or empty array if none found
 */
export function parseToolCalls(text: string): ParsedToolCall[] {
  const toolCalls: ParsedToolCall[] = [];
  let match;

  while ((match = TOOL_CALL_REGEX.exec(text)) !== null) {
    try {
      const jsonStr = match[1];
      const parsed = JSON.parse(jsonStr);

      // Validate structure
      const schema = z.object({
        name: z.string(),
        args: z.record(z.unknown()),
      });

      const validated = schema.parse(parsed);
      toolCalls.push(validated);
    } catch {
      // Skip invalid tool calls
    }
  }

  return toolCalls;
}

/**
 * Check if text contains any tool calls
 */
export function hasToolCalls(text: string): boolean {
  return TOOL_CALL_REGEX.test(text);
}

/**
 * Extract the first tool call from text
 */
export function extractFirstToolCall(text: string): ParsedToolCall | null {
  const calls = parseToolCalls(text);
  return calls.length > 0 ? calls[0] : null;
}
