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

function groupSessionsByDate(sessions: Session[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { [key: string]: Session[] } = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    'This Month': [],
    Older: [],
  };

  sessions.forEach(session => {
    const sessionDate = new Date(session.updatedAt);
    const sessionDay = new Date(
      sessionDate.getFullYear(),
      sessionDate.getMonth(),
      sessionDate.getDate()
    );

    if (sessionDay.getTime() === today.getTime()) {
      groups.Today.push(session);
    } else if (sessionDay.getTime() === yesterday.getTime()) {
      groups.Yesterday.push(session);
    } else if (sessionDay.getTime() >= today.getTime() - 7 * 24 * 60 * 60 * 1000) {
      groups['This Week'].push(session);
    } else if (
      sessionDate.getMonth() === now.getMonth() &&
      sessionDate.getFullYear() === now.getFullYear()
    ) {
      groups['This Month'].push(session);
    } else {
      groups.Older.push(session);
    }
  });

  return groups;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
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

  const groupedSessions = groupSessionsByDate(filteredSessions);

  // Flatten sessions for navigation
  const flatSessions: Session[] = [];
  Object.entries(groupedSessions).forEach(([_, groupSessions]) => {
    flatSessions.push(...groupSessions);
  });

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
      setSelectedIndex(prev => Math.min(flatSessions.length - 1, prev + 1));
    } else if (key.return && flatSessions.length > 0) {
      onSelect(flatSessions[selectedIndex].id);
      onClose();
    } else if (key.ctrl && input === 'd' && flatSessions.length > 0) {
      onDelete(flatSessions[selectedIndex].id);
      // Adjust selected index if needed
      if (selectedIndex >= flatSessions.length - 1) {
        setSelectedIndex(Math.max(0, flatSessions.length - 2));
      }
    } else if (key.ctrl && input === 'r' && flatSessions.length > 0) {
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

      {flatSessions.length === 0 ? (
        <Box marginY={2}>
          <Text color={INK_COLORS.textSecondary}>No results found</Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginBottom={1}>
          {Object.entries(groupedSessions).map(([groupName, groupSessions]) => {
            if (groupSessions.length === 0) return null;

            return (
              <Box key={groupName} flexDirection="column" marginBottom={1}>
                <Text color={INK_COLORS.secondary} bold>
                  {groupName}
                </Text>
                {groupSessions.map(session => {
                  const flatIndex = flatSessions.findIndex(s => s.id === session.id);
                  const isSelected = !isSearchFocused && flatIndex === selectedIndex;
                  const isActive = session.id === activeSessionId;
                  return (
                    <Box key={session.id} justifyContent="space-between">
                      <Text
                        color={isSelected ? INK_COLORS.active : INK_COLORS.text}
                        backgroundColor={isSelected ? INK_COLORS.surface : undefined}
                      >
                        {isActive ? '● ' : '  '}
                        {session.title}
                      </Text>
                      <Text color={INK_COLORS.textSecondary}>{formatTime(session.updatedAt)}</Text>
                    </Box>
                  );
                })}
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
