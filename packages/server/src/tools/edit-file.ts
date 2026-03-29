import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { ToolSpec, ToolResult } from '@agent/shared';

const editFileSchema = z.object({
  path: z.string().describe('Path to the file to edit'),
  old_str: z.string().describe('The exact string to find and replace (first occurrence only)'),
  new_str: z.string().describe('The string to replace it with'),
});

export const editFileTool: ToolSpec = {
  name: 'edit_file',
  description: 'Replace the first occurrence of a string in a file with new content.',
  schema: editFileSchema,
  requiresPermission: true,
  execute: async (params: unknown): Promise<ToolResult> => {
    try {
      const { path, old_str, new_str } = editFileSchema.parse(params);
      const fullPath = resolve(path);

      const content = readFileSync(fullPath, 'utf-8');

      if (!content.includes(old_str)) {
        return {
          success: false,
          output: '',
          error: `String not found in file: ${old_str}`,
        };
      }

      const newContent = content.replace(old_str, new_str);
      writeFileSync(fullPath, newContent, 'utf-8');

      return {
        success: true,
        output: `File edited successfully: ${fullPath}`,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Failed to edit file',
      };
    }
  },
};
