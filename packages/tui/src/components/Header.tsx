import React from 'react';
import { Box, Text } from 'ink';
import { useAppStore } from '../store/app-store.js';

export function Header() {
  const mode = useAppStore(state => state.mode);
  const activeModel = useAppStore(state => state.activeModel);
  const serverConnected = useAppStore(state => state.serverConnected);

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1} justifyContent="space-between">
      <Box>
        <Text bold>Agent</Text>
        <Text color="gray"> | </Text>
        <Text color={mode === 'plan' ? 'yellow' : 'red'}>Modo: {mode}</Text>
      </Box>
      <Box>
        <Text color={serverConnected ? 'green' : 'red'}>
          {serverConnected ? '● Online' : '○ Offline'}
        </Text>
        <Text color="gray"> | </Text>
        <Text color="cyan">{activeModel || 'Ninguno'}</Text>
      </Box>
    </Box>
  );
}
