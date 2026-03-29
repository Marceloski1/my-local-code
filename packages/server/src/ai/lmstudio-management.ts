export interface LMStudioModelInfo {
  id: string;
  name: string;
  size?: number;
  type: string;
  loaded: boolean;
}

export interface LMStudioServerStatus {
  running: boolean;
  port: number;
  models: LMStudioModelInfo[];
}

/**
 * List available models in LM Studio
 * LM Studio uses OpenAI-compatible API, so we use the /v1/models endpoint
 */
export async function listModels(
  baseURL: string = 'http://localhost:1234/v1'
): Promise<LMStudioModelInfo[]> {
  try {
    const res = await fetch(`${baseURL}/models`);
    if (!res.ok) throw new Error(`LM Studio API error: ${res.statusText}`);

    const data = await res.json();

    // LM Studio returns OpenAI-compatible format
    return data.data.map((m: any) => ({
      id: m.id,
      name: m.id, // Use id as name for consistency
      size: m.size,
      type: m.object || 'model',
      loaded: true, // If it's in the list, it's loaded
    }));
  } catch (err: any) {
    if (err.cause?.code === 'ECONNREFUSED' || err.message.includes('fetch')) {
      throw new Error(
        'LM Studio no está disponible. Asegúrate de que el servidor local esté corriendo en el puerto 1234.'
      );
    }
    throw err;
  }
}

/**
 * Check if LM Studio server is running
 */
export async function checkServerStatus(
  baseURL: string = 'http://localhost:1234/v1'
): Promise<boolean> {
  try {
    const res = await fetch(`${baseURL}/models`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Get current loaded model in LM Studio
 * LM Studio typically has one model loaded at a time
 */
export async function getCurrentModel(
  baseURL: string = 'http://localhost:1234/v1'
): Promise<string | null> {
  try {
    const models = await listModels(baseURL);
    // Return the first model if any are loaded
    return models.length > 0 ? models[0].id : null;
  } catch {
    return null;
  }
}

/**
 * Test if a specific model is available in LM Studio
 */
export async function isModelAvailable(
  modelId: string,
  baseURL: string = 'http://localhost:1234/v1'
): Promise<boolean> {
  try {
    const models = await listModels(baseURL);
    return models.some(m => m.id === modelId || m.name === modelId);
  } catch {
    return false;
  }
}
