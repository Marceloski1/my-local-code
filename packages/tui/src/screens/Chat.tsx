import React, { useState } from 'react';
import { Box, Text, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { useAppStore } from '../store/app-store.js';
import { useChat } from '../hooks/useChat.js';
import { MessageBubble } from '../components/MessageBubble.js';
import { ToolCall } from '../components/ToolCall.js';

export function ChatScreen() {
  const [input, setInput] = useState('');
  const activeSessionId = useAppStore(state => state.activeSessionId);
  const activeModel = useAppStore(state => state.activeModel);

  const {
    messages,
    loading,
    error,
    isStreaming,
    currentAssistantMessage,
    disconnected,
    sendMessage,
    resync,
  } = useChat(activeSessionId);

  const handleSubmit = async (value: string) => {
    if (!value.trim()) return;
    if (!activeSessionId) return;

    // If disconnected, resync instead of sending message
    if (disconnected) {
      await resync();
      return;
    }

    setInput('');
    await sendMessage(value);
  };

  // If no session, show message to create one
  if (!activeSessionId) {
    return (
      <Box flexDirection="column" flexGrow={1}>
        <Box
          flexGrow={1}
          flexDirection="column"
          borderStyle="round"
          borderColor="gray"
          paddingX={1}
          justifyContent="center"
          alignItems="center"
        >
          <Text color="yellow">No hay sesión activa</Text>
          <Box marginTop={1}>
            <Text color="gray">
              Ve a la pantalla de Sesiones (Tab 3) para crear una nueva sesión
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }

  // If no model selected
  if (!activeModel) {
    return (
      <Box flexDirection="column" flexGrow={1}>
        <Box
          flexGrow={1}
          flexDirection="column"
          borderStyle="round"
          borderColor="gray"
          paddingX={1}
          justifyContent="center"
          alignItems="center"
        >
          <Text color="yellow">No hay modelo activo</Text>
          <Box marginTop={1}>
            <Text color="gray">Ve a la pantalla de Modelos (Tab 1) para seleccionar un modelo</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Disconnection banner */}
      {disconnected && (
        <Box borderStyle="round" borderColor="yellow" paddingX={1} marginBottom={1}>
          <Text color="yellow">⚠️ Conexión perdida. Presiona Enter para recargar</Text>
        </Box>
      )}

      {/* Messages area - takes all available space */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="gray"
        paddingX={1}
        paddingY={1}
        flexGrow={1}
        overflow="hidden"
      >
        {loading && <Text color="gray">Cargando mensajes...</Text>}

        {error && <Text color="red">Error: {error}</Text>}

        {!loading && messages.length === 0 && !isStreaming && (
          <Text color="gray">No hay mensajes aún. Escribe algo abajo para comenzar...</Text>
        )}

        {/* Virtualize messages - only show last 50 when there are more than 50 */}
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

        {/* Show streaming message */}
        {isStreaming && currentAssistantMessage && (
          <Box marginTop={messages.length > 0 ? 1 : 0} flexDirection="column">
            <MessageBubble role="assistant" content={currentAssistantMessage} />
          </Box>
        )}

        {isStreaming && !currentAssistantMessage && (
          <Box marginTop={messages.length > 0 ? 1 : 0}>
            <Text color="gray">Pensando...</Text>
          </Box>
        )}
      </Box>

      {/* Input area - fixed at bottom */}
      <Box marginTop={1}>
        <Text bold color="cyan">
          {'> '}
        </Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder={disconnected ? 'Presiona Enter para reconectar...' : 'Escribe un mensaje...'}
        />
      </Box>
    </Box>
  );
}
