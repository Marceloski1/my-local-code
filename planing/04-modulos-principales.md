# 04 — Módulos Principales

Detalle técnico de cada módulo: responsabilidad, interfaz pública, dependencias internas y manejo de errores.

---

## 1. `packages/server` — Módulo DB (`db/`)

### Responsabilidad
Gestionar la conexión a SQLite y exponer el schema Drizzle. Ejecutar migraciones automáticamente al arrancar.

### Interfaz pública
```typescript
// connection.ts
export function getDb(): BetterSQLite3Database;
export function closeDb(): void;

// schema.ts
export const sessions: SQLiteTable;   // id, title, createdAt, updatedAt
export const messages: SQLiteTable;   // id, sessionId, role, content, toolName, toolArgs, toolResult, createdAt
export const config: SQLiteTable;     // key (unique), value (JSON string)

// migrate.ts
export function runMigrations(): void;
```

### Dependencias internas
- `lib/paths.ts` para resolver la ruta del archivo `.db`

### Errores a manejar
| Error | Causa | Acción |
|-------|-------|--------|
| `SQLITE_CANTOPEN` | Path no existe o sin permiso | Crear directorio padre con `mkdirSync(recursive)`. Si falla, exit con mensaje claro |
| `SQLITE_CORRUPT` | DB corrupta | Log error, ofrecer path para backup, crear nueva DB |
| `SQLITE_LOCKED` | Otro proceso usa la DB | Improbable (single client), pero retry 3 veces con backoff |
| Migration falla | Schema incompatible | Log el SQL que falló, exit con instrucciones de recuperación |

---

## 2. `packages/server` — Cliente Ollama (`ollama/`)

### Responsabilidad
Comunicación exclusiva con la API REST de Ollama. Ningún otro módulo habla directo con Ollama.

### Interfaz pública
```typescript
// client.ts
export async function listModels(): Promise<OllamaModel[]>;
export async function showModel(name: string): Promise<OllamaModelInfo>;  // incluye context_length
export async function pullModel(name: string, onProgress: (event: PullProgress) => void): Promise<void>;
export async function chat(params: {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  onToken: (token: string) => void;
  signal?: AbortSignal;
}): Promise<ChatResponse>;

// types.ts
export interface OllamaModel { name: string; size: number; modifiedAt: string; }
export interface OllamaModelInfo { context_length: number; parameters: string; /* ... */ }
export interface PullProgress { status: string; completed?: number; total?: number; }
export interface ChatMessage { role: 'system' | 'user' | 'assistant' | 'tool'; content: string; }
export interface ChatResponse { message: ChatMessage; done: boolean; totalDuration?: number; }
export interface ToolDefinition { type: 'function'; function: { name: string; description: string; parameters: object; } }
```

### Dependencias internas
- `lib/logger.ts` para logging de requests/responses

### Errores a manejar
| Error | Causa | Acción |
|-------|-------|--------|
| `ECONNREFUSED` en `:11434` | Ollama no está corriendo | Retornar error tipado `OllamaNotAvailable`. La ruta que llama debe decidir si enviar mensaje a la TUI |
| Timeout (>120s sin token) | Modelo muy lento o colgado | AbortController con timeout configurable, retornar `OllamaTimeout` |
| 404 en modelo | Modelo no descargado | Retornar `ModelNotFound` con el nombre para que la UI sugiera descargarlo |
| Stream corta inesperadamente | Ollama crashea mid-response | Detectar stream incompleto, retornar `OllamaStreamError` con respuesta parcial |
| Pull falla midway | Disco lleno, red cortada | Llamar `onProgress` con status `"error"` y detalle del error |

---

## 3. `packages/server` — Tools del Agente (`tools/`)

### Responsabilidad
Cada tool ejecuta una acción atómica sobre el filesystem o el shell. Todos siguen la misma interfaz. El registry los agrupa.

### Interfaz pública
```typescript
// registry.ts
export interface ToolSpec {
  name: string;
  description: string;         // Para el system prompt del LLM
  schema: ZodSchema;           // Validación de parámetros
  requiresPermission: boolean; // true para write_file, edit_file, bash
  execute: (params: unknown) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  output: string;              // Siempre string para inyectar en el contexto del LLM
  error?: string;
}

export function getToolRegistry(): Map<string, ToolSpec>;
export function executeTool(name: string, params: unknown): Promise<ToolResult>;
export function getToolDefinitions(): ToolDefinition[];  // Para el system prompt
```

### Detalle por tool

| Tool | Params | Permisos | Notas |
|------|--------|----------|-------|
| `read_file` | `{ path: string }` | No | Lee con `utf-8`. Si el archivo es >100KB, trunca y avisa |
| `write_file` | `{ path, content }` | **Sí** | Crea directorios padres. Sobreescribe si existe |
| `edit_file` | `{ path, old_str, new_str }` | **Sí** | Reemplaza primera ocurrencia. Error si `old_str` no se encuentra |
| `bash` | `{ command: string }` | **Sí** | Timeout 30s default. Shell: `cmd.exe` en Windows, `/bin/sh` en Linux |
| `list_files` | `{ path, maxDepth? }` | No | Default depth 3. Ignora node_modules, .git. Retorna árbol como texto |
| `search_files` | `{ pattern, path, caseSensitive? }` | No | Grep recursivo, 3 líneas contexto. Máximo 50 resultados |

### Dependencias internas
- Solo `node:fs`, `node:child_process`, `node:path`
- `lib/paths.ts` para normalización de paths cross-platform

### Errores a manejar
| Error | Causa | Acción |
|-------|-------|--------|
| `ENOENT` | Archivo/directorio no existe | `{ success: false, output: "", error: "File not found: /path" }` |
| `EACCES` | Sin permisos | `{ success: false, output: "", error: "Permission denied: /path" }` |
| `EPERM` en Windows | Archivo bloqueado por otro proceso | Misma respuesta que `EACCES` |
| Timeout en bash | Comando tarda >30s | Kill el proceso, retornar output parcial + error timeout |
| Shell no encontrada | Configuración rara | Fallback a `/bin/bash` → `/bin/sh` en Linux, `powershell.exe` → `cmd.exe` en Windows |
| Output excesivo | `bash` genera GB de output | Limitar captura a 50KB, truncar y avisar |

---

## 4. `packages/server` — Loop del Agente (`agent/`)

### Responsabilidad
Orquestrar el ciclo ReAct completo: recibir mensaje del usuario, razonar con el LLM, ejecutar tools, iterar hasta respuesta final. Gestionar modos y compactación de contexto.

### Interfaz pública
```typescript
// loop.ts
export interface AgentConfig {
  model: string;
  mode: 'plan' | 'build';
  maxIterations: number;            // Default 25, evita loops infinitos
  contextCompactionThreshold: number; // Default 0.75
}

export interface AgentResponse {
  type: 'token' | 'tool_call' | 'tool_result' | 'permission_request' | 'done' | 'error' | 'compaction';
  data: string | ToolCallData | PermissionRequest;
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
  keepRecent: number,  // Mensajes recientes a preservar intactos
): Promise<ChatMessage[]>;

// permissions.ts
export function requiresPermission(toolName: string, mode: 'plan' | 'build'): boolean;

// prompt.ts
export function buildSystemPrompt(tools: ToolDefinition[], mode: 'plan' | 'build'): string;
```

### Dependencias internas
- `ollama/client.ts` — para llamar al LLM
- `tools/registry.ts` — para ejecutar tools
- `db/` — para persistir mensajes
- `lib/logger.ts`

### Flujo del loop
```
1. Cargar historial de messages de la sesión (DB)
2. Append userMessage al historial
3. Verificar tokens: si > 75% del context_length → compactar
4. Construir prompt: system + historial + tool definitions
5. Llamar a Ollama con streaming
6. Parsear respuesta:
   a. Si es respuesta final → yield {type: 'done', data} → FIN
   b. Si es tool call → yield {type: 'tool_call', data}
      - Si modo plan y tool requiere permiso → yield {type: 'permission_request'}
        - Esperar respuesta del usuario
        - Si rechaza → append "User denied permission" → goto 4
      - Ejecutar tool → yield {type: 'tool_result', data}
      - Append resultado al historial → goto 3
7. Si iteraciones > maxIterations → yield {type: 'error', "Max iterations"} → FIN
```

### Errores a manejar
| Error | Causa | Acción |
|-------|-------|--------|
| Ollama falla mid-stream | Crash, OOM | Yield error con respuesta parcial, guardar en DB |
| Tool falla | Cualquier error del tool | Inyectar error como tool_result, dejar que el LLM decida (suele auto-corregir) |
| Max iteraciones | LLM en loop | Yield error y último estado del contexto |
| Parsing falla | LLM genera formato inesperado | Tratar toda la respuesta como texto plano (respuesta final) |
| Compactación falla | Ollama falla al resumir | Skip compactación, continuar con historial completo, warn en logs |

---

## 5. `packages/server` — Rutas HTTP (`routes/`)

### Responsabilidad
Definir endpoints REST y SSE. Validar input con Zod. Delegar lógica a los módulos correspondientes. No contener lógica de negocio.

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
| POST | `/api/sessions/:id/messages` | `{ content: string }` | SSE stream: `AgentResponse` events |

#### Config
| Método | Ruta | Request | Response |
|--------|------|---------|----------|
| GET | `/api/config` | — | `{ mode, activeModel, ... }` |
| POST | `/api/config/mode` | `{ mode: 'plan' \| 'build' }` | `{ ok: true }` |

### Dependencias internas
- Cada ruta importa del módulo que necesita: `ollama/`, `agent/`, `db/`
- `middleware/sse.ts` para las rutas SSE
- `schemas/` para validación con Zod

---

## 6. `packages/sdk` — Cliente HTTP

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
- `sse.ts` helper local para parsear SSE
- Tipos re-exportados de `packages/server/src/schemas/` (o de un barrel compartido)

### Errores a manejar
| Error | Causa | Acción |
|-------|-------|--------|
| `ECONNREFUSED` en `:4096` | Server no corriendo | Throw `ServerNotAvailable` con mensaje descriptivo |
| HTTP 4xx | Validación, not found | Throw error tipado con status y body parseado |
| HTTP 5xx | Error del server | Throw `ServerError` con detalle |
| SSE se cierra inesperadamente | Server crashea, timeout | El AsyncIterable termina, consumidor decide si reintentar |
| JSON parse falla | Respuesta malformada | Throw `InvalidResponse` con body raw |

---

## 7. `packages/tui` — Aplicación terminal

### Responsabilidad
Renderizar la interfaz de usuario en la terminal. Gestionar input del usuario. Consumir datos del SDK. No contiene lógica de negocio.

### Módulos internos

#### `app.tsx`
- Layout principal: `<Box flexDirection="column">`
- Renderiza `<Header>`, `<TabBar>`, y la pantalla activa
- Gestiona estado global con React context

#### `screens/models.tsx`
- Muestra lista de modelos con `useModels()` hook
- Input para pull de nuevo modelo
- Indicador de modelo activo (★)
- Barra de progreso durante pull

#### `screens/chat.tsx`
- Scrollable message list
- Input de texto con `<TextInput>` de ink-text-input
- Streaming: tokens aparecen uno a uno actualizando el último mensaje assistant
- Tool calls se muestran inline como bloques expandibles
- Dialog de confirmación cuando el agente pide permiso (modo plan)
- Scroll automático al final cuando llegan nuevos tokens

#### `screens/sessions.tsx`
- Lista de sesiones con fecha y preview
- Seleccionar para continuar
- Delete con confirmación

#### Hooks
| Hook | Responsabilidad | SDK calls que usa |
|------|----------------|-------------------|
| `useModels` | Lista, pull, selección de modelo | `listModels`, `pullModel`, `setActiveModel` |
| `useChat` | Enviar mensaje, recibir stream, estado | `sendMessage` |
| `useSessions` | CRUD sesiones | `createSession`, `listSessions`, `getSession`, `deleteSession` |
| `useConfig` | Modo activo, config | `getConfig`, `setMode` |
| `useKeyboard` | Atajos globales | Ninguno (solo Ink stdin) |

### Dependencias internas
- `@agent/sdk` para toda comunicación con el server
- `lib/ansi-windows.ts` para compatibilidad Windows

### Errores a manejar
| Error | Causa | Acción |
|-------|-------|--------|
| Server no disponible | Server no arrancado | Pantalla de error: "Server no disponible. Ejecuta `pnpm dev:server`" |
| Ollama no disponible | Error propagado del server | Pantalla de error en Modelos: "Ollama no está corriendo" |
| SSE se corta | Red, server crash | Mostrar "Conexión perdida" en el chat, botón para reintentar |
| Terminal no soporta colores | Terminal antigua | Detectar con `process.stdout.isTTY`, forzar ANSI si es Windows Terminal/ConEmu |
