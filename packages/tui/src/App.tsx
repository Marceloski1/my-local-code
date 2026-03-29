import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useAppStore } from './store/app-store.js';
import { Logo } from './components/Logo.js';
import { StatusBar } from './components/StatusBar.js';
import { CommandMenu } from './components/CommandMenu.js';
import { ModelSelector } from './components/ModelSelector.js';
import { SessionSelector } from './components/SessionSelector.js';
import { MessageBubble } from './components/MessageBubble.js';
import { ToolCall } from './components/ToolCall.js';
import { useChat } from './hooks/useChat.js';
import { useModels } from './hooks/useModels.js';
import { INK_COLORS } from './theme/colors.js';
import { AgentClient } from '@agent/sdk';

const client = new AgentClient();

type ModalType = 'none' | 'commands' | 'models' | 'sessions';

export function App() {
  const [input, setInput] = useState('');
  const [modalType, setModalType] = useState<ModalType>('none');
  const [commandSelectedIndex, setCommandSelectedIndex] = useState(0);

  const activeSessionId = useAppStore(state => state.activeSessionId);
  const setActiveSessionId = useAppStore(state => state.setSession);
  const activeModel = useAppStore(state => state.activeModel);
  const mode = useAppStore(state => state.mode);
  const setMode = useAppStore(state => state.setMode);

  const { messages, loading, isStreaming, currentAssistantMessage, sendMessage } =
    useChat(activeSessionId);
  const { models, selectModel } = useModels();

  // Mock data for now
  const [sessions] = useState([
    { id: '1', title: 'Session 1', updatedAt: new Date().toISOString() },
    { id: '2', title: 'Session 2', updatedAt: new Date().toISOString() },
  ]);

  useInput((inputChar, key) => {
    // Handle command menu navigation
    if (modalType === 'commands') {
      if (key.escape) {
        setModalType('none');
        setInput('');
        return;
      }

      if (key.upArrow) {
        setCommandSelectedIndex(prev => Math.max(0, prev - 1));
        return;
      }

      if (key.downArrow) {
        // Get filtered commands count
        const COMMANDS = [
          '/agents',
          '/connect',
          '/editor',
          '/exit',
          '/help',
          '/init',
          '/mcps',
          '/models',
          '/new',
          '/review',
        ];
        const filter = input.substring(1);
        const filteredCommands = COMMANDS.filter(cmd =>
          cmd.toLowerCase().includes(filter.toLowerCase())
        );
        setCommandSelectedIndex(prev => Math.min(filteredCommands.length - 1, prev + 1));
        return;
      }

      if (key.return) {
        // Execute selected command
        const COMMANDS = [
          '/agents',
          '/connect',
          '/editor',
          '/exit',
          '/help',
          '/init',
          '/mcps',
          '/models',
          '/new',
          '/review',
        ];
        const filter = input.substring(1);
        const filteredCommands = COMMANDS.filter(cmd =>
          cmd.toLowerCase().includes(filter.toLowerCase())
        );

        if (filteredCommands.length > 0) {
          const selectedCommand = filteredCommands[commandSelectedIndex];
          setInput(selectedCommand);
          setModalType('none');
          // Execute the command
          handleSubmit(selectedCommand);
        }
        return;
      }
      return;
    }

    // Handle other modals
    if (modalType === 'models' || modalType === 'sessions') {
      if (key.escape) {
        setModalType('none');
      }
      return;
    }

    // Global shortcuts
    if (key.ctrl && inputChar === 'p') {
      if (modalType === 'none') {
        setModalType('commands');
      } else {
        setModalType('none');
      }
      return;
    }

    if (key.tab) {
      // Toggle mode between plan and build
      setMode(mode === 'plan' ? 'build' : 'plan');
      return;
    }
  });

  const handleInputChange = (value: string) => {
    setInput(value);

    // Show command menu when typing /
    if (value.startsWith('/') && value.length > 0) {
      setModalType('commands');
      setCommandSelectedIndex(0); // Reset selection when filter changes
    } else if (modalType === 'commands') {
      setModalType('none');
    }
  };

  const handleSubmit = async (value: string) => {
    if (!value.trim()) return;

    // Handle commands
    if (value.startsWith('/')) {
      const command = value.toLowerCase();

      if (command === '/models') {
        setModalType('models');
        setInput('');
        return;
      }

      if (command === '/new') {
        // Create new session
        try {
          const session = await client.createSession('New conversation');
          setActiveSessionId(session.id);
          setInput('');
        } catch (e) {
          console.error('Failed to create session:', e);
        }
        return;
      }

      if (command.startsWith('/new ')) {
        // Create new session with title
        const title = value.substring(5).trim();
        try {
          const session = await client.createSession(title);
          setActiveSessionId(session.id);
          setInput('');
        } catch (e) {
          console.error('Failed to create session:', e);
        }
        return;
      }

      if (command === '/exit') {
        process.exit(0);
      }

      // TODO: Handle other commands
      setInput('');
      return;
    }

    // Send regular message
    if (!activeSessionId) {
      // Auto-create session if none exists
      try {
        const session = await client.createSession('New conversation');
        setActiveSessionId(session.id);
      } catch (e) {
        console.error('Failed to create session:', e);
        return;
      }
    }

    setInput('');
    await sendMessage(value);
  };

  const handleModelSelect = (modelName: string) => {
    selectModel(modelName);
    setModalType('none');
  };

  const handleSessionSelect = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setModalType('none');
  };

  const handleSessionDelete = async (sessionId: string) => {
    try {
      await client.deleteSession(sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }
    } catch (e) {
      console.error('Failed to delete session:', e);
    }
  };

  const handleSessionRename = async (sessionId: string, newTitle: string) => {
    // TODO: Implement rename in API
    console.log('Rename session:', sessionId, newTitle);
  };

  return (
    <Box flexDirection="column" height="100%">
      {/* Logo */}
      <Logo />

      {/* Main chat area */}
      <Box flexDirection="column" flexGrow={1} paddingX={2}>
        {/* Messages */}
        <Box flexDirection="column" flexGrow={1} overflow="hidden">
          {loading && <Text color={INK_COLORS.textSecondary}>Loading messages...</Text>}

          {!loading && messages.length === 0 && !isStreaming && (
            <Box flexDirection="column" justifyContent="center" alignItems="center" flexGrow={1}>
              <Text color={INK_COLORS.textSecondary}>Ask anything...</Text>
            </Box>
          )}

          {messages.slice(messages.length > 50 ? -50 : 0).map((msg, i) => (
            <Box key={msg.id || i} marginTop={i === 0 ? 0 : 1} flexDirection="column">
              {(msg.role === 'user' || msg.role === 'assistant') && (
                <MessageBubble role={msg.role} content={msg.content} />
              )}
              {msg.role === 'tool_call' && (
                <ToolCall type="call" toolName={msg.toolName} toolArgs={msg.toolArgs} />
              )}
              {msg.role === 'tool_result' && <ToolCall type="result" toolResult={msg.toolResult} />}
            </Box>
          ))}

          {isStreaming && currentAssistantMessage && (
            <Box marginTop={messages.length > 0 ? 1 : 0} flexDirection="column">
              <MessageBubble role="assistant" content={currentAssistantMessage} />
            </Box>
          )}

          {isStreaming && !currentAssistantMessage && (
            <Box marginTop={messages.length > 0 ? 1 : 0}>
              <Text color={INK_COLORS.warning}>Thinking...</Text>
            </Box>
          )}
        </Box>

        {/* Modals */}
        {modalType === 'commands' && (
          <Box marginTop={1} marginBottom={1}>
            <CommandMenu selectedIndex={commandSelectedIndex} filter={input.substring(1)} />
          </Box>
        )}

        {modalType === 'models' && (
          <Box marginTop={1} marginBottom={1}>
            <ModelSelector
              models={models.map(m => ({ name: m.name, provider: 'Ollama', pricing: 'Free' }))}
              selectedModel={activeModel || undefined}
              onSelect={handleModelSelect}
              onClose={() => setModalType('none')}
            />
          </Box>
        )}

        {modalType === 'sessions' && (
          <Box marginTop={1} marginBottom={1}>
            <SessionSelector
              sessions={sessions}
              activeSessionId={activeSessionId || undefined}
              onSelect={handleSessionSelect}
              onDelete={handleSessionDelete}
              onRename={handleSessionRename}
              onClose={() => setModalType('none')}
            />
          </Box>
        )}

        {/* Input box */}
        <Box marginTop={1} marginBottom={1} borderStyle="round" borderColor="#9B59B6" paddingX={1}>
          <Box flexDirection="column" width="100%">
            <Box>
              <Text color={INK_COLORS.textSecondary}>Ask anything... </Text>
              <TextInput
                value={input}
                onChange={handleInputChange}
                onSubmit={handleSubmit}
                placeholder='"Fix broken tests"'
              />
            </Box>
            <Box marginTop={1}>
              <Text color={mode === 'build' ? INK_COLORS.primary : INK_COLORS.warning}>
                {mode === 'plan' ? 'Plan' : 'Build'}
              </Text>
              <Text color={INK_COLORS.textSecondary}> {activeModel || 'No model selected'}</Text>
            </Box>
          </Box>
        </Box>

        {/* Hints */}
        <Box justifyContent="flex-end" marginBottom={1}>
          <Text color={INK_COLORS.textSecondary}>tab agents ctrl+p commands</Text>
        </Box>
      </Box>

      {/* Status bar */}
      <StatusBar
        directory="C:\.1\Visual Code\local-code:main"
        gitBranch="main"
        mcpStatus="1 MCP /status"
        version="1.2.25"
      />
    </Box>
  );
}
