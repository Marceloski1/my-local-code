# 02 — Fases de Desarrollo

Cada fase termina con algo **funcionando y demostrable**. No se avanza a la siguiente fase sin validar la anterior.

---

## Fase 0 — Scaffold del monorepo
**Duración estimada:** 1 día

### Se construye
- Repositorio Git inicializado
- `pnpm-workspace.yaml` con **cuatro** packages: `packages/server`, `packages/tui`, `packages/sdk`, **`packages/shared`** (Decisión 2B)
- `turbo.json` con pipelines: `build`, `dev`, `lint`, `typecheck`
- `tsconfig.base.json` compartido (target ES2022, moduleResolution bundler, strict)
- ESLint config compartida
- `.gitignore`, `.nvmrc` (Node 20 LTS), `README.md`
- Scripts raíz: `pnpm dev` (arranca server + tui), `pnpm build`, `pnpm lint`
- **`packages/shared`** con Zod schemas iniciales, tipos base, y constantes (roles, modos, defaults)
- Carpeta `cmd/` con un `go.mod` placeholder (ignorado en MVP)
- Carpeta `scripts/` para scripts de validación

### Demostrable al final
- `pnpm install` → no errores
- `pnpm turbo build` → pipeline ejecuta, `@agent/shared` se compila primero
- Importar tipos de `@agent/shared` en `@agent/server` → funciona sin errores
- Estructura visible con `tree`

---

## Fase 1 — Servidor base + DB + Vercel AI SDK
**Duración estimada:** 3-4 días

### Se construye
- Hono server en `packages/server` con `@hono/node-server`
- `GET /health` → `{ status: "ok", timestamp }`
- Schema Drizzle: tablas `sessions`, `messages`, `config`, **`session_metadata`** (mitigación Riesgo 4)
- Capa de migraciones (Drizzle Kit)
- **Módulo `ai/provider.ts`**: configuración del Vercel AI SDK con `createOpenAI({ baseURL })` apuntando a Ollama
- **Módulo `ai/ollama-management.ts`**: `listModels()`, `pullModel()`, `showModel()` con fetch directo a Ollama
- Capa SSE reutilizable (`middleware/sse.ts`) **con sequence numbers**
- Rutas de modelos:
  - `GET /api/models`
  - `POST /api/models/pull` (SSE con progreso)
  - `GET /api/models/active`
  - `POST /api/models/active`
- Validación de inputs con Zod schemas de `@agent/shared`

### Demostrable al final
- Server arranca en `:4096`
- `curl /health` → 200
- `curl /api/models` → lista modelos de Ollama
- Hacer pull de un modelo pequeño vía curl, ver eventos SSE con progreso y sequence numbers
- Cambiar modelo activo, reiniciar server, verificar que persiste en SQLite
- Test manual: `generateText()` con Vercel AI SDK + modelo de Ollama → respuesta correcta

---

## Fase 2 — SDK + TUI shell + pantalla de Modelos
**Duración estimada:** 3-4 días

### Se construye
- `packages/sdk`: cliente tipado con funciones para cada endpoint
  - **Importa tipos de `@agent/shared`** (Decisión 2B, NO de `@agent/server`)
  - Helpers para consumir SSE desde el cliente **con tracking de sequence numbers**
- `packages/tui`: aplicación Ink base
  - Layout: Header + TabBar + ContentArea
  - Navegación con Tab entre 3 pantallas
  - **Estado global con Zustand** (Decisión 4B)
  - Pantalla de Modelos completa:
    - Lista de modelos descargados con indicador de activo y **tamaño/parámetros** (mitigación Riesgo 7)
    - Input para nombre de modelo a descargar
    - Barra de progreso de descarga (datos vía SSE a través del SDK)
    - Selector de modelo activo
  - Pantallas de Chat y Sesiones como placeholders
  - Manejo de ANSI colors en Windows: **`supports-color` + detección VT** (mitigación Riesgo 2)
- Ejecutar `scripts/test-ansi.ts` en Windows Terminal, PowerShell 7, cmd.exe

### Demostrable al final
- `pnpm dev` arranca server + TUI simultáneamente
- La TUI muestra header con "Modo: plan | Modelo: ninguno"
- Tab navega entre las tres pestañas
- En pantalla Modelos: se ven modelos con tamaño, se puede descargar uno nuevo con barra de progreso, se puede seleccionar modelo activo
- Funciona en Windows Terminal y en una terminal Linux

---

## Fase 3 — Tools del agente + loop ReAct
**Duración estimada:** 5-7 días

### Se construye
- **`lib/shell.ts`** con `detectShell()` — detección `pwsh` → `powershell` → `cmd` (Decisión 3D)
- 6 tools implementados y testeados unitariamente:
  - `read_file(path)` — lee contenido, trunca si >100KB
  - `write_file(path, content)` — crea/sobreescribe archivo
  - `edit_file(path, old_str, new_str)` — reemplaza primera ocurrencia
  - `bash(command)` — ejecuta con shell detectada, timeout 30s, `cross-spawn`
  - `list_files(path)` — default depth 3, max 10, excluye node_modules/.git/dist/build
  - `search_files(pattern, path)` — grep con contexto, max 50 resultados
- Registro de tools (`tool-registry.ts`):
  - Formato interno: `ToolSpec` con schema Zod + función ejecutora
  - **Formato Vercel AI SDK**: `tool()` wrapper para `streamText({ tools })`
- System prompt del agente con instrucciones de ReAct, definiciones de tools, **e info de OS/shell**
- **`agent/parser.ts`**: parser textual con regex estricta + validación Zod (Decisión 5: A+C)
- Loop del agente (`agent/loop.ts`):
  - Construye prompt con sistema + historial + tools
  - Llama al LLM **via `streamText()` del Vercel AI SDK** con tools nativos
  - **Enfoque híbrido (Decisión 1C)**: si tools nativos fallan 3 veces → switch a textual
  - Detecta tool calls, ejecuta, appende resultado
  - Itera hasta respuesta final o max iteraciones
  - Modo plan: verifica permisos antes de tools destructivos (timeout 5min, Decisión 6)
  - Modo build: ejecuta con **delay 500ms** entre destructivos (inconsistencia #3)
  - **Detección de loops**: misma tool call 3 veces → parar
- Compactación de contexto:
  - Calcula tokens aproximados del historial
  - Al 75% del context_length del modelo, compacta mensajes antiguos
  - **Metadata no compactable** en `session_metadata` (mitigación Riesgo 4)
  - **Prompt de compactación específico** (no genérico)
- Persistencia: cada mensaje (un registro por pieza, Decisión 7A) se guarda en SQLite

### Demostrable al final
- Script: crear sesión → enviar "lee el archivo X" → el agente usa `read_file` → retorna contenido
- Script: enviar "crea un archivo hello.txt" en modo plan → pide confirmación
- Script: en modo build → ejecuta con delay de 500ms, sin pedir permiso
- Verificar que el historial se persiste: reiniciar server, cargar sesión, el contexto previo está ahí
- **`scripts/test-models.ts`**: probar tool calling con 4+ modelos, generar tabla de compatibilidad
- **`scripts/test-compaction.ts`**: enviar 50+ mensajes, verificar compactación preserva metadata

---

## Fase 4 — Endpoints de chat/sesiones + TUI Chat + Sesiones
**Duración estimada:** 5-6 días

### Se construye
- Endpoints de server:
  - `POST /api/sessions` → nueva sesión
  - `GET /api/sessions` → listar
  - `GET /api/sessions/:id` → detalle con mensajes
  - `DELETE /api/sessions/:id` → borrar
  - `POST /api/sessions/:id/messages` → enviar mensaje, SSE con tokens y sequence
  - `POST /api/sessions/:id/permission` → respuesta de permisos (Decisión 6)
  - `POST /api/config/mode` → cambiar plan/build
  - `GET /api/config` → config actual
- SDK actualizado con los nuevos endpoints + `resync()` para recuperación de estado
- Pantalla de Chat en TUI:
  - Área de mensajes scrollable
  - Input de texto con ink-text-input
  - Tokens del agente con **throttle 50ms** (mitigación Riesgo 6)
  - Indicador visual de tool calls en ejecución (**React.memo**)
  - Dialog de confirmación de permisos en modo plan (Sí/No)
  - Indicador de modo actual que cambia de color (plan=amarillo, build=rojo)
  - **Resync después de desconexión** (mitigación Riesgo 5)
- Pantalla de Sesiones en TUI:
  - Lista de sesiones con fecha y preview del primer mensaje
  - Seleccionar sesión para continuar la conversación
  - Borrar sesión con confirmación
- Atajo de teclado en TUI para cambiar de modo (ej: Ctrl+M)
- **Benchmark**: `scripts/test-ink-perf.ts` con 100+ mensajes (mitigación Riesgo 6)

### Demostrable al final
- Flujo completo end-to-end:
  1. Abrir TUI, seleccionar modelo en pantalla Modelos
  2. Ir a Chat, escribir "lista los archivos en el directorio actual"
  3. Ver tokens aparecer en tiempo real (throttled a 50ms)
  4. Ver el agente usar `list_files`, mostrar resultado
  5. En modo plan, el agente pide permiso para `bash`
  6. Ir a Sesiones, ver la sesión guardada
  7. Cerrar y reabrir, la sesión sigue ahí
  8. Simular desconexión SSE, verificar resync

---

## Fase 5 — Pulido, edge cases y validación
**Duración estimada:** 3-4 días

### Se construye
- Manejo robusto de errores en toda la cadena:
  - Ollama no disponible → mensaje claro en TUI
  - Modelo no descargado → redirect a pantalla Modelos
  - Tool falla → el error se inyecta como resultado y el agente decide qué hacer
  - Conexión SSE se corta → banner de error + resync
  - **Modelo muy grande** → warning visual + health check post-error (mitigación Riesgo 7)
- Graceful shutdown del server (SIGINT, SIGTERM)
- CLI wrapper: `npx @agent/tui` o un script que arranca server + tui
- Logging estructurado (pino) con niveles configurables
- **Generar `MODELS.md`** con tabla de compatibilidad de modelos probados
- **Validación cross-platform completa** en Windows y Linux
- **Opcional post-MVP:** binarios Go en `cmd/` (ignorados en MVP, inconsistencia #1)

### Demostrable al final
- MVP completo funcional
- Manejo graceful de todos los errores comunes
- Funciona en Windows y Linux
- Se puede instalar y usar sin instrucciones más allá de "instala Ollama, instala Node, clona, pnpm install, pnpm dev"
- `MODELS.md` documenta qué modelos funcionan y con qué nivel de calidad

---

## Resumen de timeline

| Fase | Días estimados | Acumulado |
|------|---------------|-----------|
| 0 — Scaffold + Shared | 1 | 1 |
| 1 — Server + DB + Vercel AI SDK | 3-4 | 4-5 |
| 2 — SDK + TUI + Modelos (Zustand) | 3-4 | 7-9 |
| 3 — Tools (detectShell) + Loop ReAct (híbrido) | 5-7 | 12-16 |
| 4 — Chat + Sesiones (throttle, resync) | 5-6 | 17-22 |
| 5 — Pulido + Validación | 3-4 | 20-26 |

**Total estimado: 20-26 días de desarrollo** para un desarrollador full-time.
