# 04 — Módulos Principales

Detalle técnico de cada módulo: responsabilidad, interfaz pública, dependencias internas y manejo de errores.

---

## 1. `packages/shared` — Contratos Compartidos ← NUEVO

### Responsabilidad
Definir Zod schemas, tipos TypeScript e interfaces que usan tanto el server como el SDK. Single source of truth para la forma de los datos que cruzan la frontera HTTP/SSE.

### Interfaz pública
```typescript
// schemas/models.ts
export const ListModelsResponseSchema = z.object({ models: z.array(OllamaModelSchema) });
export const PullModelRequestSchema = z.object({ name: z.string() });
export const ActiveModelResponseSchema = z.object({ model: z.string().nullable() });

// schemas/sessions.ts
export const CreateSessionRequestSchema = z.object({ title: z.string().optional() });
export const SessionSchema = z.object({ id: z.string(), title: z.string(), createdAt: z.string() });

// schemas/messages.ts
export const SendMessageRequestSchema = z.object({ content: z.string() });
export const MessageSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  role: z.enum(['user', 'assistant', 'tool_call', 'tool_result', 'system']),
  content: z.string(),
  toolName: z.string().optional(),
  toolArgs: z.string().optional(),   // JSON string
  toolResult: z.string().optional(), // JSON string
  sequence: z.number(),
  createdAt: z.string(),
});

// schemas/config.ts
export const ConfigSchema = z.object({ mode: z.enum(['plan', 'build']), activeModel: z.string().nullable() });

// types/agent.ts
export interface AgentResponse {
  type: 'token' | 'tool_call' | 'tool_result' | 'permission_request' | 'done' | 'error' | 'compaction';
  data: string | ToolCallData | PermissionRequest;
}

// types/sse-events.ts
export interface SSEEvent {
  sequence: number;
  type: AgentResponse['type'];
  data: unknown;
}

// types/tools.ts
export interface ToolSpec {
  name: string;
  description: string;
  schema: ZodSchema;
  requiresPermission: boolean;
  execute: (params: unknown) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

// types/provider.ts
export interface AIProviderConfig {
  type: 'ollama' | 'lmstudio' | 'openai';
  baseURL: string;
  apiKey?: string;
}

// constants/defaults.ts
export const DEFAULTS = {
  MAX_ITERATIONS: 25,
  CONTEXT_COMPACTION_THRESHOLD: 0.75,
  TOOL_TIMEOUT_MS: 30_000,
  OLLAMA_TIMEOUT_MS: 120_000,
  PERMISSION_TIMEOUT_MS: 300_000,
  LIST_FILES_DEFAULT_DEPTH: 3,
  LIST_FILES_MAX_DEPTH: 10,
  READ_FILE_MAX_SIZE: 100 * 1024,
  BASH_MAX_OUTPUT: 50 * 1024,
  DESTRUCTIVE_TOOL_DELAY_MS: 500,
  STREAMING_THROTTLE_MS: 50,
};
```

### Dependencias internas
- Solo `zod`. Sin dependencias de Node ni de otros packages internos.

---

## 2. `packages/server` — Módulo DB (`db/`)

### Responsabilidad
Gestionar la conexión a SQLite y exponer el schema Drizzle. Ejecutar migraciones automáticamente al arrancar.

### Interfaz pública
```typescript
// connection.ts
export function getDb(): BetterSQLite3Database;
export function closeDb(): void;

// schema.ts
export const sessions: SQLiteTable;   // id, title, createdAt, updatedAt
export const messages: SQLiteTable;   // id, sessionId, role, content, toolName, toolArgs, toolResult, sequence, createdAt
export const config: SQLiteTable;     // key (unique), value (JSON string)
export const sessionMetadata: SQLiteTable;  // ← NUEVO: metadata no compactable (Riesgo 4)
  // id, sessionId, type ('file_modified'|'command_executed'|'error_found'|'decision_made'), key, value, createdAt

// migrate.ts
export function runMigrations(): void;
```

### Dependencias internas
- `lib/paths.ts` para resolver la ruta del archivo `.db`
- `@agent/shared` para tipos de roles y constantes

### Errores a manejar
| Error | Causa | Acción |
|-------|-------|--------|
| `SQLITE_CANTOPEN` | Path no existe o sin permiso | Crear directorio padre con `mkdirSync(recursive)`. Si falla, exit con mensaje claro |
| `SQLITE_CORRUPT` | DB corrupta | Log error, ofrecer path para backup, crear nueva DB |
| `SQLITE_LOCKED` | Otro proceso usa la DB | Improbable (single client), pero retry 3 veces con backoff |
| Migration falla | Schema incompatible | Log el SQL que falló, exit con instrucciones de recuperación |

---

## 3. `packages/server` — Módulo AI Provider (`ai/`) ← RENOMBRADO de `ollama/`

### Responsabilidad
Gestionar la comunicación con el proveedor de AI a través del **Vercel AI SDK**. Abstrae el proveedor concreto (Ollama, LMStudio, OpenAI) detrás de la interfaz del SDK. También expone funciones de gestión directa de Ollama (listar/descargar modelos) que no tienen equivalente en el Vercel AI SDK.

### Interfaz pública
```typescript
// provider.ts — Configuración del proveedor via Vercel AI SDK
import { createOpenAI } from '@ai-sdk/openai';

export function createAIProvider(config: AIProviderConfig): ReturnType<typeof createOpenAI> {
  return createOpenAI({
    baseURL: config.baseURL,  // 'http://localhost:11434/v1' para Ollama
    apiKey: config.apiKey ?? 'ollama', // Ollama no requiere API key real
  });
}

// Uso en el loop del agente:
// const provider = createAIProvider({ type: 'ollama', baseURL: '...' });
// const model = provider('llama3.1:8b');
// const result = await streamText({ model, messages, tools });

// ollama-management.ts — Funciones directas de Ollama (fuera del SDK)
export async function listModels(): Promise<OllamaModel[]>;
export async function showModel(name: string): Promise<OllamaModelInfo>;  // incluye context_length
export async function pullModel(name: string, onProgress: (event: PullProgress) => void): Promise<void>;

// types.ts
export interface OllamaModel { name: string; size: number; modifiedAt: string; }
export interface OllamaModelInfo { context_length: number; parameters: string; /* ... */ }
export interface PullProgress { status: string; completed?: number; total?: number; }
```

### Cambio de proveedor
Para agregar LMStudio en el futuro:
```typescript
// Solo cambiar la configuración:
createAIProvider({
  type: 'lmstudio',
  baseURL: 'http://localhost:1234/v1',
});
// El resto del código (loop, tools, streaming) NO cambia.
```

### Dependencias internas
- `ai` (Vercel AI SDK core) y `@ai-sdk/openai` (proveedor compatible)
- `@agent/shared` para tipos
- `lib/logger.ts` para logging de requests/responses

### Errores a manejar
| Error | Causa | Acción |
|-------|-------|--------|
| `ECONNREFUSED` en `:11434` | Ollama no está corriendo | Retornar error tipado `OllamaNotAvailable`. La ruta que llama decide si enviar mensaje a la TUI |
| Timeout (>120s sin token) | Modelo muy lento o colgado | AbortController con timeout configurable, retornar `OllamaTimeout` |
| 404 en modelo | Modelo no descargado | Retornar `ModelNotFound` con el nombre para que la UI sugiera descargarlo |
| Stream corta inesperadamente | Ollama crashea mid-response | Detectar stream incompleto, retornar `OllamaStreamError` con respuesta parcial |
| Pull falla midway | Disco lleno, red cortada | Llamar `onProgress` con status `"error"` y detalle del error |

---

## 4. `packages/server` — Tools del Agente (`tools/`)

### Responsabilidad
Cada tool ejecuta una acción atómica sobre el filesystem o el shell. Todos siguen la misma interfaz. El registry los agrupa. Los schemas Zod se usan directamente con `streamText({ tools })` del Vercel AI SDK.

### Interfaz pública
```typescript
// registry.ts
import { tool } from 'ai'; // Vercel AI SDK

// Los tools se registran de dos formas:
// 1. Como ToolSpec interno (para ejecución directa):
export function getToolRegistry(): Map<string, ToolSpec>;
export function executeTool(name: string, params: unknown): Promise<ToolResult>;

// 2. Como tools del Vercel AI SDK (para streamText):
export function getVercelTools(): Record<string, ReturnType<typeof tool>> {
  return {
    read_file: tool({
      description: 'Lee el contenido de un archivo',
      parameters: readFileSchema,
      execute: async (params) => executeToolInternal('read_file', params),
    }),
    // ... etc
  };
}

export function getToolDefinitions(): ToolDefinition[];  // Para el system prompt textual (fallback)
```

### Detalle por tool

| Tool | Params | Permisos | Notas |
|------|--------|----------|-------|
| `read_file` | `{ path: string }` | No | Lee con `utf-8`. Si el archivo es >100KB, trunca y avisa |
| `write_file` | `{ path, content }` | **Sí** | Crea directorios padres. Sobreescribe si existe |
| `edit_file` | `{ path, old_str, new_str }` | **Sí** | Reemplaza primera ocurrencia. Error si `old_str` no se encuentra |
| `bash` | `{ command: string }` | **Sí** | Timeout 30s default. Shell: detectada con `detectShell()` (Decisión 3D) |
| `list_files` | `{ path, maxDepth? }` | No | Default depth 3, max 10. Ignora node_modules, .git, dist, build |
| `search_files` | `{ pattern, path, caseSensitive? }` | No | Grep recursivo, 3 líneas contexto. Máximo 50 resultados |

### Dependencias internas
- Solo `node:fs`, `node:child_process`, `node:path`
- `lib/paths.ts` para normalización de paths cross-platform
- `lib/shell.ts` para `detectShell()` (Decisión 3D)
- `cross-spawn` para ejecución cross-platform de comandos
- `@agent/shared` para tipos `ToolSpec`, `ToolResult`

### Errores a manejar
| Error | Causa | Acción |
|-------|-------|--------|
| `ENOENT` | Archivo/directorio no existe | `{ success: false, output: "", error: "File not found: /path" }` |
| `EACCES` | Sin permisos | `{ success: false, output: "", error: "Permission denied: /path" }` |
| `EPERM` en Windows | Archivo bloqueado por otro proceso | Misma respuesta que `EACCES` |
| Timeout en bash | Comando tarda >30s | Kill el proceso, retornar output parcial + error timeout |
| Shell no encontrada | Configuración rara | Fallback: `pwsh` → `powershell` → `cmd` en Windows, `bash` → `sh` en Linux |
| Output excesivo | `bash` genera GB de output | Limitar captura a 50KB, truncar y avisar |

---

## 5. `packages/server` — Loop del Agente (`agent/`)

### Responsabilidad
Orquestrar el ciclo ReAct completo: recibir mensaje del usuario, razonar con el LLM via Vercel AI SDK, ejecutar tools, iterar hasta respuesta final. Gestionar modos, compactación de contexto, y el enfoque híbrido de tool calling (Decisión 1C).

### Interfaz pública
```typescript
// loop.ts
import { streamText } from 'ai';

export interface AgentConfig {
  model: string;
  mode: 'plan' | 'build';
  maxIterations: number;            // Default 25
  contextCompactionThreshold: number; // Default 0.75
  toolMode: 'auto' | 'native' | 'textual'; // Default 'auto' (Decisión 1C)
}

export async function* runAgent(
  sessionId: string,
  userMessage: string,
  config: AgentConfig,
  onPermissionResponse?: () => Promise<boolean>,  // Para modo plan
): AsyncGenerator<AgentResponse>;

// context.ts
export function estimateTokens(text: string): number;  // Heurística: chars / 4
export async function compactContext(
  messages: ChatMessage[],
  model: string,
  keepRecent: number,
  sessionMetadata: Metadata[],  // ← NUEVO: metadata no compactable
): Promise<ChatMessage[]>;

// permissions.ts
export function requiresPermission(toolName: string, mode: 'plan' | 'build'): boolean;

// prompt.ts
export function buildSystemPrompt(
  tools: ToolDefinition[],
  mode: 'plan' | 'build',
  platform: { os: string; shell: string },  // ← NUEVO: info de OS/shell
): string;
```

### Dependencias internas
- `ai/provider.ts` — para obtener el modelo del Vercel AI SDK
- `tools/registry.ts` — para obtener tools en formato Vercel SDK y ejecutarlos
- `agent/parser.ts` — para fallback textual (Decisión 5: A+C)
- `db/` — para persistir mensajes y metadata
- `lib/logger.ts`
- `@agent/shared` para tipos y constantes

### Flujo del loop (actualizado con Vercel AI SDK)
```
1. Cargar historial de messages de la sesión (DB)
2. Append userMessage al historial
3. Verificar tokens: si > 75% del context_length → compactar
   - Inyectar metadata no compactable junto con el resumen
4. Construir prompt: system (con info de OS/shell) + historial
5. Llamar con Vercel AI SDK:
   a. Si toolMode='native' o 'auto': streamText({ model, messages, tools: getVercelTools() })
   b. Si toolMode='textual': streamText({ model, messages }) con prompt de tools en system
6. Parsear respuesta:
   a. Ruta nativa: el SDK extrae tool_calls automáticamente → yield {type: 'tool_call', data}
   b. Ruta textual: parser regex + Zod extrae tool_calls del texto → yield {type: 'tool_call', data}
   c. Si no hay tool call → yield {type: 'done', data} → FIN
7. Si es tool call:
   - Si modo plan y tool requiere permiso → yield {type: 'permission_request'}
     - Esperar respuesta (timeout 5min). Si rechaza → append "User denied permission" → goto 4
   - Si modo build y tool es destructivo → delay 500ms (rate limiting, inconsistencia #3)
   - Ejecutar tool → yield {type: 'tool_result', data}
   - Guardar metadata: archivo modificado / comando ejecutado (Riesgo 4)
   - Append resultado al historial → goto 3
8. Si en toolMode='auto' y 3 tool calls nativos fallan → switch a textual para esta sesión
9. Si iteraciones > maxIterations → yield {type: 'error', "Max iterations"} → FIN
10. Si mismo tool call se repite 3 veces → yield {type: 'error', "Loop detectado"} → FIN
```

### Errores a manejar
| Error | Causa | Acción |
|-------|-------|--------|
| Proveedor AI falla mid-stream | Crash, OOM | Yield error con respuesta parcial, guardar en DB |
| Tool falla | Cualquier error del tool | Inyectar error como tool_result, dejar que el LLM decida (suele auto-corregir) |
| Max iteraciones | LLM en loop | Yield error y último estado del contexto |
| Parsing textual falla | LLM genera formato inesperado | Tratar toda la respuesta como texto plano (respuesta final) |
| Compactación falla | Proveedor AI falla al resumir | Skip compactación, continuar con historial completo, warn en logs |

---

## 6. `packages/server` — Rutas HTTP (`routes/`)

### Responsabilidad
Definir endpoints REST y SSE. Validar input con Zod (schemas de `@agent/shared`). Delegar lógica a los módulos correspondientes. No contener lógica de negocio.

### Interfaz pública (endpoints)

#### Health
| Método | Ruta | Request | Response |
|--------|------|---------|----------|
| GET | `/health` | — | `{ status: "ok", timestamp, ollamaAvailable: bool }` |

#### Models
| Método | Ruta | Request | Response |
|--------|------|---------|----------|
| GET | `/api/models` | — | `{ models: OllamaModel[] }` |
| POST | `/api/models/pull` | `{ name: string }` | SSE stream: `{ status, completed?, total? }` |
| GET | `/api/models/active` | — | `{ model: string \| null }` |
| POST | `/api/models/active` | `{ model: string }` | `{ ok: true }` |

#### Sessions
| Método | Ruta | Request | Response |
|--------|------|---------|----------|
| POST | `/api/sessions` | `{ title?: string }` | `{ id, title, createdAt }` |
| GET | `/api/sessions` | — | `{ sessions: Session[] }` |
| GET | `/api/sessions/:id` | — | `{ session: Session, messages: Message[] }` |
| DELETE | `/api/sessions/:id` | — | `{ ok: true }` |

#### Messages
| Método | Ruta | Request | Response |
|--------|------|---------|----------|
| POST | `/api/sessions/:id/messages` | `{ content: string }` | SSE stream: `AgentResponse` events con sequence |

#### Config
| Método | Ruta | Request | Response |
|--------|------|---------|----------|
| GET | `/api/config` | — | `{ mode, activeModel, ... }` |
| POST | `/api/config/mode` | `{ mode: 'plan' \| 'build' }` | `{ ok: true }` |

### Dependencias internas
- Cada ruta importa del módulo que necesita: `ai/`, `agent/`, `db/`
- `middleware/sse.ts` para las rutas SSE (con sequence numbers)
- `@agent/shared` para validación con Zod schemas

---

## 7. `packages/sdk` — Cliente HTTP

### Responsabilidad
Proveer un cliente TypeScript tipado para la TUI (o cualquier otro consumidor) que abstrae los detalles HTTP y SSE.

### Interfaz pública
```typescript
// client.ts
export class AgentClient {
  constructor(baseUrl?: string);  // Default 'http://localhost:4096'

  // Models
  listModels(): Promise<OllamaModel[]>;
  pullModel(name: string): AsyncIterable<PullProgress>;
  getActiveModel(): Promise<string | null>;
  setActiveModel(name: string): Promise<void>;

  // Sessions
  createSession(title?: string): Promise<Session>;
  listSessions(): Promise<Session[]>;
  getSession(id: string): Promise<{ session: Session; messages: Message[] }>;
  deleteSession(id: string): Promise<void>;

  // Messages
  sendMessage(sessionId: string, content: string): AsyncIterable<AgentResponse>;

  // Config
  getConfig(): Promise<AppConfig>;
  setMode(mode: 'plan' | 'build'): Promise<void>;

  // Health
  health(): Promise<HealthResponse>;
}
```

### Dependencias internas
- `@agent/shared` para tipos y schemas (Decisión 2B — NO depende de `@agent/server`)
- `sse.ts` helper local para parsear SSE con tracking de `sequence` numbers

### Errores a manejar
| Error | Causa | Acción |
|-------|-------|--------|
| `ECONNREFUSED` en `:4096` | Server no corriendo | Throw `ServerNotAvailable` con mensaje descriptivo |
| HTTP 4xx | Validación, not found | Throw error tipado con status y body parseado |
| HTTP 5xx | Error del server | Throw `ServerError` con detalle |
| SSE se cierra inesperadamente | Server crashea, timeout | El AsyncIterable termina. Exponer `resync(sessionId)` para recuperar estado |
| JSON parse falla | Respuesta malformada | Throw `InvalidResponse` con body raw |

---

## 8. `packages/tui` — Aplicación terminal

### Responsabilidad
Renderizar la interfaz de usuario en la terminal. Gestionar input del usuario. Consumir datos del SDK. No contiene lógica de negocio.

### Módulos internos

#### `app.tsx`
- Layout principal: `<Box flexDirection="column">`
- Renderiza `<Header>`, `<TabBar>`, y la pantalla activa
- **Gestiona estado global con Zustand** (Decisión 4B)

#### `store/app-store.ts` — Zustand Store
```typescript
import { create } from 'zustand';

interface AppStore {
  activeScreen: 'models' | 'chat' | 'sessions';
  activeModel: string | null;
  mode: 'plan' | 'build';
  activeSessionId: string | null;
  serverConnected: boolean;

  setScreen: (screen: AppStore['activeScreen']) => void;
  setModel: (model: string) => void;
  setMode: (mode: AppStore['mode']) => void;
  setSession: (id: string | null) => void;
  setServerConnected: (connected: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  activeScreen: 'chat',
  activeModel: null,
  mode: 'plan',
  activeSessionId: null,
  serverConnected: false,

  setScreen: (screen) => set({ activeScreen: screen }),
  setModel: (model) => set({ activeModel: model }),
  setMode: (mode) => set({ mode }),
  setSession: (id) => set({ activeSessionId: id }),
  setServerConnected: (connected) => set({ serverConnected: connected }),
}));
```

#### `screens/models.tsx`
- Muestra lista de modelos con `useModels()` hook
- Input para pull de nuevo modelo con barra de progreso
- Indicador de modelo activo (★)
- **Muestra tamaño y parámetros de cada modelo** (Riesgo 7 mitigación)

#### `screens/chat.tsx`
- Scrollable message list
- Input de texto con `<TextInput>` de ink-text-input
- Streaming con **throttle de 50ms** (Riesgo 6 mitigación)
- Tool calls se muestran inline como bloques expandibles (**React.memo**)
- Dialog de confirmación cuando el agente pide permiso (modo plan)
- Scroll automático al final cuando llegan nuevos tokens
- **Resync después de desconexión** (Riesgo 5 mitigación)

#### `screens/sessions.tsx`
- Lista de sesiones con fecha y preview
- Seleccionar para continuar
- Delete con confirmación

#### Hooks
| Hook | Responsabilidad | SDK calls que usa |
|------|----------------|-------------------|
| `useModels` | Lista, pull, selección de modelo | `listModels`, `pullModel`, `setActiveModel` |
| `useChat` | Enviar mensaje, recibir stream con throttle, resync | `sendMessage`, `getSession` |
| `useSessions` | CRUD sesiones | `createSession`, `listSessions`, `getSession`, `deleteSession` |
| `useConfig` | Modo activo, config | `getConfig`, `setMode` |
| `useKeyboard` | Atajos globales | Ninguno (solo Ink stdin) |

### Dependencias internas
- `@agent/sdk` para toda comunicación con el server
- `zustand` para gestión de estado (Decisión 4B)
- `supports-color` para detección de soporte ANSI (Riesgo 2)
- `lib/ansi-windows.ts` para compatibilidad Windows

### Errores a manejar
| Error | Causa | Acción |
|-------|-------|--------|
| Server no disponible | Server no arrancado | Pantalla de error: "Server no disponible. Ejecuta `pnpm dev:server`" |
| Ollama no disponible | Error propagado del server | Pantalla de error en Modelos: "Ollama no está corriendo" |
| SSE se corta | Red, server crash | Mostrar "Conexión perdida. Presiona Enter para recargar" + resync |
| Terminal no soporta ANSI | Terminal antigua | Detectar con `supports-color`, modo sin colores + warning |
