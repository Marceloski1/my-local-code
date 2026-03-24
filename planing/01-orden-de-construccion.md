# 01 — Orden de Construcción

## Principio rector

Construir primero lo que no tiene dependencias, luego lo que depende de eso. Cada pieza nueva se apoya en algo que ya funciona y se puede probar de forma aislada.

---

## Secuencia

### 1. Monorepo scaffold + tooling

**Qué:** `pnpm-workspace.yaml`, `turbo.json`, `tsconfig` base, ESLint, scripts raíz.

**Por qué primero:** Todo lo demás vive dentro del monorepo. Sin la estructura de workspaces, no se pueden declarar dependencias internas (`@agent/sdk`, `@agent/server`, `@agent/shared`, etc.). Turborepo necesita existir antes de que haya más de un package.

**Validación:** `pnpm install` corre sin errores, `pnpm turbo build` ejecuta el pipeline vacío.

---

### 2. `packages/shared` — contratos compartidos + `packages/server` — esqueleto HTTP + DB

**Qué:**
- **`packages/shared`:** Zod schemas para requests/responses, tipos TypeScript para mensajes, sesiones, tools, eventos SSE, constantes (roles, modos, defaults). Dependencia: solo `zod`. (Decisión 2B)
- **`packages/server`:** Hono server escuchando en `:4096`, health endpoint, Drizzle ORM + better-sqlite3 con el schema inicial (tablas `sessions`, `messages`, `config`, `session_metadata`), migraciones.

**Por qué segundo:** El shared package define los contratos que usarán todos los demás packages. El servidor es el núcleo que orquesta todo. La DB tiene que existir antes de poder persistir sesiones o configuración. Se construyen juntos porque shared no tiene lógica, solo definiciones.

**Dependencia:** Solo depende del monorepo scaffold (paso 1).

**Validación:** `curl localhost:4096/health` → `200 OK`. Las migraciones crean las tablas en el archivo `.db`. Los tipos de `@agent/shared` se importan correctamente en el server.

---

### 3. `packages/server` — Proveedor AI (Vercel AI SDK)

**Qué:** Configuración del **Vercel AI SDK** con proveedor OpenAI-compatible apuntando a Ollama. Módulo `ai/provider.ts` con `createAIProvider()`. Módulo `ai/ollama-management.ts` con funciones directas de Ollama: `listModels()`, `pullModel(name, onProgress)`, `showModel(name)` (para `context_length`).

**Por qué tercero:** Es la dependencia externa más crítica. Si la comunicación con el proveedor AI no funciona, nada más tiene sentido. Se necesita antes del loop del agente y antes de la pantalla de modelos.

**Dependencia:** `ai` y `@ai-sdk/openai` (npm packages). `@agent/shared` para tipos.

**Validación:** Script de test manual que:
1. Crea el proveedor: `createAIProvider({ type: 'ollama', baseURL: 'http://localhost:11434/v1' })`
2. Lista modelos via `ollama-management.ts`
3. Hace una llamada con `generateText({ model: provider('tinyllama'), prompt: 'Hello' })`
4. Hace una llamada con `streamText()` y verifica que los tokens llegan uno a uno

---

### 4. `packages/server` — SSE streaming layer

**Qué:** Middleware/utilidad de Hono que abre un stream SSE para una ruta dada. Patrón: el handler recibe un `sendEvent(type, data, sequence)` y puede emitir eventos tipados con sequence numbers.

**Por qué cuarto:** La TUI necesita recibir tokens en tiempo real (streaming de chat) y progreso de descarga (pull model). Ambos usan SSE. Construirlo como capa reutilizable evita duplicación.

**Dependencia:** Hono (paso 2). `@agent/shared` para tipos de SSEEvent.

**Validación:** `curl` a un endpoint SSE de prueba recibe eventos formateados correctamente con sequence numbers. Se puede cancelar la conexión sin crashear el server.

---

### 5. `packages/server` — endpoints de modelos

**Qué:** Rutas REST + SSE:
- `GET /api/models` → lista modelos descargados (via `ollama-management.ts`)
- `POST /api/models/pull` → inicia descarga, retorna SSE con progreso
- `POST /api/models/active` → guarda modelo activo en config (SQLite)
- `GET /api/models/active` → lee modelo activo

**Por qué quinto:** Funcionalidad autocontenida que solo depende del proveedor AI (paso 3), la DB (paso 2) y SSE (paso 4). La TUI puede probar la pantalla de modelos contra estos endpoints.

**Dependencia:** Pasos 2, 3, 4.

**Validación:** Con Postman/curl: listar modelos, iniciar pull, cambiar modelo activo, verificar persistencia reiniciando el server.

---

### 6. `packages/sdk` — cliente HTTP tipado

**Qué:** Funciones wrapper tipo `sdk.listModels()`, `sdk.pullModel()`, `sdk.sendMessage()`. El SDK usa `fetch` internamente y expone iteradores para SSE con tracking de sequence numbers. **Importa tipos de `@agent/shared`** (Decisión 2B), NO de `@agent/server`.

**Por qué sexto:** La TUI no debería hacer `fetch` directo. El SDK centraliza la comunicación y da type safety. Se construye después de que las rutas del server estén estabilizadas.

**Dependencia:** `@agent/shared` para tipos. No importa nada de Hono ni de Node directo.

**Validación:** Tests unitarios que mockean `fetch` y verifican que el SDK serializa/deserializa correctamente.

---

### 7. `packages/tui` — shell + navegación

**Qué:** Aplicación Ink con layout base: Header (modo, modelo activo), TabBar (Modelos | Chat | Sesiones), y tres pantallas vacías. Navegación con Tab. Ciclo `stdin` funcionando. **Estado global con Zustand** (Decisión 4B).

**Por qué séptimo:** Ahora ya existe un SDK tipado para hablar con el server. La TUI puede renderizar sin backend (pantallas vacías), pero necesita el SDK para cualquier dato real.

**Dependencia:** `@agent/sdk` (paso 6). Ink + React + Zustand.

**Validación:** Se ejecuta en terminal, muestra el header, se navega entre tabs con `Tab`. No crashea ni en Windows ni en Linux. Verifica soporte ANSI con `supports-color`.

---

### 8. `packages/tui` — pantalla de Modelos

**Qué:** Lista de modelos descargados (vía SDK) con **tamaño y parámetros** (mitigación Riesgo 7), botón/input para pull de nuevo modelo con barra de progreso, selector de modelo activo.

**Dependencia:** SDK con endpoints de modelos funcionando (pasos 5, 6).

**Validación:** Abrir TUI, ver modelos listados con tamaños, descargar uno, seleccionarlo como activo. Reiniciar y ver que la selección persiste.

---

### 9. `packages/server` — tools del agente

**Qué:** Implementación de los 6 tools: `read_file`, `write_file`, `edit_file`, `bash`, `list_files`, `search_files`. Cada tool es una función pura que recibe parámetros validados con Zod y retorna un resultado estructurado. Incluye `lib/shell.ts` con `detectShell()` (Decisión 3D). Los tools se registran tanto como `ToolSpec` interno como en formato Vercel AI SDK (`tool()` de `ai` package).

**Por qué noveno:** Los tools son las "manos" del agente. Se implementan antes del loop del agente para poder testarlos de forma aislada.

**Dependencia:** Solo Node fs/child_process, `cross-spawn`, `@agent/shared`.

**Validación:** Tests unitarios: leer un archivo existente, escribir uno nuevo, editar una línea, ejecutar `echo hello` (con shell detectada), listar un directorio (default depth=3), buscar un patrón. Tests de error: path no existe, permiso denegado, comando que falla, timeout.

---

### 10. `packages/server` — loop del agente (ReAct)

**Qué:** El core del agente: recibe un mensaje del usuario, construye el prompt con instrucciones del sistema (incluyendo info de OS/shell) + historial + tools, llama al LLM **via Vercel AI SDK** (`streamText` con `tools`), parsea la respuesta, ejecuta tools, repite. Implementa el **enfoque híbrido** (Decisión 1C): ruta nativa del SDK + fallback textual con regex+Zod (Decisión 5). Incluye compactación de contexto con **metadata no compactable** (mitigación Riesgo 4), modos plan/build, y **rate limiting** entre tool calls destructivos en modo build (inconsistencia #3 resuelta).

**Por qué décimo:** Es la pieza más compleja. Se construye cuando ya existen: el proveedor AI (paso 3), los tools (paso 9), y la DB para persistir mensajes (paso 2). Aislarlo en esta posición permite debuggearlo sin la TUI.

**Dependencia:** Pasos 2, 3, 9.

**Validación:**
- Script que inicia una sesión, envía "lista los archivos en /tmp", el agente usa `list_files`, y retorna el resultado formateado
- Probar con modo plan: el agente debería pedir confirmación para `bash`
- Probar fallback textual: configurar `toolMode: 'textual'` y verificar que funciona
- Ejecutar `scripts/test-models.ts` con los modelos instalados

---

### 11. `packages/server` — endpoints de chat/sesiones

**Qué:**
- `POST /api/sessions` → crear sesión
- `GET /api/sessions` → listar sesiones
- `GET /api/sessions/:id` → detalle con mensajes
- `DELETE /api/sessions/:id` → borrar sesión
- `POST /api/sessions/:id/messages` → enviar mensaje, retorna SSE con tokens del agente (con sequence numbers)
- `POST /api/sessions/:id/permission` → respuesta de permisos (Decisión 6)
- `POST /api/config/mode` → cambiar modo plan/build
- `GET /api/config` → leer config completa

**Dependencia:** Loop del agente (paso 10), DB (paso 2), SSE layer (paso 4).

**Validación:** Con curl: crear sesión, enviar mensaje, ver tokens por SSE con sequence, verificar que los mensajes se persisten. Cambiar modo a build y verificar que los tools destructivos se ejecutan sin pedir permiso (con delay de 500ms).

---

### 12. `packages/tui` — pantalla de Chat

**Qué:** Input de texto, display de mensajes con streaming (**throttle 50ms**, mitigación Riesgo 6), dialog de confirmación para modo plan, indicador de tool calls en progreso (**React.memo**), **resync después de desconexión** (mitigación Riesgo 5).

**Dependencia:** SDK con endpoints de chat (paso 11).

**Validación:** Chat funcional end-to-end: escribir pregunta, ver respuesta streameada, ver tool calls, confirmar/rechazar en modo plan.

---

### 13. `packages/tui` — pantalla de Sesiones

**Qué:** Lista de sesiones guardadas, seleccionar una para continuar, borrar sesiones.

**Dependencia:** SDK con endpoints de sesiones (paso 11).

**Validación:** Crear varias sesiones via chat, ir a la pantalla de sesiones, seleccionar una antigua, ver que retoma el contexto.

---

### 14. `cmd/` — binarios Go (IGNORADO en MVP)

**Qué:** `cmd/fswatch` (file watcher) y `cmd/search` (búsqueda rápida en filesystem). Compilados como binarios standalone. El server los invoca como child process.

**Por qué último (y fuera del MVP):** Son optimizaciones. El MVP funciona sin ellos (se usa Node fs.watch y búsqueda con glob). Se construyen solo si queda tiempo. El protocolo de comunicación sería stdin/stdout con JSON line-delimited (inconsistencia #1 resuelta).

**Dependencia:** Ninguna interna. Solo necesitan que el server sepa invocarlos.

---

## Diagrama de dependencias

```
1. Monorepo scaffold
├── 2. Shared contracts + Server skeleton + DB
│   ├── 3. Proveedor AI (Vercel AI SDK + Ollama)
│   │   ├── 4. SSE layer (con sequence numbers)
│   │   │   └── 5. Endpoints modelos
│   │   │       └── 6. SDK (importa de @agent/shared)
│   │   │           ├── 7. TUI shell (Zustand)
│   │   │           │   ├── 8. Pantalla Modelos (con info de tamaño)
│   │   │           │   ├── 12. Pantalla Chat (throttle + resync)
│   │   │           │   └── 13. Pantalla Sesiones
│   │   └── 10. Loop agente (híbrido + rate limit) ← 9. Tools (detectShell)
│   │       └── 11. Endpoints chat/sesiones
│   └── 9. Tools del agente (cross-spawn, detectShell)
└── 14. Binarios Go (IGNORADO en MVP)
```
