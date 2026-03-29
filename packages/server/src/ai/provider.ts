import { createOpenAI } from '@ai-sdk/openai';

export interface AIProviderConfig {
  type: 'ollama' | 'lmstudio' | 'openai';
  baseURL: string;
  apiKey?: string;
}

export function createAIProvider(config: AIProviderConfig) {
  return createOpenAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey ?? 'ollama', // dummy key for local providers
  });
}
