import { readdirSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { z } from 'zod';
import type { ToolSpec, ToolResult } from '@agent/shared';

const LIST_FILES_DEFAULT_DEPTH = 3;
const LIST_FILES_MAX_DEPTH = 10;
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '__pycache__',
  '.next',
  '.venv',
]);

const listFilesSchema = z.object({
  path: z.string().describe('Path to the directory to list'),
  maxDepth: z.number().optional().describe('Maximum depth to traverse (default 3, max 10)'),
});

interface FileEntry {
  path: string;
  type: 'file' | 'directory';
  size?: number;
}

function listFilesRecursive(dirPath: string, currentDepth: number, maxDepth: number): FileEntry[] {
  const entries: FileEntry[] = [];

  if (currentDepth > maxDepth) {
    return entries;
  }

  try {
    const files = readdirSync(dirPath);

    for (const file of files) {
      if (EXCLUDED_DIRS.has(file)) {
        continue;
      }

      const fullPath = resolve(dirPath, file);
      const relativePath = relative(dirPath, fullPath);

      try {
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          entries.push({ path: relativePath, type: 'directory' });

          if (currentDepth < maxDepth) {
            const subEntries = listFilesRecursive(fullPath, currentDepth + 1, maxDepth);
            entries.push(
              ...subEntries.map(entry => ({
                ...entry,
                path: `${relativePath}/${entry.path}`,
              }))
            );
          }
        } else {
          entries.push({
            path: relativePath,
            type: 'file',
            size: stat.size,
          });
        }
      } catch {
        // Skip files we can't stat
      }
    }
  } catch (error) {
    throw error;
  }

  return entries;
}

export const listFilesTool: ToolSpec = {
  name: 'list_files',
  description:
    'List files in a directory recursively. Default depth is 3, maximum is 10. Excludes node_modules, .git, dist, build, __pycache__, .next, .venv.',
  schema: listFilesSchema,
  requiresPermission: false,
  execute: async (params: unknown): Promise<ToolResult> => {
    try {
      const { path, maxDepth } = listFilesSchema.parse(params);
      const fullPath = resolve(path);

      const depth = Math.min(maxDepth ?? LIST_FILES_DEFAULT_DEPTH, LIST_FILES_MAX_DEPTH);
      const entries = listFilesRecursive(fullPath, 0, depth);

      const output = entries
        .map(entry => {
          const prefix = entry.type === 'directory' ? '[DIR]  ' : '[FILE] ';
          const size = entry.size ? ` (${entry.size} bytes)` : '';
          return `${prefix}${entry.path}${size}`;
        })
        .join('\n');

      return {
        success: true,
        output: output || '(empty directory)',
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Failed to list files',
      };
    }
  },
};
