import React, { memo } from 'react';
import { Box, Text } from 'ink';
import { INK_COLORS } from '../theme/colors.js';

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
        <Text bold color={INK_COLORS.warning}>
          🔧 Tool:{' '}
        </Text>
        <Text color={INK_COLORS.warning}>{toolName}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Box>
        <Text bold color={INK_COLORS.secondary}>
          ✓ Resultado:{' '}
        </Text>
        <Text color={INK_COLORS.textSecondary}>{toolResult?.substring(0, 100)}...</Text>
      </Box>
    </Box>
  );
});
