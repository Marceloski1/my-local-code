import React from 'react';
import { Box, Text } from 'ink';
import { useAppStore } from '../store/app-store.js';

export function TabBar() {
  const activeScreen = useAppStore(state => state.activeScreen);

  const tabs = [
    { id: 'models', label: 'Modelos' },
    { id: 'chat', label: 'Chat' },
    { id: 'sessions', label: 'Sesiones' },
  ] as const;

  return (
    <Box marginBottom={1}>
      {tabs.map((tab, idx) => {
        const isActive = activeScreen === tab.id;
        return (
          <Box key={tab.id} marginRight={2}>
            <Text color={isActive ? 'blue' : 'gray'} bold={isActive}>
              {idx + 1}. {tab.label}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
