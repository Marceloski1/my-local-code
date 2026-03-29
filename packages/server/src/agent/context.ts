import type { Message } from '@agent/shared';
import { DEFAULTS } from '@agent/shared';

/**
 * Estimate token count using a simple heuristic: chars / 4
 * This is a rough approximation for English text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate total tokens in a message
 */
export function messageTokens(message: Message): number {
  const content = message.content || '';
  const toolArgs = message.toolArgs || '';
  const toolResult = message.toolResult || '';
  return estimateTokens(content + toolArgs + toolResult);
}

/**
 * Calculate total tokens in message history
 */
export function historyTokens(messages: Message[]): number {
  return messages.reduce((total, msg) => total + messageTokens(msg), 0);
}

/**
 * Check if compaction is needed
 * Returns true if tokens exceed threshold
 */
export function shouldCompact(messages: Message[], contextLength: number): boolean {
  const tokens = historyTokens(messages);
  const threshold = contextLength * DEFAULTS.CONTEXT_COMPACTION_THRESHOLD;
  return tokens > threshold;
}

/**
 * Get messages to keep (recent messages that should not be compacted)
 */
export function getRecentMessages(messages: Message[], keepCount: number = 10): Message[] {
  return messages.slice(Math.max(0, messages.length - keepCount));
}

/**
 * Get messages to compact (older messages)
 */
export function getOldMessages(messages: Message[], keepCount: number = 10): Message[] {
  return messages.slice(0, Math.max(0, messages.length - keepCount));
}

/**
 * Build a summary prompt for compacting old messages
 */
export function buildCompactionPrompt(oldMessages: Message[]): string {
  const messagesSummary = oldMessages
    .map(msg => {
      if (msg.role === 'tool_call') {
        return `Tool call: ${msg.toolName}(${msg.toolArgs})`;
      }
      if (msg.role === 'tool_result') {
        return `Tool result: ${msg.toolResult?.slice(0, 100)}...`;
      }
      return `${msg.role}: ${msg.content.slice(0, 100)}...`;
    })
    .join('\n');

  return `Summarize the following conversation history, preserving:
1. Each file that was read, created, or modified (include full paths)
2. Each command executed and its result
3. Each error found and how it was resolved
4. The decisions made and their justification
5. The current state of the task

Conversation:
${messagesSummary}

Provide a concise summary that captures the essential information.`;
}
