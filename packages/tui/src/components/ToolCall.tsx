import React, { memo } from 'react';
import { Box, Text } from 'ink';

interface ToolCallProps {
  toolName?: string;
  toolArgs?: string;
  toolResult?: string;
  type: 'call' | 'result';
}

export const ToolCall = memo(function ToolCall({
  toolName,
  toolArgs,
  toolResult,
  type,
}: ToolCallProps) {
  if (type === 'call') {
    return (
      <Box>
        <Text bold color="yellow">
          🔧 Tool:{' '}
        </Text>
        <Text color="yellow">{toolName}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text bold color="cyan">
        ✓ Resultado:{' '}
      </Text>
      <Text color="gray">{toolResult?.substring(0, 100)}...</Text>
    </Box>
  );
});
