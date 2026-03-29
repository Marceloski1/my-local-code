import React from 'react';
import { Box, Text } from 'ink';
import { INK_COLORS } from '../theme/colors.js';

interface StatusBarProps {
  directory: string;
  gitBranch: string;
  mcpStatus: string;
  version: string;
}

export function StatusBar({ directory, gitBranch, mcpStatus, version }: StatusBarProps) {
  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Box>
        <Text color={INK_COLORS.textSecondary}>{directory}</Text>
        <Text color={INK_COLORS.textSecondary}> </Text>
        <Text color={INK_COLORS.success}>⎇ {gitBranch}</Text>
        <Text color={INK_COLORS.textSecondary}> </Text>
        <Text color={INK_COLORS.warning}>{mcpStatus}</Text>
      </Box>
      <Text color={INK_COLORS.textSecondary}>{version}</Text>
    </Box>
  );
}
