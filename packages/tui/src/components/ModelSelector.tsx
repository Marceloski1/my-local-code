import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { INK_COLORS } from '../theme/colors.js';

interface Model {
  name: string;
  provider: string;
  pricing: string;
}

interface ModelSelectorProps {
  models: Model[];
  selectedModel?: string;
  onSelect: (modelName: string) => void;
  onClose: () => void;
}

export function ModelSelector({ models, selectedModel, onSelect, onClose }: ModelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(true);

  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(searchQuery.toLowerCase())
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
      setSelectedIndex(prev => Math.min(filteredModels.length - 1, prev + 1));
    } else if (key.return && filteredModels.length > 0) {
      onSelect(filteredModels[selectedIndex].name);
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
        <Text bold>Select model</Text>
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

      <Box flexDirection="column" marginBottom={1}>
        {filteredModels.slice(0, 5).map((model, index) => {
          const isSelected = !isSearchFocused && index === selectedIndex;
          const isActive = model.name === selectedModel;
          return (
            <Box key={model.name} justifyContent="space-between">
              <Text
                color={isSelected ? INK_COLORS.active : INK_COLORS.text}
                backgroundColor={isSelected ? INK_COLORS.surface : undefined}
              >
                {isActive ? '● ' : '  '}
                {model.name}
              </Text>
              <Text color={INK_COLORS.textSecondary}>{model.pricing}</Text>
            </Box>
          );
        })}
      </Box>

      <Box borderStyle="single" borderColor={INK_COLORS.border} paddingX={1} marginTop={1}>
        <Text color={INK_COLORS.secondary}>Popular providers</Text>
      </Box>
      <Box paddingX={1}>
        <Text color={INK_COLORS.textSecondary}>OpenCode Zen (Recommended)</Text>
      </Box>

      <Box marginTop={1} paddingX={1}>
        <Text color={INK_COLORS.textSecondary}>View all providers </Text>
        <Text color={INK_COLORS.textSecondary}>ctrl+a</Text>
      </Box>
    </Box>
  );
}
