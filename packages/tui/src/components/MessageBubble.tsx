import React, { memo } from 'react';
import { Box, Text } from 'ink';
import { INK_COLORS } from '../theme/colors.js';
import { MarkdownRenderer } from './MarkdownRenderer.js';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

export const MessageBubble = memo(function MessageBubble({ role, content }: MessageBubbleProps) {
  if (role === 'user') {
    return (
      <Box>
        <Text bold color={INK_COLORS.secondary}>
          Tú:{' '}
        </Text>
        <Text wrap="wrap">{content}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold color={INK_COLORS.success}>
        Agente:
      </Text>
      <Box paddingLeft={2}>
        <MarkdownRenderer content={content} />
      </Box>
    </Box>
  );
});
