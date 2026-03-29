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

export async function listModels(
  baseURL: string = 'http://localhost:11434'
): Promise<OllamaModelInfo[]> {
  try {
    const res = await fetch(`${baseURL}/api/tags`);
    if (!res.ok) throw new Error(`Ollama API error: ${res.statusText}`);
    const data = await res.json();
    return data.models.map((m: any) => ({
      name: m.name,
      size: m.size,
      parameter_size: m.details?.parameter_size ?? 'unknown',
      context_length: 8192,
      modified_at: m.modified_at,
    }));
  } catch (err: any) {
    if (err.cause?.code === 'ECONNREFUSED' || err.message.includes('fetch')) {
      throw new Error('Ollama no está disponible');
    }
    throw err;
  }
}

export async function pullModel(
  name: string,
  onProgress: (event: PullProgress) => void,
  baseURL: string = 'http://localhost:11434'
): Promise<void> {
  const res = await fetch(`${baseURL}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) throw new Error(`Ollama pull error: ${res.statusText}`);
  if (!res.body) throw new Error(`No body in response`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder
      .decode(value)
      .split('\n')
      .filter(l => l.trim() !== '');
    for (const line of lines) {
      const parsed = JSON.parse(line);
      onProgress(parsed);
    }
  }
}
