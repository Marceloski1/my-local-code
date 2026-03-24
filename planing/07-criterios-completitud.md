# 07 — Criterios de Completitud del MVP

Checklist verificable. Cada ítem es una condición binaria: pasa o no pasa. El MVP está completo cuando **todos** los ítems están marcados.

---

## Infraestructura

- [ ] El monorepo se clona, `pnpm install` termina sin errores
- [ ] `pnpm build` compila los **4** packages sin errores de TypeScript (`shared`, `server`, `sdk`, `tui`)
- [ ] `pnpm dev` arranca el server en `:4096` y la TUI simultáneamente
- [ ] El server crea la DB SQLite automáticamente en la primera ejecución
- [ ] Las migraciones se ejecutan automáticamente al arrancar el server
- [ ] `packages/shared` se compila primero y sus tipos se importan correctamente en server y SDK

---

## Shared — Contratos compartidos

- [ ] Los Zod schemas de `@agent/shared` validan correctamente requests/responses de todas las rutas
- [ ] Los tipos TypeScript de `@agent/shared` se usan en server, SDK y TUI sin duplicación
- [ ] Las constantes (defaults, roles, modos) se importan desde `@agent/shared` en todos los packages

---

## Servidor — Health y configuración

- [ ] `GET /health` retorna `200` con `{ status: "ok" }` cuando el server está arriba
- [ ] `GET /health` indica si Ollama está disponible o no, sin crashear
- [ ] `GET /api/config` retorna la configuración actual (modo, modelo activo)
- [ ] `POST /api/config/mode` cambia entre `plan` y `build`, persiste en DB
- [ ] Reiniciar el server preserva la configuración

---

## Servidor — Modelos (via Ollama management + Vercel AI SDK)

- [ ] `GET /api/models` retorna la lista de modelos descargados en Ollama
- [ ] `GET /api/models` retorna error descriptivo si Ollama no está corriendo (no 500 genérico)
- [ ] `POST /api/models/pull` con `{ name: "tinyllama" }` inicia descarga y retorna SSE con progreso
- [ ] Los eventos SSE de pull incluyen `completed` y `total` (bytes) para calcular porcentaje
- [ ] `POST /api/models/active` guarda el modelo activo en SQLite
- [ ] `GET /api/models/active` retorna el modelo guardado (o null si ninguno)

---

## Servidor — Sesiones

- [ ] `POST /api/sessions` crea una sesión con ID único y retorna su metadata
- [ ] `GET /api/sessions` retorna la lista de sesiones existentes, ordenadas por fecha (más reciente primero)
- [ ] `GET /api/sessions/:id` retorna la sesión con todos sus mensajes ordenados
- [ ] `DELETE /api/sessions/:id` borra la sesión y sus mensajes. Retorna 404 si no existe
- [ ] Las sesiones persisten entre reinicios del server

---

## Servidor — Agente (loop ReAct con Vercel AI SDK)

- [ ] `POST /api/sessions/:id/messages` con `{ content: "..." }` inicia el loop del agente
- [ ] La respuesta es un SSE stream con eventos tipados y **sequence numbers**: `token`, `tool_call`, `tool_result`, `permission_request`, `done`, `error`
- [ ] Los tokens llegan uno a uno (o en chunks pequeños) para streaming real
- [ ] El agente puede usar `read_file` y retorna el contenido del archivo correcto
- [ ] El agente puede usar `write_file` y el archivo se crea/modifica en el filesystem
- [ ] El agente puede usar `edit_file` para reemplazar texto dentro de un archivo existente
- [ ] El agente puede usar `bash` para ejecutar un comando y retorna stdout/stderr
- [ ] El agente puede usar `list_files` para listar archivos de un directorio
- [ ] El agente puede usar `search_files` para buscar un patrón en archivos
- [ ] En modo `plan`, antes de ejecutar `write_file`, `edit_file` o `bash`, el agente emite `permission_request`
- [ ] Si el permiso es denegado, el agente recibe "Permission denied" y adapta su respuesta
- [ ] **Timeout de permisos**: si no hay respuesta en 5 minutos, permiso denegado automáticamente
- [ ] En modo `build`, los tools se ejecutan sin pedir permiso, con **delay de 500ms** entre destructivos
- [ ] El loop se detiene después de `maxIterations` (default 25) con mensaje de error
- [ ] **Detección de loops**: si la misma tool call se repite 3 veces consecutivas, el loop se detiene
- [ ] Si el LLM no genera un tool call válido, la respuesta se trata como texto plano (no crash)
- [ ] Todos los mensajes (user, assistant, tool_call, tool_result) se persisten como **un registro por pieza** (Decisión 7A)
- [ ] **Enfoque híbrido (Decisión 1C)**: el agente usa tools nativos del SDK; si fallan 3 veces, switch a textual

---

## Servidor — Compactación de contexto

- [ ] El estimador de tokens calcula un aproximado del tamaño del contexto actual
- [ ] Cuando el contexto supera el 75% del `context_length` del modelo, se dispara la compactación
- [ ] La compactación preserva los últimos N mensajes intactos (N configurable, default 10)
- [ ] Los mensajes antiguos se resumen con **prompt de compactación específico** (no genérico)
- [ ] **Metadata no compactable**: archivos tocados, comandos ejecutados, errores encontrados se preservan en `session_metadata`
- [ ] Después de la compactación, el agente continúa respondiendo coherentemente (no "olvida" la tarea)

---

## Servidor — Tools

- [ ] `read_file`: retorna error descriptivo si el archivo no existe
- [ ] `read_file`: trunca archivos >100KB y avisa "File truncated..."
- [ ] `write_file`: crea directorios padres si no existen
- [ ] `edit_file`: retorna error si `old_str` no se encuentra en el archivo
- [ ] `edit_file`: si `old_str` aparece múltiples veces, reemplaza solo la primera
- [ ] `bash`: tiene timeout de 30 segundos, kill el proceso si se excede
- [ ] `bash`: captura stdout y stderr separados
- [ ] `bash`: trunca output a 50KB si es excesivo
- [ ] `bash`: usa shell detectada con `detectShell()` — **`pwsh` → `powershell` → `cmd`** en Windows, `bash` → `sh` en Linux (Decisión 3D)
- [ ] `list_files`: default depth **3**, max **10**. Excluye `node_modules`, `.git`, `dist`, `build` por defecto
- [ ] `search_files`: retorna matches con nombre de archivo, línea y contexto
- [ ] `search_files`: limita resultados a 50 matches
- [ ] Los tools se registran en **formato Vercel AI SDK** (`tool()`) para uso con `streamText({ tools })`

---

## Servidor — Proveedor AI

- [ ] El proveedor se configura con `createOpenAI({ baseURL })` del Vercel AI SDK
- [ ] `streamText()` con un modelo de Ollama genera tokens correctamente
- [ ] `generateText()` con un modelo de Ollama retorna respuesta completa
- [ ] **El proveedor se puede cambiar** (ej: a LMStudio) modificando solo `baseURL` en la configuración
- [ ] `ollama-management.ts` lista, descarga y muestra info de modelos via API directa de Ollama
- [ ] Los errores de conexión al proveedor generan errores tipados (`OllamaNotAvailable`, `OllamaTimeout`, etc.)

---

## SDK

- [ ] `AgentClient` se instancia con URL default `http://localhost:4096`
- [ ] **Importa tipos de `@agent/shared`**, NO de `@agent/server` (Decisión 2B)
- [ ] Todas las funciones del SDK tienen tipos de retorno correctos (inferidos de Zod)
- [ ] `pullModel()` retorna un `AsyncIterable` que emite eventos de progreso
- [ ] `sendMessage()` retorna un `AsyncIterable` que emite eventos del agente con **sequence numbers**
- [ ] El SDK lanza `ServerNotAvailable` si no puede conectar al server
- [ ] El SDK lanza errores tipados (no strings) para todos los casos de error
- [ ] **`resync(sessionId)`**: recarga historial completo después de desconexión SSE

---

## TUI — Layout y navegación

- [ ] La TUI renderiza sin errores al arrancar
- [ ] El header muestra: modo activo (`plan`/`build`), modelo seleccionado (o "Ninguno")
- [ ] La TabBar muestra tres pestañas: Modelos, Chat, Sesiones
- [ ] Presionar `Tab` navega entre pestañas circularmente
- [ ] El contenido cambia al cambiar de pestaña
- [ ] **Estado gestionado con Zustand** (Decisión 4B)
- [ ] Funciona en Windows Terminal (Windows 10+)
- [ ] Funciona en una terminal Linux estándar (gnome-terminal, kitty, etc.)
- [ ] **Detecta soporte ANSI** con `supports-color`; si no hay soporte, modo sin colores + warning

---

## TUI — Pantalla de Modelos

- [ ] Muestra la lista de modelos descargados con sus **tamaños y parámetros**
- [ ] **Warning visual** si modelo >8GB: "⚠️ Modelo grande — requiere >16GB RAM"
- [ ] Indica cuál modelo está activo con un marcador visual (★ o similar)
- [ ] Permite navegar la lista con flechas arriba/abajo
- [ ] Presionar Enter en un modelo lo selecciona como activo
- [ ] Hay un input para escribir el nombre de un modelo a descargar
- [ ] Al confirmar la descarga, muestra una barra de progreso con porcentaje
- [ ] Si Ollama no está corriendo, muestra un mensaje de error en vez de la lista

---

## TUI — Pantalla de Chat

- [ ] Muestra un input de texto en la parte inferior
- [ ] Al enviar un mensaje, aparece en el historial con prefijo de usuario
- [ ] La respuesta del agente aparece con **throttle de 50ms** (streaming sin flickering)
- [ ] Cuando el agente hace un tool call, se muestra: nombre del tool, argumentos, y resultado (**React.memo**)
- [ ] En modo `plan`, cuando el agente pide permiso, aparece un dialog Sí/No
- [ ] Al seleccionar Sí, el tool se ejecuta. Al seleccionar No, el agente recibe la denegación
- [ ] El chat hace scroll automático hacia abajo cuando llegan nuevos tokens
- [ ] Hay un atajo de teclado visible para cambiar de modo (ej: `Ctrl+M`)
- [ ] **Después de desconexión SSE**: muestra banner + resync al presionar Enter

---

## TUI — Pantalla de Sesiones

- [ ] Muestra la lista de sesiones con fecha de creación y preview del primer mensaje
- [ ] Seleccionar una sesión cambia el contexto del chat a esa sesión
- [ ] Se puede borrar una sesión con confirmación
- [ ] Crear nueva sesión desde esta pantalla (o automáticamente al abrir Chat sin sesión activa)

---

## Cross-platform

- [ ] Todos los tests pasan en Windows
- [ ] Todos los tests pasan en Linux
- [ ] Los paths del filesystem se manejan correctamente en ambos OS
- [ ] El tool `bash` funciona en Windows (usa shell detectada: pwsh/powershell/cmd) y Linux (usa bash/sh)
- [ ] La DB SQLite se crea en la ubicación correcta según el OS
- [ ] **`scripts/test-ansi.ts`** verifica compatibilidad ANSI en terminales Windows

---

## Errores y edge cases

- [ ] Si Ollama no está corriendo, el sistema es usable (se puede navegar, ver sesiones) y muestra error claro en los puntos que requieren Ollama
- [ ] Si el server se cierra mientras la TUI está abierta, la TUI muestra "Conexión perdida"
- [ ] Si se envía un mensaje sin modelo activo seleccionado, se muestra error indicando que seleccione uno
- [ ] Si Ollama retorna un error mid-stream, la respuesta parcial se preserva y se muestra el error
- [ ] **Si Ollama crashea por OOM**, se muestra "Ollama no responde. Posible out of memory" con suggestion
- [ ] `Ctrl+C` cierra la TUI limpiamente
- [ ] `Ctrl+C` en el server hace graceful shutdown (cierra DB, cierra conexiones SSE)

---

## Validación de modelos

- [ ] **`scripts/test-models.ts`** ejecuta 5 escenarios con cada modelo instalado
- [ ] Genera tabla de compatibilidad con tasa de éxito (nativo vs textual)
- [ ] **`MODELS.md`** documenta modelos recomendados, con limitaciones, y no recomendados

---

## Resumen numérico

| Categoría | Criterios |
|-----------|-----------|
| Infraestructura | 6 |
| Shared (contratos) | 3 |
| Server — Health/Config | 5 |
| Server — Modelos | 6 |
| Server — Sesiones | 5 |
| Server — Agente | 18 |
| Server — Compactación | 6 |
| Server — Tools | 13 |
| Server — Proveedor AI | 6 |
| SDK | 8 |
| TUI — Layout | 9 |
| TUI — Modelos | 8 |
| TUI — Chat | 9 |
| TUI — Sesiones | 4 |
| Cross-platform | 6 |
| Errores/edge | 7 |
| Validación de modelos | 3 |
| **Total** | **122** |
