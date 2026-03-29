import React from 'react';
import { Box, Text } from 'ink';

interface ModelWarningProps {
  sizeGB: number;
  parameterSize: string;
}

export function ModelWarning({ sizeGB, parameterSize }: ModelWarningProps) {
  // Show warning for models larger than 8GB
  if (sizeGB > 8) {
    return <Text color="yellow"> ⚠️ Modelo grande — requiere {'>'}16GB RAM</Text>;
  }

  return null;
}
