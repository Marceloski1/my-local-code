import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { z } from 'zod';
import type { ToolSpec, ToolResult } from '@agent/shared';
import { detectShell } from '../lib/shell.js';

const BASH_TIMEOUT_MS = 30_000;
const BASH_MAX_OUTPUT = 50 * 1024; // 50KB

const bashSchema = z.object({
  command: z.string().describe('The command to execute'),
});

export const bashTool: ToolSpec = {
  name: 'bash',
  description: 'Execute a shell command. Timeout is 30 seconds. Output is limited to 50KB.',
  schema: bashSchema,
  requiresPermission: true,
  execute: async (params: unknown): Promise<ToolResult> => {
    try {
      const { command } = bashSchema.parse(params);
      const shellConfig = detectShell();

      return new Promise(resolve => {
        let stdout = '';
        let stderr = '';

        const proc = spawn(shellConfig.path, [...shellConfig.args, command], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, CHCP: '65001' }, // Force UTF-8 on Windows
        }) as ChildProcess;

        const timeout = setTimeout(() => {
          proc.kill();
          resolve({
            success: false,
            output: stdout,
            error: `Command timeout after ${BASH_TIMEOUT_MS / 1000}s`,
          });
        }, BASH_TIMEOUT_MS);

        proc.stdout?.on('data', (data: Buffer) => {
          stdout += data.toString('utf-8');
          if (stdout.length > BASH_MAX_OUTPUT) {
            stdout = stdout.slice(0, BASH_MAX_OUTPUT);
            proc.kill();
          }
        });

        proc.stderr?.on('data', (data: Buffer) => {
          stderr += data.toString('utf-8');
          if (stderr.length > BASH_MAX_OUTPUT) {
            stderr = stderr.slice(0, BASH_MAX_OUTPUT);
            proc.kill();
          }
        });

        proc.on('close', (code: number | null) => {
          clearTimeout(timeout);

          const output = stdout + (stderr ? `\n[stderr]\n${stderr}` : '');
          const truncated = stdout.length > BASH_MAX_OUTPUT || stderr.length > BASH_MAX_OUTPUT;

          resolve({
            success: code === 0,
            output: output + (truncated ? '\n\n[Output truncated - exceeded 50KB limit]' : ''),
            error: code !== 0 ? `Command exited with code ${code}` : undefined,
          });
        });

        proc.on('error', (error: Error) => {
          clearTimeout(timeout);
          resolve({
            success: false,
            output: '',
            error: error.message,
          });
        });
      });
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Failed to execute command',
      };
    }
  },
};
