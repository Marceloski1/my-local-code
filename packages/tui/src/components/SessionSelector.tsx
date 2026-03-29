import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { INK_COLORS } from '../theme/colors.js';

interface Session {
  id: string;
  title: string;
  updatedAt: string;
}

interface SessionSelectorProps {
  sessions: Session[];
  activeSessionId?: string;
  onSelect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onRename: (sessionId: string, newTitle: string) => void;
  onClose: () => void;
}

export function SessionSelector({
  sessions,
  activeSessionId,
  onSelect,
  onDelete,
  onRename,
  onClose,
}: SessionSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(true);

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (isSearchFocused) {
      if (key.downArrow || key.tab) {
        setIsSearchFocused(false);
        setSelectedIndex(0);
      }
      return;
    }

    if (key.upArrow) {
      if (selectedIndex === 0) {
        setIsSearchFocused(true);
      } else {
        setSelectedIndex(prev => Math.max(0, prev - 1));
      }
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(filteredSessions.length - 1, prev + 1));
    } else if (key.return && filteredSessions.length > 0) {
      onSelect(filteredSessions[selectedIndex].id);
      onClose();
    } else if (key.ctrl && input === 'd' && filteredSessions.length > 0) {
      onDelete(filteredSessions[selectedIndex].id);
    } else if (key.ctrl && input === 'r' && filteredSessions.length > 0) {
      // TODO: Implement rename functionality
      // For now, just close
      onClose();
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={INK_COLORS.border}
      padding={1}
      width="80%"
    >
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold>Sessions</Text>
        <Text color={INK_COLORS.textSecondary}>esc</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color={INK_COLORS.secondary}>S</Text>
        <Text>earch</Text>
        <Box marginLeft={1} flexGrow={1}>
          <TextInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder=""
            focus={isSearchFocused}
          />
        </Box>
      </Box>

      {filteredSessions.length === 0 ? (
        <Box marginY={2}>
          <Text color={INK_COLORS.textSecondary}>No results found</Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginBottom={1}>
          {filteredSessions.map((session, index) => {
            const isSelected = !isSearchFocused && index === selectedIndex;
            const isActive = session.id === activeSessionId;
            return (
              <Box key={session.id}>
                <Text
                  color={isSelected ? INK_COLORS.active : INK_COLORS.text}
                  backgroundColor={isSelected ? INK_COLORS.surface : undefined}
                >
                  {isActive ? '● ' : '  '}
                  {session.title}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}

      <Box marginTop={1} justifyContent="space-between" paddingX={1}>
        <Box>
          <Text color={INK_COLORS.textSecondary}>delete </Text>
          <Text color={INK_COLORS.textSecondary}>ctrl+d</Text>
        </Box>
        <Box>
          <Text color={INK_COLORS.textSecondary}>rename </Text>
          <Text color={INK_COLORS.textSecondary}>ctrl+r</Text>
        </Box>
      </Box>
    </Box>
  );
}
