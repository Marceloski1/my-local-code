import React from 'react';
import { Box, Text } from 'ink';
import { useAppStore } from '../store/app-store.js';
import { INK_COLORS } from '../theme/colors.js';

export function Header() {
  const mode = useAppStore(state => state.mode);
  const activeModel = useAppStore(state => state.activeModel);
  const serverConnected = useAppStore(state => state.serverConnected);

  return (
    <Box
      borderStyle="single"
      borderColor={INK_COLORS.border}
      paddingX={1}
      justifyContent="space-between"
    >
      <Box>
        <Text bold>Agent</Text>
        <Text color={INK_COLORS.textSecondary}> | </Text>
        <Text color={mode === 'plan' ? INK_COLORS.warning : INK_COLORS.primary}>Modo: {mode}</Text>
      </Box>
      <Box>
        <Text color={serverConnected ? INK_COLORS.success : INK_COLORS.error}>
          {serverConnected ? '● Online' : '○ Offline'}
        </Text>
        <Text color={INK_COLORS.textSecondary}> | </Text>
        <Text color={INK_COLORS.secondary}>{activeModel || 'Ninguno'}</Text>
      </Box>
    </Box>
  );
}
