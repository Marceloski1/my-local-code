import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { z } from 'zod';
import type { ToolSpec, ToolResult } from '@agent/shared';

const writeFileSchema = z.object({
  path: z.string().describe('Path to the file to write'),
  content: z.string().describe('Content to write to the file'),
});

export const writeFileTool: ToolSpec = {
  name: 'write_file',
  description:
    'Write content to a file. Creates the file if it does not exist, or overwrites it if it does. Creates parent directories if needed.',
  schema: writeFileSchema,
  requiresPermission: true,
  execute: async (params: unknown): Promise<ToolResult> => {
    try {
      const { path, content } = writeFileSchema.parse(params);
      const fullPath = resolve(path);
      const dir = dirname(fullPath);

      // Create parent directories if they don't exist
      mkdirSync(dir, { recursive: true });

      writeFileSync(fullPath, content, 'utf-8');

      return {
        success: true,
        output: `File written successfully: ${fullPath}`,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Failed to write file',
      };
    }
  },
};
