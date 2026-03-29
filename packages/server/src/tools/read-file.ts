import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { ToolSpec, ToolResult } from '@agent/shared';

const READ_FILE_MAX_SIZE = 100 * 1024; // 100KB

const readFileSchema = z.object({
  path: z.string().describe('Path to the file to read'),
});

export const readFileTool: ToolSpec = {
  name: 'read_file',
  description: 'Read the contents of a file. Files larger than 100KB will be truncated.',
  schema: readFileSchema,
  requiresPermission: false,
  execute: async (params: unknown): Promise<ToolResult> => {
    try {
      const { path } = readFileSchema.parse(params);
      const fullPath = resolve(path);

      const content = readFileSync(fullPath, 'utf-8');

      if (content.length > READ_FILE_MAX_SIZE) {
        return {
          success: true,
          output:
            content.slice(0, READ_FILE_MAX_SIZE) + '\n\n[File truncated - exceeded 100KB limit]',
        };
      }

      return {
        success: true,
        output: content,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Failed to read file',
      };
    }
  },
};
