import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { AgentClient } from '@agent/sdk';
import { useAppStore } from '../store/app-store.js';

const client = new AgentClient();

interface Session {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export function SessionsScreen() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const activeSessionId = useAppStore(state => state.activeSessionId);
  const setActiveSessionId = useAppStore(state => state.setSession);
  const setScreen = useAppStore(state => state.setScreen);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const list = await client.listSessions();
      setSessions(list);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const createNewSession = async () => {
    try {
      const session = await client.createSession('Nueva conversación'); //Hay que actualizar esto para que interprete el nombre
      setSessions(prev => [session, ...prev]);
      setActiveSessionId(session.id);
      setScreen('chat');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const selectSession = (session: Session) => {
    setActiveSessionId(session.id);
    setScreen('chat');
  };

  const deleteSession = async (id: string) => {
    try {
      await client.deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  useInput((input, key) => {
    if (loading) return;

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(sessions.length - 1, prev + 1));
    } else if (key.return && sessions.length > 0) {
      selectSession(sessions[selectedIndex]);
    } else if (input === 'n') {
      createNewSession();
    } else if (input === 'd' && sessions.length > 0) {
      deleteSession(sessions[selectedIndex].id);
    }
  });

  if (loading) {
    return (
      <Box>
        <Text color="gray">Cargando sesiones...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <Box marginTop={1}>
          <Text color="gray">Presiona R para reintentar</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Sesiones</Text>
        <Text color="gray"> (↑↓: navegar, Enter: abrir, N: nueva, D: eliminar)</Text>
      </Box>

      {sessions.length === 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="yellow">No hay sesiones</Text>
          <Box marginTop={1}>
            <Text color="gray">Presiona N para crear una nueva sesión</Text>
          </Box>
        </Box>
      )}

      {sessions.map((session, index) => {
        const isSelected = index === selectedIndex;
        const isActive = session.id === activeSessionId;

        return (
          <Box key={session.id} marginTop={index === 0 ? 0 : 1}>
            <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
              {isSelected ? '> ' : '  '}
              {isActive ? '★ ' : ''}
              {session.title}
            </Text>
            <Text color="gray"> ({formatDate(session.updatedAt)})</Text>
          </Box>
        );
      })}
    </Box>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays < 7) return `hace ${diffDays}d`;

  return date.toLocaleDateString();
}
