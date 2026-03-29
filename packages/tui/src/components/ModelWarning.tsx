import React from 'react';
import { Box, Text } from 'ink';
import { INK_COLORS } from '../theme/colors.js';

interface ModelWarningProps {
  sizeGB: number;
  parameterSize: string;
}

export function ModelWarning({ sizeGB, parameterSize }: ModelWarningProps) {
  // Show warning for models larger than 8GB
  if (sizeGB > 8) {
    return <Text color={INK_COLORS.warning}> ⚠️ Modelo grande — requiere {'>'}16GB RAM</Text>;
  }

  return null;
}
