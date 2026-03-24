# 03 — Estructura de Archivos Completa

Árbol del proyecto al terminar el MVP. Archivos no obvios tienen comentario explicativo.

```
agent/
├── .gitignore
├── .nvmrc                              # Pin a Node 20 LTS
├── .eslintrc.cjs                       # ESLint config compartida
├── turbo.json                          # Pipelines: build, dev, lint, typecheck
├── pnpm-workspace.yaml                 # Define packages/*
├── tsconfig.base.json                  # TypeScript config compartida (strict, ES2022)
├── package.json                        # Scripts raíz (dev, build, lint), devDependencies globales
├── README.md
├── MODELS.md                           # Tabla de compatibilidad de modelos probados
│
├── packages/
│   ├── shared/                         # ← NUEVO: Contratos compartidos entre server y SDK
│   │   ├── package.json                # name: @agent/shared, deps: zod
│   │   ├── tsconfig.json               # Extiende tsconfig.base.json
│   │   └── src/
│   │       ├── index.ts                # Re-exporta todo el API público
│   │       ├── schemas/
│   │       │   ├── models.ts           # Zod schemas para requests/responses de modelos
│   │       │   ├── sessions.ts         # Zod schemas para sesiones
│   │       │   ├── messages.ts         # Zod schemas para mensajes (un registro por pieza)
│   │       │   └── config.ts           # Zod schemas para configuración
│   │       ├── types/
│   │       │   ├── agent.ts            # Tipos: AgentResponse, ToolCallData, PermissionRequest
│   │       │   ├── sse-events.ts       # Tipos de eventos SSE con sequence number
│   │       │   ├── tools.ts            # Tipos: ToolSpec, ToolResult, ToolDefinition
│   │       │   └── provider.ts         # Tipos para abstracción de proveedores AI
│   │       └── constants/
│   │           ├── roles.ts            # 'user' | 'assistant' | 'tool_call' | 'tool_result'
│   │           ├── modes.ts            # 'plan' | 'build'
│   │           └── defaults.ts         # Max iterations, timeout, context threshold, etc.
│   │
│   ├── server/
│   │   ├── package.json                # deps: ai, @ai-sdk/openai, hono, drizzle-orm, cross-spawn
│   │   ├── tsconfig.json               # Extiende tsconfig.base.json
│   │   ├── drizzle.config.ts           # Config de Drizzle Kit para migraciones
│   │   ├── src/
│   │   │   ├── index.ts                # Entry point: crea app Hono, registra rutas, arranca server
│   │   │   ├── app.ts                  # Instancia Hono con middleware global (cors, logger, error handler)
│   │   │   │
│   │   │   ├── db/
│   │   │   │   ├── connection.ts       # Crea instancia better-sqlite3, path configurable
│   │   │   │   ├── schema.ts           # Definiciones Drizzle: sessions, messages, config, session_metadata
│   │   │   │   └── migrate.ts          # Ejecuta migraciones al arrancar el server
│   │   │   │
│   │   │   ├── ai/                     # ← RENOMBRADO de ollama/ — ahora usa Vercel AI SDK
│   │   │   │   ├── provider.ts         # Configura proveedor: createOpenAI({ baseURL: ollama/lmstudio })
│   │   │   │   ├── ollama-management.ts # Funciones directas Ollama: listModels, pullModel, showModel
│   │   │   │   └── types.ts            # Tipos específicos de Ollama API (pull progress, model info)
│   │   │   │
│   │   │   ├── agent/
│   │   │   │   ├── loop.ts             # Loop ReAct: usa streamText() del Vercel AI SDK
│   │   │   │   ├── prompt.ts           # System prompt del agente, templates de tool definitions
│   │   │   │   ├── parser.ts           # Fallback textual: regex estricta + validación Zod (Decisión 5)
│   │   │   │   ├── context.ts          # Compactación: metadata no compactable + prompt específico
│   │   │   │   └── permissions.ts      # Lógica de permisos: qué tools requieren confirmación en modo plan
│   │   │   │
│   │   │   ├── tools/
│   │   │   │   ├── registry.ts         # Mapa nombre→{schema, executor}, función registerTool()
│   │   │   │   ├── read-file.ts
│   │   │   │   ├── write-file.ts
│   │   │   │   ├── edit-file.ts
│   │   │   │   ├── bash.ts             # Ejecuta comando con detectShell(), captura stdout/stderr/exitCode
│   │   │   │   ├── list-files.ts       # Default depth=3, max=10, excluye node_modules/.git/dist/build
│   │   │   │   └── search-files.ts     # Grep recursivo, max 50 resultados
│   │   │   │
│   │   │   ├── routes/
│   │   │   │   ├── health.ts           # GET /health
│   │   │   │   ├── models.ts           # GET/POST /api/models, /api/models/pull, /api/models/active
│   │   │   │   ├── sessions.ts         # CRUD /api/sessions, /api/sessions/:id
│   │   │   │   ├── messages.ts         # POST /api/sessions/:id/messages (SSE streaming)
│   │   │   │   └── config.ts           # GET/POST /api/config, /api/config/mode
│   │   │   │
│   │   │   ├── middleware/
│   │   │   │   ├── error-handler.ts    # Middleware Hono para errores globales (Zod, DB, Ollama)
│   │   │   │   └── sse.ts             # Helper: abre SSE stream con sequence numbers
│   │   │   │
│   │   │   └── lib/
│   │   │       ├── config.ts           # Lee/escribe config del server (puerto, paths, defaults)
│   │   │       ├── logger.ts           # Logger con pino, nivel configurable
│   │   │       ├── paths.ts            # Resolución de paths: data dir, db path, según OS
│   │   │       └── shell.ts            # ← NUEVO: detectShell() pwsh→powershell→cmd (Decisión 3D)
│   │   │
│   │   ├── drizzle/                    # Carpeta auto-generada por Drizzle Kit
│   │   │   └── 0000_initial.sql        # Primera migración
│   │   │
│   │   └── tests/
│   │       ├── tools/
│   │       │   ├── read-file.test.ts
│   │       │   ├── write-file.test.ts
│   │       │   ├── edit-file.test.ts
│   │       │   ├── bash.test.ts        # Tests por cada shell detectada
│   │       │   ├── list-files.test.ts
│   │       │   └── search-files.test.ts
│   │       ├── ai/
│   │       │   └── provider.test.ts    # Test de configuración del proveedor AI
│   │       ├── agent-loop.test.ts
│   │       └── routes/
│   │           ├── health.test.ts
│   │           ├── models.test.ts
│   │           └── sessions.test.ts
│   │
│   ├── sdk/
│   │   ├── package.json                # deps: @agent/shared (no @agent/server)
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                # Re-exporta todo el API público
│   │       ├── client.ts              # Clase AgentClient: base URL, fetch wrapper, error handling
│   │       ├── models.ts              # listModels(), pullModel(), setActiveModel(), getActiveModel()
│   │       ├── sessions.ts            # createSession(), listSessions(), getSession(), deleteSession()
│   │       ├── messages.ts            # sendMessage() → retorna AsyncIterator de SSE events
│   │       ├── config.ts              # getConfig(), setMode()
│   │       ├── sse.ts                 # Helper: parsea stream SSE a AsyncIterator<Event> con sequence tracking
│   │       └── types.ts               # Re-exporta tipos de @agent/shared
│   │
│   └── tui/
│       ├── package.json                # deps: @agent/sdk, ink, zustand
│       ├── tsconfig.json
│       └── src/
│           ├── index.tsx               # Entry point: renderiza <App /> con Ink
│           ├── app.tsx                 # Layout principal: Header + TabBar + Router de pantallas
│           │
│           ├── components/
│           │   ├── header.tsx          # Muestra: modo activo, modelo seleccionado, sesión actual
│           │   ├── tab-bar.tsx         # Tabs: Modelos | Chat | Sesiones. Navegación con Tab key
│           │   ├── message-bubble.tsx  # Renderiza un mensaje (user/assistant) con formato, React.memo
│           │   ├── tool-call.tsx       # Muestra tool call en progreso: nombre, args, spinner, React.memo
│           │   ├── progress-bar.tsx    # Barra de progreso genérica (usada en pull de modelos)
│           │   ├── confirm-dialog.tsx  # Dialog Sí/No para permisos en modo plan
│           │   ├── spinner.tsx         # Indicador de loading animado
│           │   └── text-input.tsx      # Wrapper de ink-text-input con estilos
│           │
│           ├── screens/
│           │   ├── models.tsx          # Lista modelos, pull, selección de activo, info de tamaño
│           │   ├── chat.tsx            # Input + mensajes + streaming + confirmación de permisos
│           │   └── sessions.tsx        # Lista sesiones, seleccionar, borrar
│           │
│           ├── hooks/
│           │   ├── use-models.ts       # Hook: fetch modelos, pull con progreso, set activo
│           │   ├── use-chat.ts         # Hook: enviar mensaje, recibir SSE con throttle 50ms, resync
│           │   ├── use-sessions.ts     # Hook: CRUD de sesiones
│           │   ├── use-config.ts       # Hook: leer/escribir config (modo, etc.)
│           │   └── use-keyboard.ts     # Hook: atajos de teclado globales (Tab, Ctrl+M, etc.)
│           │
│           ├── lib/
│           │   ├── ansi-windows.ts     # Activa VT processing + supports-color detection
│           │   └── format.ts           # Formateadores: markdown simplificado, colores por tipo de mensaje
│           │
│           └── store/                  # ← CAMBIADO: ahora usa Zustand (Decisión 4B)
│               └── app-store.ts        # Store Zustand: pantalla activa, modelo, modo, sesión, conexión
│
├── scripts/                            # ← NUEVO: scripts de validación y testing
│   ├── test-models.ts                  # Prueba tool calling con modelos populares
│   ├── test-ansi.ts                    # Verifica compatibilidad ANSI del terminal
│   └── test-compaction.ts              # Test de regresión de compactación
│
├── cmd/                                # Binarios Go (IGNORADO en MVP — ver inconsistencia resuelta #1)
│   ├── go.mod
│   ├── go.sum
│   ├── search/
│   │   └── main.go                     # Búsqueda rápida en filesystem (ripgrep-like)
│   └── fswatch/
│       └── main.go                     # File watcher eficiente
│
└── data/                               # Creada en runtime, gitignored
    └── agent.db                        # SQLite database
```

## Notas sobre la estructura

1. **`packages/shared/`** es el nuevo package de contratos compartidos (Decisión 2B). Contiene Zod schemas, tipos TypeScript e interfaces que usan tanto el server como el SDK. Resuelve el problema de acoplamiento semántico (el SDK no depende del server).

2. **`packages/server/src/ai/`** reemplaza al antiguo `ollama/`. Contiene la configuración del Vercel AI SDK (`provider.ts`) y las funciones de gestión directa de Ollama (`ollama-management.ts`) que no tienen equivalente en el SDK (listar modelos, pull, show).

3. **`packages/tui/src/store/app-store.ts`** usa Zustand (Decisión 4B) en vez de React Context + useReducer. API más limpia, menos re-renders, ~1KB.

4. **`packages/server/src/lib/shell.ts`** implementa `detectShell()` (Decisión 3D) que detecta `pwsh` → `powershell` → `cmd` en Windows y `bash` → `sh` en Linux.

5. **`scripts/`** contiene scripts de validación ejecutables para mitigación de riesgos: testing de modelos, compatibilidad ANSI, y regresión de compactación.

6. **`data/`** no se commitea. El path real depende del OS y se resuelve en `packages/server/src/lib/paths.ts`. En desarrollo se usa `./data/`, en producción se usa un directorio en `$HOME/.local/share/agent/` (Linux) o `%APPDATA%\agent\` (Windows).

7. **`cmd/`** es independiente del monorepo Node y se **ignora en el MVP** (inconsistencia #1 resuelta). Las tools se implementan en Node puro.

8. **Cada tool en `packages/server/src/tools/`** exporta una interfaz uniforme: `{ name, description, schema: ZodSchema, execute: (params) => Promise<ToolResult> }`. El registry las registra todas al arrancar. Los schemas Zod de los tools también se usan directamente con `streamText({ tools })` del Vercel AI SDK.
