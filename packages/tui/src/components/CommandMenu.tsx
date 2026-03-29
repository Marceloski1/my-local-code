import React from 'react';
import { Box, Text } from 'ink';
import { INK_COLORS } from '../theme/colors.js';

interface Command {
  name: string;
  description: string;
}

const COMMANDS: Command[] = [
  { name: '/agents', description: 'Switch agent' },
  { name: '/connect', description: 'Connect provider' },
  { name: '/editor', description: 'Open editor' },
  { name: '/exit', description: 'Exit the app' },
  { name: '/help', description: 'Help' },
  { name: '/init', description: 'create/update AGENTS.md' },
  { name: '/mcps', description: 'Toggle MCPs' },
  { name: '/models', description: 'Switch model' },
  { name: '/new', description: 'New session' },
  { name: '/review', description: 'review changes [commit|branch|pr], defaults to uncommitted' },
  { name: '/sessions', description: 'Manage sessions' },
];

interface CommandMenuProps {
  selectedIndex: number;
  filter?: string;
}

export function CommandMenu({ selectedIndex, filter = '' }: CommandMenuProps) {
  const filteredCommands = COMMANDS.filter(
    cmd =>
      cmd.name.toLowerCase().includes(filter.toLowerCase()) ||
      cmd.description.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={INK_COLORS.border}
      paddingX={2}
      paddingY={1}
      width="80%"
    >
      {filteredCommands.map((cmd, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Box key={cmd.name} marginY={0}>
            <Box width={20}>
              <Text
                color={isSelected ? INK_COLORS.active : INK_COLORS.text}
                backgroundColor={isSelected ? INK_COLORS.surface : undefined}
              >
                {isSelected ? '▶ ' : '  '}
                {cmd.name}
              </Text>
            </Box>
            <Text color={INK_COLORS.textSecondary}>{cmd.description}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
