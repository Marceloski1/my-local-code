import type { ToolSpec } from '@agent/shared';
import { getShellInfo } from '../lib/shell.js';

export interface PromptContext {
  mode: 'plan' | 'build';
  tools: ToolSpec[];
}

/**
 * Build the system prompt for the agent
 */
export function buildSystemPrompt(context: PromptContext): string {
  const { mode, tools } = context;
  const shellInfo = getShellInfo();

  const toolDefinitions = tools
    .map(tool => {
      return `### ${tool.name}
${tool.description}`;
    })
    .join('\n\n');

  const modeInstructions =
    mode === 'plan'
      ? `You are in PLAN mode. Before executing any destructive operations (write_file, edit_file, bash), you MUST ask for permission. The user will respond with yes/no.`
      : `You are in BUILD mode. Execute all operations without asking for permission. Add a 500ms delay between destructive operations.`;

  return `You are an AI agent that can read files, write files, execute commands, and search for patterns in a codebase.

## System Information
- OS: ${shellInfo.os}
- Shell: ${shellInfo.shell}
- Use commands compatible with ${shellInfo.shell}

## Mode
${modeInstructions}

## Available Tools

${toolDefinitions}

## Instructions

1. Think step-by-step about what you need to do
2. Use tools to accomplish the task
3. If a tool fails, analyze the error and try a different approach
4. Always provide clear explanations of what you're doing
5. If you get stuck in a loop (same tool call repeated), stop and explain the issue

## Tool Call Format

When you need to use a tool, respond with:
\`\`\`
<tool_call>
{
  "name": "tool_name",
  "args": {
    "param1": "value1",
    "param2": "value2"
  }
}
</tool_call>
\`\`\`

The tool result will be provided in the next message.`;
}
