import { z } from 'zod';
import type { ToolSpec, ToolResult } from '@agent/shared';
import { readFileTool } from './read-file.js';
import { writeFileTool } from './write-file.js';
import { editFileTool } from './edit-file.js';
import { bashTool } from './bash.js';
import { listFilesTool } from './list-files.js';
import { searchFilesTool } from './search-files.js';
import { logger } from '../index.js';
import { logError } from '../lib/logger.js';

// Internal tool specs
const toolSpecs: Map<string, ToolSpec> = new Map([
  [readFileTool.name, readFileTool],
  [writeFileTool.name, writeFileTool],
  [editFileTool.name, editFileTool],
  [bashTool.name, bashTool],
  [listFilesTool.name, listFilesTool],
  [searchFilesTool.name, searchFilesTool],
]);

/**
 * Get all tools in internal format
 */
export function getToolRegistry(): Map<string, ToolSpec> {
  return toolSpecs;
}

/**
 * Get all tools in Vercel AI SDK format for streamText()
 * Returns tools as { name: { description, parameters } }
 */
export function getVercelTools(): Record<string, { description: string; parameters: z.ZodSchema }> {
  const vercelTools: Record<string, { description: string; parameters: z.ZodSchema }> = {};

  for (const [name, spec] of toolSpecs) {
    vercelTools[name] = {
      description: spec.description,
      parameters: spec.schema,
    };
  }

  return vercelTools;
}

/**
 * Execute a tool by name
 */
export async function executeTool(name: string, params: unknown): Promise<ToolResult> {
  const spec = toolSpecs.get(name);
  if (!spec) {
    return {
      success: false,
      output: '',
      error: `Tool not found: ${name}`,
    };
  }

  try {
    // Validate params with Zod schema
    const validatedParams = spec.schema.parse(params);
    const result = await spec.execute(validatedParams);

    // If tool execution failed, log the error
    if (!result.success && result.error) {
      logger.error(
        {
          toolName: name,
          params: validatedParams,
          error: result.error,
        },
        'Tool execution failed'
      );
    }

    return result;
  } catch (error) {
    // Log validation or execution errors
    if (error instanceof Error) {
      logError(logger, error, {
        operation: 'tool_execution',
        toolName: name,
        params,
      });
    }

    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}

/**
 * Get tool definitions for system prompt (textual fallback)
 */
export function getToolDefinitions(): Array<{
  name: string;
  description: string;
  schema: unknown;
}> {
  return Array.from(toolSpecs.values()).map(spec => ({
    name: spec.name,
    description: spec.description,
    schema: spec.schema,
  }));
}

/**
 * Check if a tool requires permission in plan mode
 */
export function requiresPermission(toolName: string): boolean {
  const spec = toolSpecs.get(toolName);
  return spec?.requiresPermission ?? false;
}
