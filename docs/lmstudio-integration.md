# LM Studio Integration

## Overview

LocalCode now supports LM Studio as an alternative AI provider alongside Ollama. LM Studio provides a local AI inference server with an OpenAI-compatible API.

## Architecture

### Provider System

The provider system supports multiple AI backends:

- **Ollama**: Local models via Ollama API (port 11434)
- **LM Studio**: Local models via LM Studio API (port 1234)

### Key Files

- `packages/server/src/ai/provider.ts` - Provider factory using `@ai-sdk/openai-compatible`
- `packages/server/src/ai/lmstudio-management.ts` - LM Studio API client
- `packages/server/src/ai/ollama-management.ts` - Ollama API client
- `packages/server/src/routes/models.ts` - Model management endpoints
- `packages/server/src/routes/chat.ts` - Chat endpoint with provider support

## API Endpoints

### Provider Management

#### GET `/api/models/provider`

Get the active provider.

**Response:**

```json
{
  "provider": "ollama" | "lmstudio"
}
```

#### POST `/api/models/provider`

Set the active provider.

**Request:**

```json
{
  "provider": "ollama" | "lmstudio"
}
```

**Response:**

```json
{
  "ok": true,
  "provider": "lmstudio"
}
```

#### GET `/api/models/provider/status`

Check provider server status.

**Response (LM Studio):**

```json
{
  "provider": "lmstudio",
  "running": true,
  "url": "http://localhost:1234"
}
```

**Response (Ollama):**

```json
{
  "provider": "ollama",
  "running": true,
  "url": "http://localhost:11434",
  "modelCount": 5
}
```

### Model Management

#### GET `/api/models`

List available models from the active provider.

**Response:**

```json
{
  "models": [
    {
      "id": "llama-3.2-3b-instruct",
      "name": "llama-3.2-3b-instruct",
      "type": "model",
      "loaded": true
    }
  ],
  "provider": "lmstudio"
}
```

#### POST `/api/models/pull`

Pull a model (Ollama only).

**Request:**

```json
{
  "name": "llama3.2:3b"
}
```

**Note:** LM Studio doesn't support pulling models via API. Models must be downloaded through the LM Studio UI.

## LM Studio Setup

### 1. Install LM Studio

Download from: https://lmstudio.ai/

### 2. Download Models

- Open LM Studio
- Go to "Discover" tab
- Search and download models (e.g., Llama 3.2 3B Instruct)

### 3. Start Local Server

- Go to "Local Server" tab
- Select a model to load
- Click "Start Server"
- Server runs on `http://localhost:1234` by default

### 4. Configure LocalCode

```bash
# Switch to LM Studio provider
curl -X POST http://localhost:3000/api/models/provider \
  -H "Content-Type: application/json" \
  -d '{"provider": "lmstudio"}'

# List available models
curl http://localhost:3000/api/models

# Set active model
curl -X POST http://localhost:3000/api/models/active \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-3b-instruct"}'
```

## Implementation Details

### Provider Factory (`provider.ts`)

```typescript
export function createAIProvider(config: AIProviderConfig) {
  if (config.type === 'lmstudio') {
    return createOpenAICompatible({
      name: 'lmstudio',
      baseURL: config.baseURL,
      apiKey: config.apiKey ?? 'lm-studio',
    });
  }

  return createOpenAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey ?? (config.type === 'ollama' ? 'ollama' : undefined),
  });
}
```

### LM Studio Management Functions

- `listModels()` - List available models via `/v1/models`
- `checkServerStatus()` - Check if server is running
- `getCurrentModel()` - Get the currently loaded model
- `isModelAvailable()` - Check if a specific model is available

### Chat Integration

The chat endpoint automatically uses the active provider:

```typescript
const providerType = (providerResult.length > 0 ? providerResult[0].value : 'ollama') as
  | 'ollama'
  | 'lmstudio';

const provider = createAIProvider({
  type: providerType,
  baseURL: providerType === 'lmstudio' ? 'http://localhost:1234/v1' : 'http://localhost:11434/v1',
});
```

## Configuration Storage

Provider configuration is stored in the `config` table:

- `provider` - Active provider ('ollama' or 'lmstudio')
- `activeModel` - Currently selected model name

## Error Handling

- Connection errors show user-friendly messages
- LM Studio unavailable: "LM Studio no está disponible. Asegúrate de que el servidor local esté corriendo en el puerto 1234."
- Model pulling on LM Studio returns 400 error with message

## Next Steps

- [ ] Add provider selection to TUI
- [ ] Show provider status in status bar
- [ ] Add model loading indicator for LM Studio
- [ ] Support custom ports for both providers
- [ ] Add provider health checks on startup
