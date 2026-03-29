import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export interface AIProviderConfig {
  type: 'ollama' | 'lmstudio' | 'openai';
  baseURL: string;
  apiKey?: string;
}

export function createAIProvider(config: AIProviderConfig) {
  // LM Studio uses OpenAI-compatible API
  if (config.type === 'lmstudio') {
    return createOpenAICompatible({
      name: 'lmstudio',
      baseURL: config.baseURL,
      apiKey: config.apiKey ?? 'lm-studio', // dummy key for local provider
    });
  }

  // Ollama and OpenAI use the standard OpenAI SDK
  return createOpenAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey ?? (config.type === 'ollama' ? 'ollama' : undefined),
  });
}
