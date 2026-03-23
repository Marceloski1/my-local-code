# 02 — Fases de Desarrollo

Cada fase termina con algo **funcionando y demostrable**. No se avanza a la siguiente fase sin validar la anterior.

---

## Fase 0 — Scaffold del monorepo
**Duración estimada:** 1 día

### Se construye
- Repositorio Git inicializado
- `pnpm-workspace.yaml` con tres packages: `packages/server`, `packages/tui`, `packages/sdk`
- `turbo.json` con pipelines: `build`, `dev`, `lint`, `typecheck`
- `tsconfig.base.json` compartido (target ES2022, moduleResolution bundler, strict)
- ESLint config compartida
- `.gitignore`, `.nvmrc` (Node 20 LTS), `README.md`
- Scripts raíz: `pnpm dev` (arranca server + tui), `pnpm build`, `pnpm lint`
- Carpeta `cmd/` con un `go.mod` placeholder

### Demostrable al final
- `pnpm install` → no errores
- `pnpm turbo build` → pipeline ejecuta (aunque los builds estén vacíos)
- Estructura visible con `tree`

---

## Fase 1 — Servidor base + DB + cliente Ollama
**Duración estimada:** 3-4 días

### Se construye
- Hono server en `packages/server` con `@hono/node-server`
- `GET /health` → `{ status: "ok", timestamp }`
- Schema Drizzle: tablas `sessions`, `messages`, `config`
- Capa de migraciones (Drizzle Kit)
- Módulo `ollama-client.ts`: `listModels()`, `pullModel()`, `chat()`, `showModel()`
- Capa SSE reutilizable (`sse.ts`)
- Rutas de modelos:
  - `GET /api/models`
  - `POST /api/models/pull` (SSE con progreso)
  - `GET /api/models/active`
  - `POST /api/models/active`
- Validación de inputs con Zod en todas las rutas

### Demostrable al final
- Server arranca en `:4096`
- `curl /health` → 200
- `curl /api/models` → lista modelos de Ollama
- Hacer pull de un modelo pequeño vía curl, ver eventos SSE con progreso
- Cambiar modelo activo, reiniciar server, verificar que persiste en SQLite

---

## Fase 2 — SDK + TUI shell + pantalla de Modelos
**Duración estimada:** 3-4 días

### Se construye
- `packages/sdk`: cliente tipado con funciones para cada endpoint
  - Tipos Zod compartidos (exportados desde server o desde un archivo compartido)
  - Helpers para consumir SSE desde el cliente
- `packages/tui`: aplicación Ink base
  - Layout: Header + TabBar + ContentArea
  - Navegación con Tab entre 3 pantallas
  - Pantalla de Modelos completa:
    - Lista de modelos descargados con indicador de activo
    - Input para nombre de modelo a descargar
    - Barra de progreso de descarga (datos vía SSE a través del SDK)
    - Selector de modelo activo
  - Pantallas de Chat y Sesiones como placeholders
  - Manejo de ANSI colors en Windows (activación explícita de VT processing)

### Demostrable al final
- `pnpm dev` arranca server + TUI simultáneamente
- La TUI muestra header con "Modo: plan | Modelo: ninguno"
- Tab navega entre las tres pantallas
- En pantalla Modelos: se ven modelos, se puede descargar uno nuevo con barra de progreso, se puede seleccionar modelo activo
- Funciona en Windows Terminal y en una terminal Linux

---

## Fase 3 — Tools del agente + loop ReAct
**Duración estimada:** 5-7 días

### Se construye
- 6 tools implementados y testeados unitariamente:
  - `read_file(path)` — lee contenido, retorna texto
  - `write_file(path, content)` — crea/sobreescribe archivo
  - `edit_file(path, old_str, new_str)` — reemplaza primera ocurrencia
  - `bash(command)` — ejecuta en shell, retorna stdout/stderr/exitCode
  - `list_files(path)` — lista recursiva con profundidad configurable
  - `search_files(pattern, path)` — grep con contexto
- Registro de tools (`tool-registry.ts`): mapea nombre → schema Zod + función ejecutora
- System prompt del agente con instrucciones de ReAct y definiciones de tools
- Loop del agente (`agent-loop.ts`):
  - Construye prompt con sistema + historial + tools
  - Llama a Ollama, parsea respuesta
  - Detecta tool calls, ejecuta, appende resultado
  - Itera hasta respuesta final o max iteraciones
  - Modo plan: verifica permisos antes de tools destructivos (write, edit, bash)
  - Modo build: ejecuta todo directamente
- Compactación de contexto:
  - Calcula tokens aproximados del historial
  - Al 75% del context_length del modelo, compacta mensajes antiguos con el LLM
- Persistencia: cada mensaje (user, assistant, tool_call, tool_result) se guarda en SQLite

### Demostrable al final
- Script de test: crear sesión → enviar "lee el archivo X" → el agente usa `read_file` → retorna contenido
- Script de test: enviar "crea un archivo hello.txt con contenido Hi" en modo plan → el agente pide confirmación
- Script de test: en modo build → el agente ejecuta sin pedir permiso
- Verificar que el historial se persiste: reiniciar server, cargar sesión, el contexto previo está ahí
- Compactación: enviar muchos mensajes hasta acercarse al 75%, verificar que se compacta sin perder coherencia

---

## Fase 4 — Endpoints de chat/sesiones + TUI Chat + Sesiones
**Duración estimada:** 5-6 días

### Se construye
- Endpoints de server:
  - `POST /api/sessions` → nueva sesión
  - `GET /api/sessions` → listar
  - `GET /api/sessions/:id` → detalle con mensajes
  - `DELETE /api/sessions/:id` → borrar
  - `POST /api/sessions/:id/messages` → enviar mensaje, SSE con tokens
  - `POST /api/config/mode` → cambiar plan/build
  - `GET /api/config` → config actual
- SDK actualizado con los nuevos endpoints
- Pantalla de Chat en TUI:
  - Área de mensajes scrollable
  - Input de texto con ink-text-input
  - Tokens del agente aparecen en tiempo real (streaming)
  - Indicador visual de tool calls en ejecución
  - Dialog de confirmación de permisos en modo plan (Sí/No)
  - Indicador de modo actual que cambia de color (plan=amarillo, build=rojo)
- Pantalla de Sesiones en TUI:
  - Lista de sesiones con fecha y preview del primer mensaje
  - Seleccionar sesión para continuar la conversación
  - Borrar sesión con confirmación
- Atajo de teclado en TUI para cambiar de modo (ej: Ctrl+M)

### Demostrable al final
- Flujo completo end-to-end:
  1. Abrir TUI, seleccionar modelo en pantalla Modelos
  2. Ir a Chat, escribir "lista los archivos en el directorio actual"
  3. Ver tokens aparecer en tiempo real
  4. Ver el agente usar `list_files`, mostrar resultado
  5. En modo plan, el agente pide permiso para `bash`
  6. Ir a Sesiones, ver la sesión guardada
  7. Cerrar y reabrir, la sesión sigue ahí

---

## Fase 5 — Pulido, edge cases y binarios Go (opcional)
**Duración estimada:** 3-4 días

### Se construye
- Manejo robusto de errores en toda la cadena:
  - Ollama no disponible → mensaje claro en TUI
  - Modelo no descargado → redirect a pantalla Modelos
  - Tool falla → el error se inyecta como resultado y el agente decide qué hacer
  - Conexión SSE se corta → reconexión o mensaje de error
- Graceful shutdown del server (SIGINT, SIGTERM)
- CLI wrapper: `npx @agent/tui` o un script que arranca server + tui
- Logging estructurado (pino) con niveles configurables
- **Opcional:** binarios Go en `cmd/`:
  - `cmd/search` — búsqueda rápida con ripgrep-like performance
  - `cmd/fswatch` — file watcher eficiente
  - Cross-compilation para Windows (`.exe`) y Linux
  - El server detecta si existen y los usa, si no, fallback a Node

### Demostrable al final
- MVP completo funcional
- Manejo graceful de todos los errores comunes
- Funciona en Windows y Linux
- Se puede instalar y usar sin instrucciones más allá de "instala Ollama, instala Node, clona, pnpm install, pnpm dev"

---

## Resumen de timeline

| Fase | Días estimados | Acumulado |
|------|---------------|-----------|
| 0 — Scaffold | 1 | 1 |
| 1 — Server + DB + Ollama | 3-4 | 4-5 |
| 2 — SDK + TUI + Modelos | 3-4 | 7-9 |
| 3 — Tools + Loop ReAct | 5-7 | 12-16 |
| 4 — Chat + Sesiones | 5-6 | 17-22 |
| 5 — Pulido + Go (opt) | 3-4 | 20-26 |

**Total estimado: 20-26 días de desarrollo** para un desarrollador full-time.
