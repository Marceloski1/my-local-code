import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { z } from 'zod';
import type { ToolSpec, ToolResult } from '@agent/shared';

const SEARCH_MAX_RESULTS = 50;
const CONTEXT_LINES = 3;
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '__pycache__',
  '.next',
  '.venv',
]);

const searchFilesSchema = z.object({
  pattern: z.string().describe('Regex pattern to search for'),
  path: z.string().optional().describe('Path to search in (default: current directory)'),
  caseSensitive: z.boolean().optional().describe('Case sensitive search (default: false)'),
});

interface SearchResult {
  file: string;
  line: number;
  content: string;
  context: string[];
}

function searchFilesRecursive(
  dirPath: string,
  pattern: RegExp,
  results: SearchResult[],
  baseDir: string
): void {
  if (results.length >= SEARCH_MAX_RESULTS) {
    return;
  }

  try {
    const files = readdirSync(dirPath);

    for (const file of files) {
      if (EXCLUDED_DIRS.has(file)) {
        continue;
      }

      const fullPath = resolve(dirPath, file);

      try {
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          searchFilesRecursive(fullPath, pattern, results, baseDir);
        } else if (stat.isFile()) {
          try {
            const content = readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n');

            lines.forEach((line, index) => {
              if (results.length >= SEARCH_MAX_RESULTS) {
                return;
              }

              if (pattern.test(line)) {
                const relativePath = relative(baseDir, fullPath);
                const contextStart = Math.max(0, index - CONTEXT_LINES);
                const contextEnd = Math.min(lines.length, index + CONTEXT_LINES + 1);
                const context = lines.slice(contextStart, contextEnd);

                results.push({
                  file: relativePath,
                  line: index + 1,
                  content: line,
                  context,
                });
              }
            });
          } catch {
            // Skip files we can't read
          }
        }
      } catch {
        // Skip files we can't stat
      }
    }
  } catch {
    // Skip directories we can't read
  }
}

export const searchFilesTool: ToolSpec = {
  name: 'search_files',
  description:
    'Search for a pattern in files recursively. Returns up to 50 matches with context. Excludes node_modules, .git, dist, build, __pycache__, .next, .venv.',
  schema: searchFilesSchema,
  requiresPermission: false,
  execute: async (params: unknown): Promise<ToolResult> => {
    try {
      const { pattern, path, caseSensitive } = searchFilesSchema.parse(params);
      const searchPath = resolve(path ?? '.');

      try {
        const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
        const results: SearchResult[] = [];

        searchFilesRecursive(searchPath, regex, results, searchPath);

        if (results.length === 0) {
          return {
            success: true,
            output: 'No matches found',
          };
        }

        const output = results
          .map(result => {
            const contextStr = result.context
              .map((line, idx) => {
                const lineNum = result.line - CONTEXT_LINES + idx;
                const marker = idx === CONTEXT_LINES ? '> ' : '  ';
                return `${marker}${lineNum}: ${line}`;
              })
              .join('\n');

            return `${result.file}:\n${contextStr}`;
          })
          .join('\n\n');

        const truncated =
          results.length >= SEARCH_MAX_RESULTS ? '\n\n[Results truncated - max 50 matches]' : '';

        return {
          success: true,
          output: output + truncated,
        };
      } catch (error) {
        return {
          success: false,
          output: '',
          error: `Invalid regex pattern: ${error instanceof Error ? error.message : 'unknown error'}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Failed to search files',
      };
    }
  },
};
