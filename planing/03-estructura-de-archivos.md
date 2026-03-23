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
│
├── packages/
│   ├── server/
│   │   ├── package.json
│   │   ├── tsconfig.json               # Extiende tsconfig.base.json
│   │   ├── drizzle.config.ts           # Config de Drizzle Kit para migraciones
│   │   ├── src/
│   │   │   ├── index.ts                # Entry point: crea app Hono, registra rutas, arranca server
│   │   │   ├── app.ts                  # Instancia Hono con middleware global (cors, logger, error handler)
│   │   │   │
│   │   │   ├── db/
│   │   │   │   ├── connection.ts       # Crea instancia better-sqlite3, path configurable
│   │   │   │   ├── schema.ts           # Definiciones Drizzle: sessions, messages, config
│   │   │   │   └── migrate.ts          # Ejecuta migraciones al arrancar el server
│   │   │   │
│   │   │   ├── ollama/
│   │   │   │   ├── client.ts           # Funciones: listModels, pullModel, chat, showModel
│   │   │   │   └── types.ts            # Tipos de la API de Ollama (model info, chat response, etc.)
│   │   │   │
│   │   │   ├── agent/
│   │   │   │   ├── loop.ts             # Loop ReAct principal: reason → tool → observe → repeat
│   │   │   │   ├── prompt.ts           # System prompt del agente, templates de tool definitions
│   │   │   │   ├── parser.ts           # Parsea la respuesta del LLM: extrae tool calls o respuesta final
│   │   │   │   ├── context.ts          # Compactación de contexto: calcula tokens, invoca resumen
│   │   │   │   └── permissions.ts      # Lógica de permisos: qué tools requieren confirmación en modo plan
│   │   │   │
│   │   │   ├── tools/
│   │   │   │   ├── registry.ts         # Mapa nombre→{schema, executor}, función registerTool()
│   │   │   │   ├── read-file.ts
│   │   │   │   ├── write-file.ts
│   │   │   │   ├── edit-file.ts
│   │   │   │   ├── bash.ts             # Ejecuta comando en shell, captura stdout/stderr/exitCode
│   │   │   │   ├── list-files.ts
│   │   │   │   └── search-files.ts     # Grep recursivo, opcionalmente delega a binario Go
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
│   │   │   │   └── sse.ts             # Helper: abre SSE stream, retorna sendEvent función
│   │   │   │
│   │   │   ├── schemas/
│   │   │   │   ├── models.ts           # Zod schemas para requests/responses de modelos
│   │   │   │   ├── sessions.ts         # Zod schemas para sesiones
│   │   │   │   ├── messages.ts         # Zod schemas para mensajes
│   │   │   │   └── config.ts           # Zod schemas para configuración
│   │   │   │
│   │   │   └── lib/
│   │   │       ├── config.ts           # Lee/escribe config del server (puerto, paths, defaults)
│   │   │       ├── logger.ts           # Logger con pino, nivel configurable
│   │   │       └── paths.ts            # Resolución de paths: data dir, db path, según OS
│   │   │
│   │   ├── drizzle/                    # Carpeta auto-generada por Drizzle Kit
│   │   │   └── 0000_initial.sql        # Primera migración
│   │   │
│   │   └── tests/
│   │       ├── tools/
│   │       │   ├── read-file.test.ts
│   │       │   ├── write-file.test.ts
│   │       │   ├── edit-file.test.ts
│   │       │   ├── bash.test.ts
│   │       │   ├── list-files.test.ts
│   │       │   └── search-files.test.ts
│   │       ├── ollama-client.test.ts
│   │       ├── agent-loop.test.ts
│   │       └── routes/
│   │           ├── health.test.ts
│   │           ├── models.test.ts
│   │           └── sessions.test.ts
│   │
│   ├── sdk/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                # Re-exporta todo el API público
│   │       ├── client.ts              # Clase AgentClient: base URL, fetch wrapper, error handling
│   │       ├── models.ts              # listModels(), pullModel(), setActiveModel(), getActiveModel()
│   │       ├── sessions.ts            # createSession(), listSessions(), getSession(), deleteSession()
│   │       ├── messages.ts            # sendMessage() → retorna AsyncIterator de SSE events
│   │       ├── config.ts              # getConfig(), setMode()
│   │       ├── sse.ts                 # Helper: parsea stream SSE a AsyncIterator<Event>
│   │       └── types.ts               # Re-exporta tipos Zod inferidos del server
│   │
│   └── tui/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.tsx               # Entry point: renderiza <App /> con Ink
│           ├── app.tsx                 # Layout principal: Header + TabBar + Router de pantallas
│           │
│           ├── components/
│           │   ├── header.tsx          # Muestra: modo activo, modelo seleccionado, sesión actual
│           │   ├── tab-bar.tsx         # Tabs: Modelos | Chat | Sesiones. Navegación con Tab key
│           │   ├── message-bubble.tsx  # Renderiza un mensaje (user/assistant) con formato
│           │   ├── tool-call.tsx       # Muestra tool call en progreso: nombre, args, spinner
│           │   ├── progress-bar.tsx    # Barra de progreso genérica (usada en pull de modelos)
│           │   ├── confirm-dialog.tsx  # Dialog Sí/No para permisos en modo plan
│           │   ├── spinner.tsx         # Indicador de loading animado
│           │   └── text-input.tsx      # Wrapper de ink-text-input con estilos
│           │
│           ├── screens/
│           │   ├── models.tsx          # Lista modelos, pull, selección de activo
│           │   ├── chat.tsx            # Input + mensajes + streaming + confirmación de permisos
│           │   └── sessions.tsx        # Lista sesiones, seleccionar, borrar
│           │
│           ├── hooks/
│           │   ├── use-models.ts       # Hook: fetch modelos, pull con progreso, set activo
│           │   ├── use-chat.ts         # Hook: enviar mensaje, recibir SSE, estado de streaming
│           │   ├── use-sessions.ts     # Hook: CRUD de sesiones
│           │   ├── use-config.ts       # Hook: leer/escribir config (modo, etc.)
│           │   └── use-keyboard.ts     # Hook: atajos de teclado globales (Tab, Ctrl+M, etc.)
│           │
│           ├── lib/
│           │   ├── ansi-windows.ts     # Activa VT processing en Windows si cmd.exe lo necesita
│           │   └── format.ts           # Formateadores: markdown simplificado, colores por tipo de mensaje
│           │
│           └── store/
│               └── app-state.ts        # Estado global simple: pantalla activa, modelo, modo, sesión
│
├── cmd/                                # Binarios Go (opcionales para MVP)
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

1. **Los schemas Zod en `packages/server/src/schemas/`** sirven doble propósito: validan input en el server y se re-exportan para que el SDK los use como tipos. Esto evita duplicar definiciones de tipos.

2. **`packages/tui/src/store/app-state.ts`** es un store minimalista (posiblemente un simple React context + reducer), no se necesita una librería de estado para la TUI.

3. **`data/`** no se commitea. El path real depende del OS y se resuelve en `packages/server/src/lib/paths.ts`. En desarrollo se usa `./data/`, en producción se usa un directorio en `$HOME/.local/share/agent/` (Linux) o `%APPDATA%\agent\` (Windows).

4. **`cmd/`** es independiente del monorepo Node. Tiene su propio `go.mod`. Los binarios se compilan aparte y se colocan en un lugar que el server pueda encontrar.

5. **Cada tool en `packages/server/src/tools/`** exporta una interfaz uniforme: `{ name, description, schema: ZodSchema, execute: (params) => Promise<ToolResult> }`. El registry las registra todas al arrancar.
