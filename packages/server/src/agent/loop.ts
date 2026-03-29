import { streamText } from 'ai';
import type { Message, ToolResult } from '@agent/shared';
import { DEFAULTS } from '@agent/shared';
import { getToolRegistry, executeTool, requiresPermission } from '../tools/registry.js';
import { buildSystemPrompt } from './prompt.js';
import { parseToolCalls, hasToolCalls } from './parser.js';
import {
  shouldCompact,
  getRecentMessages,
  getOldMessages,
  buildCompactionPrompt,
  historyTokens,
} from './context.js';
import { requiresPermissionInPlanMode } from './permissions.js';
import { logger } from '../index.js';
import { logToolCall, logError } from '../lib/logger.js';

export interface AgentConfig {
  model: any; // LanguageModel from AI SDK
  mode: 'plan' | 'build';
  maxIterations?: number;
  contextLength?: number;
}

export interface AgentResponse {
  type:
    | 'token'
    | 'tool_call'
    | 'tool_result'
    | 'permission_request'
    | 'done'
    | 'error'
    | 'compaction';
  data: unknown;
  sequence: number;
}

/**
 * Run the agent loop
 * Yields AgentResponse events as the agent thinks and acts
 */
export async function* runAgent(
  messages: Message[],
  userMessage: string,
  config: AgentConfig,
  onPermissionResponse?: () => Promise<boolean>
): AsyncGenerator<AgentResponse> {
  const toolRegistry = getToolRegistry();
  const tools = Array.from(toolRegistry.values());
  const maxIterations = config.maxIterations ?? DEFAULTS.MAX_ITERATIONS;
  const contextLength = config.contextLength ?? 4096;

  let sequence = 0;
  let iteration = 0;
  let lastToolCall: { name: string; args: unknown } | null = null;
  let lastToolCallCount = 0;

  // Add user message to history
  const history: Array<{ role: 'user' | 'assistant'; content: string }> = messages.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  history.push({
    role: 'user',
    content: userMessage,
  });

  // Check if compaction is needed
  if (shouldCompact(messages, contextLength)) {
    yield {
      type: 'compaction',
      data: 'Compacting context...',
      sequence: ++sequence,
    };

    const oldMessages = getOldMessages(messages);
    const recentMessages = getRecentMessages(messages);

    // In a real implementation, we would call the LLM to summarize
    // For now, we just keep recent messages
    history.splice(0, oldMessages.length);
  }

  // Build system prompt
  const systemPrompt = buildSystemPrompt({
    mode: config.mode,
    tools,
  });

  try {
    while (iteration < maxIterations) {
      iteration++;

      // Stream text from the model
      let fullResponse = '';

      const stream = streamText({
        model: config.model,
        system: systemPrompt,
        messages: history,
      });

      // Collect the response
      for await (const chunk of stream.textStream) {
        fullResponse += chunk;
        yield {
          type: 'token',
          data: chunk,
          sequence: ++sequence,
        };
      }

      // Check for tool calls in the response
      const toolCalls = parseToolCalls(fullResponse);

      if (toolCalls.length === 0) {
        // No tool calls, we're done
        yield {
          type: 'done',
          data: fullResponse,
          sequence: ++sequence,
        };
        break;
      }

      // Process first tool call
      const toolCall = toolCalls[0];

      // Check for loops
      if (
        lastToolCall &&
        lastToolCall.name === toolCall.name &&
        JSON.stringify(lastToolCall.args) === JSON.stringify(toolCall.args)
      ) {
        lastToolCallCount++;
        if (lastToolCallCount >= 3) {
          yield {
            type: 'error',
            data: 'Loop detected: same tool call repeated 3 times',
            sequence: ++sequence,
          };
          break;
        }
      } else {
        lastToolCall = toolCall;
        lastToolCallCount = 1;
      }

      // Check permissions in plan mode
      if (config.mode === 'plan' && requiresPermissionInPlanMode(toolCall.name)) {
        yield {
          type: 'permission_request',
          data: {
            toolName: toolCall.name,
            args: toolCall.args,
          },
          sequence: ++sequence,
        };

        // Wait for permission response
        if (onPermissionResponse) {
          const granted = await onPermissionResponse();
          if (!granted) {
            history.push({
              role: 'user',
              content: 'Permission denied for this operation.',
            });
            continue;
          }
        }
      }

      // Execute tool
      const result = await executeTool(toolCall.name, toolCall.args);

      // Log tool call
      logToolCall(logger, toolCall.name, toolCall.args, result);

      yield {
        type: 'tool_result',
        data: {
          toolName: toolCall.name,
          result,
        },
        sequence: ++sequence,
      };

      // Add tool result to history
      history.push({
        role: 'assistant',
        content: fullResponse,
      });

      history.push({
        role: 'user',
        content: `Tool result: ${result.output}${result.error ? `\nError: ${result.error}` : ''}`,
      });

      // Rate limiting in build mode
      if (config.mode === 'build' && requiresPermissionInPlanMode(toolCall.name)) {
        await new Promise(resolve => setTimeout(resolve, DEFAULTS.DESTRUCTIVE_TOOL_DELAY_MS));
      }
    }

    if (iteration >= maxIterations) {
      yield {
        type: 'error',
        data: `Max iterations (${maxIterations}) reached`,
        sequence: ++sequence,
      };
    }
  } catch (error) {
    // Log error
    if (error instanceof Error) {
      logError(logger, error, {
        operation: 'agent_loop',
        iteration,
      });
    }

    yield {
      type: 'error',
      data: error instanceof Error ? error.message : 'Unknown error',
      sequence: ++sequence,
    };
  }
}
