import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useModels } from '../hooks/useModels.js';
import { useAppStore } from '../store/app-store.js';
import { ModelWarning } from '../components/ModelWarning.js';
import { INK_COLORS } from '../theme/colors.js';

export function ModelsScreen() {
  const { models, loading, error, pulling, pullProgress, pullModel, selectModel } = useModels();
  const activeModel = useAppStore(state => state.activeModel);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPullingInput, setIsPullingInput] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [showLargeModelConfirm, setShowLargeModelConfirm] = useState(false);
  const [pendingModelSelection, setPendingModelSelection] = useState<string | null>(null);

  useInput((input, key) => {
    if (showLargeModelConfirm) {
      if (input === 'y' || input === 'Y') {
        if (pendingModelSelection) {
          void selectModel(pendingModelSelection);
        }
        setShowLargeModelConfirm(false);
        setPendingModelSelection(null);
      } else if (input === 'n' || input === 'N' || key.escape) {
        setShowLargeModelConfirm(false);
        setPendingModelSelection(null);
      }
      return;
    }

    if (isPullingInput) {
      if (key.return) {
        setIsPullingInput(false);
        if (newModelName.trim() !== '') {
          void pullModel(newModelName.trim());
        }
        setNewModelName('');
      } else if (key.escape) {
        setIsPullingInput(false);
      }
      return;
    }

    if (key.downArrow) {
      setSelectedIndex(prev => Math.min(models.length - 1, prev + 1));
    } else if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.return && models.length > 0) {
      const selectedModel = models[selectedIndex];
      const sizeGB = selectedModel.size / 1024 / 1024 / 1024;

      // Show confirmation for large models (>8GB)
      if (sizeGB > 8) {
        setPendingModelSelection(selectedModel.name);
        setShowLargeModelConfirm(true);
      } else {
        void selectModel(selectedModel.name);
      }
    } else if (input === 'p' || input === 'P') {
      setIsPullingInput(true);
    }
  });

  if (loading) return <Text>Cargando modelos...</Text>;

  if (error) {
    // Check if it's an Ollama not available error
    if (error.includes('Ollama no está disponible') || error.includes('ECONNREFUSED')) {
      return (
        <Box flexDirection="column" marginTop={1}>
          <Text color={INK_COLORS.error} bold>
            ❌ Ollama no está disponible
          </Text>
          <Box marginTop={1}>
            <Text color={INK_COLORS.warning}>
              Ollama no está corriendo en http://localhost:11434
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text>Para iniciar Ollama, ejecuta:</Text>
          </Box>
          <Box marginLeft={2}>
            <Text color={INK_COLORS.secondary}>ollama serve</Text>
          </Box>
          <Box marginTop={1}>
            <Text color={INK_COLORS.textSecondary}>
              Presiona 'q' para salir y luego inicia Ollama
            </Text>
          </Box>
        </Box>
      );
    }

    // Generic error
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text color={INK_COLORS.error}>Error: {error}</Text>
        <Box marginTop={1}>
          <Text color={INK_COLORS.textSecondary}>Presiona 'q' para salir</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      {showLargeModelConfirm && pendingModelSelection && (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={INK_COLORS.warning}
          padding={1}
          marginBottom={1}
        >
          <Text color={INK_COLORS.warning} bold>
            ⚠️ Advertencia: Modelo Grande
          </Text>
          <Box marginTop={1}>
            <Text>
              El modelo <Text bold>{pendingModelSelection}</Text> requiere más de 16GB de RAM.
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text>¿Estás seguro de que quieres seleccionar este modelo?</Text>
          </Box>
          <Box marginTop={1}>
            <Text color={INK_COLORS.secondary}>
              Presiona 'Y' para confirmar o 'N' para cancelar
            </Text>
          </Box>
        </Box>
      )}

      <Text bold>
        Modelos Instalados (Flechas para navegar, Enter para seleccionar, 'P' para descargar nuevo)
      </Text>

      <Box flexDirection="column" marginTop={1} marginBottom={1}>
        {models.map((model, index) => {
          const isSelected = index === selectedIndex;
          const isActive = model.name === activeModel;
          const sizeGB = (model.size / 1024 / 1024 / 1024).toFixed(2);

          return (
            <Box key={model.name}>
              <Text color={isSelected ? INK_COLORS.active : undefined}>
                {isSelected ? '> ' : '  '}
                {isActive ? '★ ' : '  '}
                {model.name}
              </Text>
              <Box marginLeft={2}>
                <Text color={INK_COLORS.textSecondary}>
                  {model.size ? (model.size / 1024 / 1024 / 1024).toFixed(2) : '0.00'} GB - Params:{' '}
                  {model.parameter_size || 'unknown'}
                </Text>
              </Box>
              <ModelWarning
                sizeGB={parseFloat(sizeGB)}
                _parameterSize={model.parameter_size || 'unknown'}
              />
            </Box>
          );
        })}
      </Box>

      {isPullingInput && (
        <Box marginTop={1}>
          <Text color={INK_COLORS.success}>Nombre del modelo a descargar: </Text>
          <TextInput value={newModelName} onChange={setNewModelName} focus={true} />
        </Box>
      )}

      {pulling && (
        <Box marginTop={1}>
          <Text color={INK_COLORS.secondary}>
            Descargando...{' '}
            {Math.round((pullProgress.completed / Math.max(pullProgress.total || 1, 1)) * 100)}%
          </Text>
        </Box>
      )}
    </Box>
  );
}
