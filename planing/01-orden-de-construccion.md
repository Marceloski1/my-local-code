# 01 — Orden de Construcción

## Principio rector

Construir primero lo que no tiene dependencias, luego lo que depende de eso. Cada pieza nueva se apoya en algo que ya funciona y se puede probar de forma aislada.

---

## Secuencia

### 1. Monorepo scaffold + tooling

**Qué:** `pnpm-workspace.yaml`, `turbo.json`, `tsconfig` base, ESLint, scripts raíz.

**Por qué primero:** Todo lo demás vive dentro del monorepo. Sin la estructura de workspaces, no se pueden declarar dependencias internas (`@agent/sdk`, `@agent/server`, etc.). Turborepo necesita existir antes de que haya más de un package.

**Validación:** `pnpm install` corre sin errores, `pnpm turbo build` ejecuta el pipeline vacío.

---

### 2. `packages/server` — esqueleto HTTP + DB

**Qué:** Hono server escuchando en `:4096`, health endpoint, Drizzle ORM + better-sqlite3 con el schema inicial (tablas `sessions`, `messages`, `config`), migraciones.

**Por qué segundo:** El servidor es el núcleo que orquesta todo. La DB tiene que existir antes de poder persistir sesiones o configuración. Hono es el punto de entrada para cualquier comunicación con la TUI.

**Dependencia:** Solo depende del monorepo scaffold (paso 1).

**Validación:** `curl localhost:4096/health` → `200 OK`. Las migraciones crean las tablas en el archivo `.db`.

---

### 3. `packages/server` — cliente Ollama

**Qué:** Módulo que habla con la API REST de Ollama (`localhost:11434`). Funciones: `listModels()`, `pullModel(name, onProgress)`, `chat(model, messages, onToken)`, `showModel(name)` (para obtener `context_length`).

**Por qué tercero:** Es la dependencia externa más crítica. Si la comunicación con Ollama no funciona, nada más tiene sentido. Se necesita antes del loop del agente y antes de la pantalla de modelos.

**Dependencia:** Solo usa `fetch` nativo de Node 18+. No depende de otros packages internos.

**Validación:** Script de test manual que lista modelos, descarga uno pequeño (`tinyllama`), y hace una llamada de chat con streaming. Los tokens llegan uno a uno.

---

### 4. `packages/server` — SSE streaming layer

**Qué:** Middleware/utilidad de Hono que abre un stream SSE para una ruta dada. Patrón: el handler recibe un `sendEvent(type, data)` y puede emitir eventos tipados.

**Por qué cuarto:** La TUI necesita recibir tokens en tiempo real (streaming de chat) y progreso de descarga (pull model). Ambos usan SSE. Construirlo como capa reutilizable evita duplicación.

**Dependencia:** Hono (paso 2).

**Validación:** `curl` a un endpoint SSE de prueba recibe eventos formateados correctamente. Se puede cancelar la conexión sin crashear el server.

---

### 5. `packages/server` — endpoints de modelos

**Qué:** Rutas REST + SSE:
- `GET /api/models` → lista modelos descargados (proxy a Ollama)
- `POST /api/models/pull` → inicia descarga, retorna SSE con progreso
- `POST /api/models/active` → guarda modelo activo en config (SQLite)
- `GET /api/models/active` → lee modelo activo

**Por qué quinto:** Funcionalidad autocontenida que solo depende del cliente Ollama (paso 3), la DB (paso 2) y SSE (paso 4). La TUI puede probar la pantalla de modelos contra estos endpoints.

**Dependencia:** Pasos 2, 3, 4.

**Validación:** Con Postman/curl: listar modelos, iniciar pull, cambiar modelo activo, verificar persistencia reiniciando el server.

---

### 6. `packages/sdk` — cliente HTTP autogenerado

**Qué:** Tipado compartido de request/response (Zod schemas exportados desde server), funciones wrapper tipo `sdk.listModels()`, `sdk.pullModel()`, `sdk.sendMessage()`. El SDK usa `fetch` internamente y expone iteradores para SSE.

**Por qué sexto:** La TUI no debería hacer `fetch` directo. El SDK centraliza la comunicación y da type safety. Se construye después de que las rutas del server estén estabilizadas.

**Dependencia:** Los tipos Zod exportados de `packages/server`. No importa nada de Hono ni de Node directo.

**Validación:** Tests unitarios que mockean `fetch` y verifican que el SDK serializa/deserializa correctamente.

---

### 7. `packages/tui` — shell + navegación

**Qué:** Aplicación Ink con layout base: Header (modo, modelo activo), TabBar (Modelos | Chat | Sesiones), y tres pantallas vacías. Navegación con Tab. Ciclo `stdin` funcionando.

**Por qué séptimo:** Ahora ya existe un SDK tipado para hablar con el server. La TUI puede renderizar sin backend (pantallas vacías), pero necesita el SDK para cualquier dato real.

**Dependencia:** `@agent/sdk` (paso 6). Ink + React.

**Validación:** Se ejecuta en terminal, muestra el header, se navega entre tabs con `Tab`. No crashea ni en Windows ni en Linux.

---

### 8. `packages/tui` — pantalla de Modelos

**Qué:** Lista de modelos descargados (vía SDK), botón/input para pull de nuevo modelo con barra de progreso, selector de modelo activo.

**Dependencia:** SDK con endpoints de modelos funcionando (pasos 5, 6).

**Validación:** Abrir TUI, ver modelos listados, descargar uno, seleccionarlo como activo. Reiniciar y ver que la selección persiste.

---

### 9. `packages/server` — tools del agente

**Qué:** Implementación de los 6 tools: `read_file`, `write_file`, `edit_file`, `bash`, `list_files`, `search_files`. Cada tool es una función pura que recibe parámetros validados con Zod y retorna un resultado estructurado.

**Por qué noveno:** Los tools son las "manos" del agente. Se implementan antes del loop del agente para poder testarlos de forma aislada. `search_files` puede opcionalmente delegar al binario Go, pero en el MVP basta con una implementación en Node.

**Dependencia:** Solo Node fs/child_process. Sin dependencias internas.

**Validación:** Tests unitarios: leer un archivo existente, escribir uno nuevo, editar una línea, ejecutar `echo hello`, listar un directorio, buscar un patrón. Tests de error: path no existe, permiso denegado, comando que falla.

---

### 10. `packages/server` — loop del agente (ReAct)

**Qué:** El core del agente: recibe un mensaje del usuario, construye el prompt con instrucciones del sistema + historial + tool definitions, llama al LLM, parsea la respuesta (¿quiere usar un tool? → ejecutarlo → append resultado → llamar al LLM de nuevo), repite hasta que el LLM da una respuesta final. Incluye compactación de contexto y modos plan/build.

**Por qué décimo:** Es la pieza más compleja. Se construye cuando ya existen: el cliente Ollama (paso 3), los tools (paso 9), y la DB para persistir mensajes (paso 2). Aislarlo en esta posición permite debuggearlo sin la TUI.

**Dependencia:** Pasos 2, 3, 9.

**Validación:** Script que inicia una sesión, envía "lista los archivos en /tmp", el agente usa `list_files`, y retorna el resultado formateado. Probar con modo plan: el agente debería pedir confirmación para `bash`.

---

### 11. `packages/server` — endpoints de chat/sesiones

**Qué:**
- `POST /api/sessions` → crear sesión
- `GET /api/sessions` → listar sesiones
- `GET /api/sessions/:id` → detalle con mensajes
- `DELETE /api/sessions/:id` → borrar sesión
- `POST /api/sessions/:id/messages` → enviar mensaje, retorna SSE con tokens del agente
- `POST /api/config/mode` → cambiar modo plan/build
- `GET /api/config` → leer config completa

**Dependencia:** Loop del agente (paso 10), DB (paso 2), SSE layer (paso 4).

**Validación:** Con curl: crear sesión, enviar mensaje, ver tokens por SSE, verificar que los mensajes se persisten. Cambiar modo a build y verificar que los tools destructivos se ejecutan sin pedir permiso.

---

### 12. `packages/tui` — pantalla de Chat

**Qué:** Input de texto, display de mensajes con streaming, dialog de confirmación para modo plan, indicador de tool calls en progreso.

**Dependencia:** SDK con endpoints de chat (paso 11).

**Validación:** Chat funcional end-to-end: escribir pregunta, ver respuesta streameada, ver tool calls, confirmar/rechazar en modo plan.

---

### 13. `packages/tui` — pantalla de Sesiones

**Qué:** Lista de sesiones guardadas, seleccionar una para continuar, borrar sesiones.

**Dependencia:** SDK con endpoints de sesiones (paso 11).

**Validación:** Crear varias sesiones via chat, ir a la pantalla de sesiones, seleccionar una antigua, ver que retoma el contexto.

---

### 14. `cmd/` — binarios Go (opcional para MVP)

**Qué:** `cmd/fswatch` (file watcher) y `cmd/search` (búsqueda rápida en filesystem). Compilados como binarios standalone. El server los invoca como child process.

**Por qué último:** Son optimizaciones. El MVP funciona sin ellos (se usa Node fs.watch y búsqueda con glob). Se construyen solo si queda tiempo.

**Dependencia:** Ninguna interna. Solo necesitan que el server sepa invocarlos.

---

## Diagrama de dependencias

```
1. Monorepo scaffold
├── 2. Server skeleton + DB
│   ├── 3. Cliente Ollama
│   │   ├── 4. SSE layer
│   │   │   └── 5. Endpoints modelos
│   │   │       └── 6. SDK
│   │   │           ├── 7. TUI shell
│   │   │           │   ├── 8. Pantalla Modelos
│   │   │           │   ├── 12. Pantalla Chat
│   │   │           │   └── 13. Pantalla Sesiones
│   │   └── 10. Loop agente ← 9. Tools
│   │       └── 11. Endpoints chat/sesiones
│   └── 9. Tools del agente
└── 14. Binarios Go (opcional)
```
