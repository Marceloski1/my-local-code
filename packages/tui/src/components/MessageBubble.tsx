import React, { memo } from 'react';
import { Box, Text } from 'ink';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

export const MessageBubble = memo(function MessageBubble({ role, content }: MessageBubbleProps) {
  if (role === 'user') {
    return (
      <Box>
        <Text bold color="blue">
          Tú:{' '}
        </Text>
        <Text>{content}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text bold color="green">
        Agente:{' '}
      </Text>
      <Text>{content}</Text>
    </Box>
  );
});
