import { parseSSE } from './sse.js';

export interface OllamaModelInfo {
  name: string;
  size: number;
  parameter_size: string;
  context_length: number;
  modified_at: string;
}

export interface PullProgress {
  status: string;
  completed?: number;
  total?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool_call' | 'tool_result';
  content: string;
  toolName?: string;
  toolArgs?: string;
  toolResult?: string;
  createdAt: string;
}

export interface SessionMetadata {
  key: string;
  value: string;
}

export interface SessionDetails {
  session: { id: string; title: string; createdAt: string; updatedAt: string };
  messages: Message[];
  metadata: SessionMetadata[];
}

export interface SSEEvent<T = unknown> {
  sequence: number;
  type: string;
  data: T;
}

export class AgentClient {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:4096') {
    this.baseUrl = baseUrl;
  }

  async listModels(): Promise<OllamaModelInfo[]> {
    const res = await fetch(`${this.baseUrl}/api/models`);
    if (!res.ok) {
      if (res.status === 503) throw new Error(`Ollama no está disponible`);
      throw new Error(`Server error: ${res.statusText}`);
    }
    const data = (await res.json()) as { models: OllamaModelInfo[] };
    return data.models;
  }

  async *pullModel(name: string): AsyncIterable<PullProgress & { sequence?: number }> {
    const res = await fetch(`${this.baseUrl}/api/models/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error(`Server error: ${res.statusText}`);

    for await (const event of parseSSE<{ sequence: number; type: string; data: PullProgress }>(
      res
    )) {
      yield { ...event.data, sequence: event.sequence };
    }
  }

  async getActiveModel(): Promise<string | null> {
    const res = await fetch(`${this.baseUrl}/api/models/active`);
    if (!res.ok) throw new Error(`Server error`);
    const data = (await res.json()) as { model: string | null };
    return data.model;
  }

  async setActiveModel(model: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/models/active`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model }),
    });
    if (!res.ok) throw new Error(`Server error`);
  }

  // Sessions
  async createSession(
    title?: string
  ): Promise<{ id: string; title: string; createdAt: string; updatedAt: string }> {
    const res = await fetch(`${this.baseUrl}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error(`Server error: ${res.statusText}`);
    return (await res.json()) as {
      id: string;
      title: string;
      createdAt: string;
      updatedAt: string;
    };
  }

  async listSessions(): Promise<
    Array<{ id: string; title: string; createdAt: string; updatedAt: string }>
  > {
    const res = await fetch(`${this.baseUrl}/api/sessions`);
    if (!res.ok) throw new Error(`Server error: ${res.statusText}`);
    const data = (await res.json()) as {
      sessions: Array<{ id: string; title: string; createdAt: string; updatedAt: string }>;
    };
    return data.sessions;
  }

  async getSession(id: string): Promise<SessionDetails> {
    const res = await fetch(`${this.baseUrl}/api/sessions/${id}`);
    if (!res.ok) {
      if (res.status === 404) throw new Error('Session not found');
      throw new Error(`Server error: ${res.statusText}`);
    }
    return (await res.json()) as SessionDetails;
  }

  /**
   * Resync session state after disconnection
   * Fetches the latest session state from the server and reconstructs local state
   */
  async resync(sessionId: string): Promise<SessionDetails> {
    return await this.getSession(sessionId);
  }

  async deleteSession(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/sessions/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      if (res.status === 404) throw new Error('Session not found');
      throw new Error(`Server error: ${res.statusText}`);
    }
  }

  // Chat
  async *sendMessage(sessionId: string, content: string): AsyncIterable<SSEEvent<unknown>> {
    const res = await fetch(`${this.baseUrl}/api/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const error = (await res.json()) as { error?: string };
      throw new Error(error.error || `Server error: ${res.statusText}`);
    }

    for await (const event of parseSSE<SSEEvent<unknown>>(res)) {
      yield event;
    }
  }

  // Config
  async setMode(mode: 'plan' | 'build'): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/config/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    if (!res.ok) throw new Error(`Server error: ${res.statusText}`);
  }

  async getConfig(): Promise<Record<string, string>> {
    const res = await fetch(`${this.baseUrl}/api/config`);
    if (!res.ok) throw new Error(`Server error: ${res.statusText}`);
    return (await res.json()) as Record<string, string>;
  }

  // Provider
  async getProvider(): Promise<'ollama' | 'lmstudio'> {
    const res = await fetch(`${this.baseUrl}/api/models/provider`);
    if (!res.ok) throw new Error(`Server error: ${res.statusText}`);
    const data = (await res.json()) as { provider: 'ollama' | 'lmstudio' };
    return data.provider;
  }

  async setProvider(provider: 'ollama' | 'lmstudio'): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/models/provider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    });
    if (!res.ok) throw new Error(`Server error: ${res.statusText}`);
  }

  async getProviderStatus(): Promise<{
    provider: 'ollama' | 'lmstudio';
    running: boolean;
    url: string;
    error?: string;
  }> {
    const res = await fetch(`${this.baseUrl}/api/models/provider/status`);
    if (!res.ok) throw new Error(`Server error: ${res.statusText}`);
    return (await res.json()) as {
      provider: 'ollama' | 'lmstudio';
      running: boolean;
      url: string;
      error?: string;
    };
  }
}
