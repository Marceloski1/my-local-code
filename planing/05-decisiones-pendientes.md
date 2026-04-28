# 05 — Decisiones Técnicas Pendientes

Puntos donde hay más de una forma válida de resolver algo. Cada sección presenta las opciones, sus trade-offs, y la decisión tomada.

---

## Decisión transversal: Vercel AI SDK con proveedor Ollama

### Contexto

En vez de comunicarse directamente con la API REST de Ollama via `fetch`, se usará el **Vercel AI SDK** (`ai` package) con un proveedor compatible. Esto permite cambiar de proveedor (Ollama → LMStudio → OpenAI → etc.) sin modificar el loop del agente.

### Implementación

- **Package**: `ai` (Vercel AI SDK core) + `@ai-sdk/openai` (proveedor compatible con API OpenAI)
- **Configuración**: `createOpenAI({ baseURL: 'http://localhost:11434/v1' })` — Ollama expone API compatible con OpenAI
- **Para LMStudio**: solo cambiar `baseURL` a `http://localhost:1234/v1`
- **Para OpenAI real**: usar `@ai-sdk/openai` con la API key

### Impacto en la arquitectura

- El módulo `ollama/client.ts` se reemplaza por `ai/provider.ts`
- El loop del agente usa `streamText()` / `generateText()` del SDK
- Los tools se registran como `tools` del SDK (con schemas Zod directos)
- El streaming es manejado por el SDK, no por parsing manual de NDJSON

### Funcionalidad directa de Ollama (fuera del SDK)

Algunas funciones de Ollama no tienen equivalente en el Vercel AI SDK y se mantienen con `fetch` directo:

- `listModels()` → `GET http://localhost:11434/api/tags`
- `pullModel()` → `POST http://localhost:11434/api/pull` (con SSE)
- `showModel()` → `POST http://localhost:11434/api/show` (para `context_length`)

Estas funciones viven en `ai/ollama-management.ts` (separadas del proveedor genérico).

---

## 1. Formato de tool calls en el prompt del LLM ✅ DECIDIDO: Opción C

### Problema

Los modelos locales (Llama, Mistral, etc.) vía Ollama soportan tool calling, pero la calidad varía mucho según el modelo. Hay dos formas de que el agente "use" tools:

### Opciones

**A) Usar la API nativa de tools de Ollama**

- Ollama soporta `tools` en el request body desde la API de chat
- El modelo retorna un JSON con `tool_calls` en la respuesta
- Ventaja: limpio, parseo automático, formato estándar
- Riesgo: muchos modelos locales pequeños (≤7B) generan tool calls malformados o los ignoran por completo. Solo funciona bien con modelos que fueron entrenados para tool calling (ej: Llama 3.1+, Qwen 2.5+)

**B) Tool calling via prompting (ReAct textual)**

- El system prompt incluye instrucciones explícitas tipo "Para usar un tool, escribe EXACTAMENTE: `<tool_call>{"name": "...", "args": {...}}</tool_call>`"
- El parser busca ese patrón en la respuesta del LLM con regex
- Ventaja: funciona con cualquier modelo que genere texto coherente, no depende de soporte de tools en el modelo
- Riesgo: más frágil, el LLM puede generar el formato mal, necesita parsing robusto

**C) Enfoque híbrido** ← **ELEGIDA**

- Intentar con API de tools. Si el modelo soporta tools (detectable via `showModel()` o en la primera llamada), usar la ruta nativa. Si no, fallback a prompting textual.
- Ventaja: mejor experiencia con modelos compatibles, cobertura amplia
- Riesgo: más código, dos paths a mantener

### Decisión: **Opción C (Enfoque híbrido)**

**Justificación:** Con el Vercel AI SDK, la ruta nativa de tools es el path por defecto — el SDK maneja `streamText({ tools })` automáticamente. El fallback textual se activa cuando se detecta que el modelo no soporta tools o cuando los tool calls fallan consistentemente. Esto da la mejor experiencia con modelos modernos (Llama 3.1+, Qwen 2.5+) sin perder compatibilidad con modelos más pequeños.

**Plan de mitigación para los dos paths:**

1. Abstraer la interfaz: `AgentRunner` con dos implementaciones (`NativeToolRunner`, `TextualToolRunner`)
2. Configuración por modelo: en el futuro, un `models.json` puede indicar qué modelos soportan tools nativos
3. Detección automática: si las primeras 3 tool calls nativas fallan parsing, switch a textual para esa sesión

---

## 2. Cómo compartir tipos entre server y SDK ✅ DECIDIDO: Opción B

### Problema

Los Zod schemas del server definen la forma de los requests/responses. El SDK necesita los mismos tipos. ¿Dónde viven?

### Opciones

**A) Exportar schemas desde `packages/server` y que el SDK los importe**

- El SDK tiene `@agent/server` como dependencia (solo para tipos)
- Ventaja: single source of truth, cero duplicación
- Riesgo: el SDK depende del server a nivel de package, lo cual es raro semánticamente. Solo se importan los schemas, no el server entero

**B) Crear un `packages/shared` con los schemas y tipos** ← **ELEGIDA**

- Ambos packages dependen de `@agent/shared`
- Ventaja: limpio semánticamente, package dedicado a contratos
- Riesgo: un package más que mantener, overhead de setup

**C) Duplicar tipos en el SDK**

- Copiar las interfaces manualmente
- Ventaja: cero acoplamiento
- Riesgo: se desincroniza inmediatamente

### Decisión: **Opción B (`packages/shared`)**

**Justificación:** Con la adopción del Vercel AI SDK, tener un package compartido es aún más valioso — los tipos de los proveedores, los schemas de mensajes, las interfaces de tools y los tipos de eventos SSE se definen una sola vez. El overhead de un package adicional es mínimo con pnpm workspaces y Turborepo.

**Contenido de `packages/shared`:**

- `schemas/` — Zod schemas para requests/responses de todas las rutas
- `types/` — Interfaces TypeScript para mensajes, sesiones, tool calls, eventos SSE
- `constants/` — Constantes compartidas (roles, modos, defaults)

---

## 3. Shell para el tool `bash` en Windows ✅ DECIDIDO: Opción D

### Problema

El tool `bash` necesita ejecutar comandos del usuario. ¿Qué shell usar en Windows?

### Opciones

**A) `cmd.exe`**

- Disponible siempre en Windows
- Sintaxis incompatible con Linux
- Los usuarios probablemente esperan PowerShell

**B) `powershell.exe` (Windows PowerShell 5.1)**

- Disponible en todo Windows moderno
- Comandos como `ls`, `cat`, `mkdir` funcionan (son aliases)
- Más familiar para usuarios Windows
- Más lento que cmd.exe al arrancar

**C) `pwsh.exe` (PowerShell 7+)**

- No viene preinstalado, pero es cross-platform
- Si está instalado, es la mejor opción

**D) Detectar en orden de preferencia: `pwsh` → `powershell` → `cmd`** ← **ELEGIDA**

### Decisión: **Opción D (detección con fallback)**

Detectar `pwsh` primero (mejor experiencia si está instalado), luego `powershell` (siempre disponible en Windows moderno), luego `cmd.exe` como último recurso. En Linux: `bash` → `sh`. El usuario podría configurar su shell preferida vía config, pero no es necesario para el MVP.

**Implementación:** Función `detectShell()` en `packages/server/src/lib/shell.ts`:

```typescript
// Pseudocódigo
export function detectShell(): { path: string; args: string[] } {
  if (process.platform === 'win32') {
    if (existsSync(findExecutable('pwsh')))
      return { path: 'pwsh', args: ['-NoProfile', '-Command'] };
    if (existsSync(findExecutable('powershell')))
      return { path: 'powershell', args: ['-NoProfile', '-Command'] };
    return { path: 'cmd.exe', args: ['/C'] };
  }
  if (existsSync('/bin/bash')) return { path: '/bin/bash', args: ['-c'] };
  return { path: '/bin/sh', args: ['-c'] };
}
```

---

## 4. Gestión de estado en la TUI ✅ DECIDIDO: Opción B

### Problema

La TUI necesita compartir estado entre pantallas (modelo activo, modo, sesión actual, estado de conexión).

### Opciones

**A) React Context + useReducer**

- Built-in, no dependencias extra
- Suficiente para una app pequeña
- Puede volverse verboso con muchas acciones

**B) Zustand** ← **ELEGIDA**

- Ligero (~1KB), API minimalista
- Funciona con React, compatible con Ink
- Más ergonómico que Context para estado compartido

**C) Jotai/Valtio**

- Atómicos, más granulares
- Posible overkill para esta app

### Decisión: **Opción B (Zustand)**

**Justificación:** Zustand ofrece una API más limpia que Context + useReducer para el estado global de la TUI. Con ~1KB de bundle, el overhead es insignificante. La API de `create()` con selectores evita re-renders innecesarios (importante para performance de Ink).

**Estructura del store:**

```typescript
// store/app-store.ts
interface AppStore {
  // Estado
  activeScreen: 'models' | 'chat' | 'sessions';
  activeModel: string | null;
  mode: 'plan' | 'build';
  activeSessionId: string | null;
  serverConnected: boolean;

  // Acciones
  setScreen: (screen: AppStore['activeScreen']) => void;
  setModel: (model: string) => void;
  setMode: (mode: AppStore['mode']) => void;
  setSession: (id: string | null) => void;
  setServerConnected: (connected: boolean) => void;
}
```

---

## 5. Estrategia de parsing de la respuesta del LLM ✅ DECIDIDO: Opciones A + C

### Problema

Si se decide por prompting textual (fallback del enfoque híbrido, decisión 1C), el parser necesita extraer tool calls de texto libre generado por el LLM. Los LLMs a veces generan el formato incorrectamente.

### Opciones

**A) Regex estricta** ← **ELEGIDA (parte 1)**

- Busca exactamente `<tool_call>...</tool_call>` con JSON válido dentro
- Si no matchea, toda la respuesta se trata como texto plano
- Simple, predecible

**B) Parser flexible con heurísticas**

- Intenta regex estricta primero
- Si falla, busca patrones alternativos: JSON suelto con `"name"` y `"args"`, markdown code blocks con JSON, etc.
- Más resiliente con modelos débiles

**C) Validar con Zod después del parsing** ← **ELEGIDA (parte 2)**

- Cualquier estrategia + validación Zod del JSON extraído
- Si Zod falla, tratar como texto plano

### Decisión: **A + C (regex estricta + validación Zod)**

El parser intenta una regex estricta. Si encuentra un match, valida el JSON con Zod contra el schema del tool esperado. Si la validación falla, trata todo como respuesta de texto. Esto es predecible y debuggeable. Los heurísticos de la opción B son una puerta a bugs difíciles de reproducir.

**Nota:** Este parser solo se usa en el fallback textual. La ruta nativa (Vercel AI SDK) parsea los tool calls automáticamente.

---

## 6. Cómo manejar la confirmación de permisos en modo plan via SSE ✅ DECIDIDO: Opción A

### Problema

Cuando el agente en modo plan quiere usar un tool destructivo, necesita pedir permiso al usuario. Pero la comunicación es: Server → (SSE) → TUI → (HTTP) → Server. El server está mid-loop-de-agente cuando necesita esperar la respuesta.

### Opciones

**A) El server emite un evento SSE `permission_request`, pausa el loop, y expone un endpoint `POST /api/sessions/:id/permission` que la TUI llama con `{ granted: bool }`. El loop del agente espera (con `await` sobre una promise que se resuelve cuando el endpoint recibe la respuesta).** ← **ELEGIDA**

- Ventaja: limpio, RESTful
- Riesgo: el loop del agente está bloqueado esperando. Si la TUI muere, el loop queda colgado indefinidamente → necesita timeout

**B) Websockets bidireccionales**

- Ventaja: comunicación bidireccional natural
- Riesgo: cambia la arquitectura de SSE a WS para un solo caso de uso. Más complejidad

### Decisión: **Opción A con timeout de 5 minutos**

SSE para streaming + REST para la respuesta de permisos. Si no hay respuesta en 5 minutos, se deniega automáticamente el permiso y el loop continúa. Esto mantiene la arquitectura simple (SSE solo va server→client, REST es client→server).

---

## 7. Formato de almacenamiento de mensajes con tool calls ✅ DECIDIDO: Opción A

### Problema

Un turno del agente puede incluir: texto de razonamiento + tool call + tool result + más texto. ¿Cómo se guarda en la tabla `messages`?

### Opciones

**A) Un registro por "pieza"** ← **ELEGIDA**

- role=assistant content="Voy a leer el archivo" → row 1
- role=tool_call toolName="read_file" toolArgs="{...}" → row 2
- role=tool_result toolName="read_file" toolResult="contenido..." → row 3
- role=assistant content="El archivo contiene..." → row 4
- Ventaja: granular, fácil de renderizar en la TUI pieza por pieza
- Riesgo: muchos rows por turno

**B) Un registro por turno del agente, con JSON embebido**

- role=assistant content="{texto + tool_calls + tool_results serializado}"
- Ventaja: menos rows, un turno = un row
- Riesgo: parsing complejo, difícil de querier parcialmente

### Decisión: **Opción A (un registro por pieza)**

Justificación: Es más natural para reconstruir el historial tanto en la TUI como para inyectar en el contexto del LLM. El overhead de rows es negligible con SQLite. Cada mensaje tiene un `sequence` integer para mantener el orden.
