import React from 'react';
import { Box, Text } from 'ink';
import { INK_COLORS } from '../theme/colors.js';

export function Logo() {
  return (
    <Box flexDirection="column" alignItems="center" marginTop={2} marginBottom={1}>
      <Text>
        <Text color={INK_COLORS.primary}>{'██╗      ██████╗  ██████╗ █████╗ ██╗     '}</Text>
        <Text color={INK_COLORS.secondary}>{'     ██████╗ ██████╗ ██████╗ ███████╗'}</Text>
      </Text>
      <Text>
        <Text color={INK_COLORS.primary}>{'██║     ██╔═══██╗██╔════╝██╔══██╗██║     '}</Text>
        <Text color={INK_COLORS.secondary}>{'    ██╔════╝██╔═══██╗██╔══██╗██╔════╝'}</Text>
      </Text>
      <Text>
        <Text color={INK_COLORS.primary}>{'██║     ██║   ██║██║     ███████║██║     '}</Text>
        <Text color={INK_COLORS.secondary}>{'    ██║     ██║   ██║██║  ██║█████╗  '}</Text>
      </Text>
      <Text>
        <Text color={INK_COLORS.primary}>{'██║     ██║   ██║██║     ██╔══██║██║     '}</Text>
        <Text color={INK_COLORS.secondary}>{'    ██║     ██║   ██║██║  ██║██╔══╝  '}</Text>
      </Text>
      <Text>
        <Text color={INK_COLORS.primary}>{'███████╗╚██████╔╝╚██████╗██║  ██║███████╗'}</Text>
        <Text color={INK_COLORS.secondary}>{'    ╚██████╗╚██████╔╝██████╔╝███████╗'}</Text>
      </Text>
      <Text>
        <Text color={INK_COLORS.primary}>{'╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚══════╝'}</Text>
        <Text color={INK_COLORS.secondary}>{'     ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝'}</Text>
      </Text>
    </Box>
  );
}
