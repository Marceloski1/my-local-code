import React from 'react';
import { Box, useInput } from 'ink';
import { useAppStore } from './store/app-store.js';
import { Header } from './components/Header.js';
import { TabBar } from './components/TabBar.js';
import { ModelsScreen } from './screens/Models.js';
import { ChatScreen } from './screens/Chat.js';
import { SessionsScreen } from './screens/Sessions.js';

export function App() {
  const activeScreen = useAppStore(state => state.activeScreen);
  const setScreen = useAppStore(state => state.setScreen);
  const mode = useAppStore(state => state.mode);
  const setMode = useAppStore(state => state.setMode);

  useInput((input, key) => {
    if (key.tab) {
      if (activeScreen === 'models') setScreen('chat');
      else if (activeScreen === 'chat') setScreen('sessions');
      else setScreen('models');
    }

    // Ctrl+M to toggle mode
    if (key.ctrl && input === 'm') {
      setMode(mode === 'plan' ? 'build' : 'plan');
    }
  });

  return (
    <Box flexDirection="column" padding={1} width="100%">
      <Header />
      <Box marginTop={1}>
        <TabBar />
      </Box>

      <Box flexGrow={1} marginTop={1}>
        {activeScreen === 'models' && <ModelsScreen />}
        {activeScreen === 'chat' && <ChatScreen />}
        {activeScreen === 'sessions' && <SessionsScreen />}
      </Box>
    </Box>
  );
}
