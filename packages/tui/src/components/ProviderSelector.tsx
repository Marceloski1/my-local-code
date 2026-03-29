import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { INK_COLORS } from '../theme/colors.js';

interface Provider {
  id: 'ollama' | 'lmstudio';
  name: string;
  description: string;
}

const PROVIDERS: Provider[] = [
  {
    id: 'ollama',
    name: 'Ollama',
    description: 'Local AI models',
  },
  {
    id: 'lmstudio',
    name: 'LM Studio',
    description: 'Local AI models',
  },
];

interface ProviderSelectorProps {
  currentProvider: 'ollama' | 'lmstudio';
  onSelect: (provider: 'ollama' | 'lmstudio') => void;
  onClose: () => void;
}

export function ProviderSelector({ currentProvider, onSelect, onClose }: ProviderSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(
    PROVIDERS.findIndex(p => p.id === currentProvider)
  );
  const [isSearchFocused, setIsSearchFocused] = useState(true);

  const filteredProviders = PROVIDERS.filter(provider =>
    provider.name.toLowerCase().includes(searchQuery.toLowerCase())
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
      setSelectedIndex(prev => Math.min(filteredProviders.length - 1, prev + 1));
    } else if (key.return && filteredProviders.length > 0) {
      onSelect(filteredProviders[selectedIndex].id);
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
        <Text>Connect a provider</Text>
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

      <Box marginBottom={1}>
        <Text color={INK_COLORS.secondary}>Popular</Text>
      </Box>

      <Box flexDirection="column">
        {filteredProviders.map((provider, index) => {
          const isSelected = !isSearchFocused && index === selectedIndex;
          const isActive = provider.id === currentProvider;
          return (
            <Box key={provider.id}>
              <Text
                color={isSelected ? INK_COLORS.active : INK_COLORS.text}
                backgroundColor={isSelected ? INK_COLORS.surface : undefined}
              >
                {isActive ? '● ' : '  '}
                {provider.name} {provider.description}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
