# 06 — Riesgos Técnicos

Partes del proyecto con mayor probabilidad de dar problemas, ordenadas por severidad. Cada riesgo incluye: descripción, impacto, probabilidad, mitigación concreta y **plan de acción ejecutable**.

---

## Riesgo 1: Calidad del tool calling con modelos locales pequeños

**Probabilidad:** Alta  
**Impacto:** Crítico (el agente no funciona si el LLM no sigue instrucciones)

### Descripción

Los modelos de 7B-13B parámetros (los que la mayoría de usuarios puede correr localmente) tienen capacidad limitada para seguir instrucciones complejas de formato. El modelo puede:

- Ignorar las instrucciones de tool calling por completo
- Generar JSON malformado dentro del tag `<tool_call>`
- Inventar tools que no existen
- Llamar tools con parámetros incorrectos o incompletos
- Entrar en loops infinitos repitiendo la misma tool call

### Mitigación

1. **Enfoque híbrido (Decisión 1C) con Vercel AI SDK:** La ruta nativa del SDK (`streamText({ tools })`) se intenta primero. Si el modelo no soporta tools o falla consistentemente, fallback a prompting textual con regex + Zod
2. **Validación Zod estricta:** Todo tool call parseado (nativo o textual) se valida contra el schema. Si falla, se trata como respuesta de texto
3. **Guard contra loops:** Máximo de iteraciones (default 25) y detección de repetición (si la misma tool call se repite 3 veces consecutivas, parar)
4. **Documentar modelos probados:** En el README, listar qué modelos funcionan bien y cuáles no, con la versión de Ollama testeada
5. **Fallback graceful:** Si el parsing falla, el agente retorna la respuesta como texto plano en vez de crashear

### Plan de mitigación ejecutable

#### Fase de validación (durante Fase 3 del desarrollo)

1. **Crear script `scripts/test-models.ts`** que:
   - Conecta a Ollama, enumera modelos instalados
   - Ejecuta 5 escenarios predefinidos con cada modelo:
     - "Lee el archivo README.md" → espera `read_file`
     - "Lista los archivos en /tmp" → espera `list_files`
     - "Busca la palabra 'error' en los logs" → espera `search_files`
     - "Crea un archivo test.txt" → espera `write_file`
     - "Ejecuta `echo hello`" → espera `bash`
   - Registra: tool call válido (sí/no), JSON válido (sí/no), parámetros correctos (sí/no)
   - Genera un reporte con tasa de éxito por modelo

2. **Thresholds de aceptabilidad:**
   - ≥80% tool calls válidos → ✅ Modelo recomendado
   - 50-79% → ⚠️ Funciona con limitaciones
   - <50% → ❌ No recomendado

3. **Documentar en `MODELS.md`:**
   - Tabla: modelo, versión Ollama, tasa de éxito nativo, tasa de éxito textual, recomendación
   - Modelos target: Llama 3.1 8B, Qwen 2.5 7B/14B, Deepseek Coder 6.7B, Mistral 7B, Codellama 7B/13B

4. **Auto-detección en runtime:**
   - Primera llamada con tools nativos. Si falla 3 veces seguidas → switch a textual
   - Flag en config: `toolMode: 'auto' | 'native' | 'textual'` (default: `auto`)
   - Log en cada switch para debugging

---

## Riesgo 2: Compatibilidad de Ink/React en Windows Terminal

**Probabilidad:** Media-Alta  
**Impacto:** Alto (la TUI no se renderiza correctamente)

### Descripción

Ink usa ANSI escape codes para renderizar la UI. Windows tiene históricamente mal soporte de ANSI:

- `cmd.exe` no soporta ANSI por defecto (requiere habilitar VT processing vía API Win32)
- Windows Terminal lo soporta, pero hay edge cases con colores, cursor positioning y limpieza de pantalla
- PowerShell ISE no soporta ANSI en absoluto
- Ink asume un terminal con soporte completo de ANSI y puede renderizar basura si falta

### Mitigación

1. **Activar VT processing explícitamente** al iniciar la TUI en Windows. Usar el módulo `supports-color` para detectar y forzar si es necesario
2. **Probar en los 3 terminales principales de Windows:** Windows Terminal, cmd.exe con VT, PowerShell 7
3. **Documentar requisitos:** "Requiere Windows Terminal o terminal con soporte ANSI"
4. **Fallback mínimo:** Si se detecta terminal sin soporte ANSI, desactivar colores y usar layout simplificado
5. **Usar `ink-testing-library`** para tests unitarios de componentes que no dependen del terminal real

### Plan de mitigación ejecutable

#### Checklist de compatibilidad (ejecutar en Fase 2)

1. **Crear `scripts/test-ansi.ts`** que:
   - Detecta el terminal actual (`process.env.TERM`, `process.env.WT_SESSION`, `process.env.ConEmuPID`)
   - Imprime secuencias ANSI de test: colores 256, true color, cursor movement, clear screen
   - Reporta qué funcionalidades están disponibles

2. **Agregar `supports-color` como dependencia de `packages/tui`**
   - En `lib/ansi-windows.ts`: si `supportsColor.stdout === false`, setear `NO_COLOR=1` y usar layout simplificado

3. **Matriz de tests manuales:**

| Terminal         | Colores | Cursor | Clear | Scroll | Resultado    |
| ---------------- | ------- | ------ | ----- | ------ | ------------ |
| Windows Terminal | ✅      | ✅     | ✅    | ✅     | Esperado: OK |
| cmd.exe (VT)     | ⚠️      | ⚠️     | ⚠️    | ⚠️     | Probar       |
| PowerShell 7     | ✅      | ✅     | ✅    | ✅     | Esperado: OK |
| PowerShell 5.1   | ⚠️      | ⚠️     | ⚠️    | ⚠️     | Probar       |
| VS Code Terminal | ✅      | ✅     | ✅    | ✅     | Esperado: OK |

4. **Mensaje de arranque:** Al iniciar la TUI, verificar soporte ANSI. Si no hay soporte:
   ```
   ⚠️ Tu terminal no soporta colores ANSI.
   Recomendamos usar Windows Terminal o VS Code terminal.
   Continuando en modo sin colores...
   ```

---

## Riesgo 3: `child_process` en Windows para el tool `bash`

**Probabilidad:** Media-Alta  
**Impacto:** Alto (tools del agente fallan)

### Descripción

`child_process.exec/spawn` se comporta diferente en Windows:

- Los paths usan `\` en vez de `/`
- Los comandos Unix comunes no existen (`cat`, `grep`, `ls` como binarios)
- Las variables de entorno se acceden con `%VAR%` en cmd y `$env:VAR` en PowerShell
- El encoding de output puede ser UTF-16 (particularmente con `cmd.exe`)
- Señales de kill (`SIGTERM`, `SIGKILL`) no funcionan igual; en Windows se necesita `taskkill`
- El shell por defecto de Node en Windows es `cmd.exe`, no `bash`

### Mitigación

1. **Usar `cross-spawn`** (o la opción `shell: true` de `spawn` con detección de shell)
2. **Normalizar paths** con `path.normalize()` y `path.resolve()` siempre antes de pasarlos a tools
3. **En el system prompt del agente**, incluir instrucción explícita: "El OS es [detectado]. Usa comandos compatibles con [shell detectada]"
4. **Para kill de procesos:** usar `process.kill(pid)` con try/catch, y en Windows complementar con `taskkill /F /PID` si falla
5. **Forzar encoding UTF-8** en la ejecución: `exec(cmd, { encoding: 'utf-8', env: { ...process.env, CHCP: '65001' } })`
6. **Timeout robusto:** usar `AbortController` con `signal` en `exec()` (Node 18+) en vez de un `setTimeout` manual

### Plan de mitigación ejecutable

#### Implementación (durante Fase 3)

1. **Crear `packages/server/src/lib/shell.ts`** con:
   - `detectShell()`: detecta `pwsh` → `powershell` → `cmd` en Windows; `bash` → `sh` en Linux (Decisión 3D)
   - `executeCommand(cmd, options)`: wrapper sobre `child_process.spawn` con:
     - Shell detectada automáticamente
     - Encoding UTF-8 forzado
     - AbortController para timeout
     - Normalización de paths en el comando
     - Captura separada de stdout/stderr
     - Truncamiento a 50KB si output excesivo

2. **Agregar `cross-spawn` como dependencia de `packages/server`**

3. **Tests unitarios para cada shell:**
   - Test con `pwsh`: ejecutar `Get-ChildItem`, verificar output
   - Test con `powershell`: ejecutar `Get-ChildItem`, verificar output
   - Test con `cmd`: ejecutar `dir`, verificar output
   - Test de encoding: ejecutar comando que genera caracteres Unicode
   - Test de timeout: ejecutar `ping -n 100 localhost`, verificar que se mata en 30s

4. **System prompt dinámico:** El prompt del agente incluye:
   ```
   ## Entorno del sistema
   - OS: {process.platform} ({os.release()})
   - Shell: {detectedShell.path}
   - Usa comandos compatibles con {shellName}
   ```

---

## Riesgo 4: Compactación de contexto pierde información crítica

**Probabilidad:** Media  
**Impacto:** Alto (el agente "olvida" lo que hizo y repite acciones o contradice sus resultados previos)

### Descripción

Cuando el historial se acerca al 75% del context length, se usa el LLM para resumir los mensajes antiguos. Pero el resumen puede:

- Perder detalles de archivos modificados (paths, contenido exacto)
- Olvidar errores previos que son relevantes para la tarea actual
- Comprimir tool results que el agente necesita recordar

### Mitigación

1. **Preservar reciente:** Los últimos N mensajes (ej: 10) NUNCA se compactan, se preservan intactos
2. **Prompt de compactación especializado:** No usar un "resume esto" genérico. El prompt debe decir: "Resume la conversación preservando: archivos modificados y sus paths, errores encontrados, decisiones tomadas, tools usados y sus resultados clave"
3. **Metadata explícita:** Además del resumen, guardar una lista estructurada de: archivos tocados, comandos ejecutados, errores encontrados. Esta metadata NO se compacta
4. **Compactación incremental:** No resumir todo de golpe. Compactar en bloques (ej: cada 20 mensajes se resume un bloque), así los resúmenes son más precisos
5. **Test de regresión:** Crear un escenario largo de test donde se sabe que la compactación ocurrirá y verificar que el agente recuerda información clave post-compactación

### Plan de mitigación ejecutable

#### Diseño de metadata no compactable (durante Fase 3)

1. **Schema de metadata por sesión** en SQLite (tabla `session_metadata`):

   ```sql
   CREATE TABLE session_metadata (
     id INTEGER PRIMARY KEY,
     session_id TEXT REFERENCES sessions(id),
     type TEXT NOT NULL,  -- 'file_modified', 'command_executed', 'error_found', 'decision_made'
     key TEXT NOT NULL,    -- ej: path del archivo, comando
     value TEXT,           -- ej: descripción breve del cambio
     created_at TEXT DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. **Prompt de compactación específico:**

   ```
   Resume la siguiente conversación entre usuario y asistente.
   Tu resumen DEBE preservar:
   1. Cada archivo que fue leído, creado o modificado (incluir paths completos)
   2. Cada comando ejecutado y su resultado relevante
   3. Cada error encontrado y cómo se resolvió
   4. Las decisiones tomadas y su justificación
   5. El estado actual de la tarea (qué falta por hacer)
   Formato: lista estructurada, no párrafos largos.
   ```

3. **Al reconstruir contexto post-compactación:**
   - Inyectar resumen como mensaje `system`
   - Inyectar metadata estructurada como segundo mensaje `system`
   - Luego los N mensajes recientes preservados

4. **Test de regresión (`scripts/test-compaction.ts`):**
   - Simular 50 mensajes con 5 tool calls
   - Forzar compactación
   - Enviar pregunta: "¿Qué archivos has modificado?"
   - Verificar que la respuesta incluye todos los paths correctos

---

## Riesgo 5: SSE reconexión y estado inconsistente

**Probabilidad:** Media  
**Impacto:** Medio (la TUI se queda colgada o pierde datos)

### Descripción

Si la conexión SSE se corta mid-streaming:

- La TUI tiene una respuesta parcial sin saber si terminó
- El server puede haber ejecutado tool calls cuyos resultados la TUI no recibió
- Si la TUI reconecta, ¿desde qué punto retoma?

### Mitigación

1. **No reconectar automáticamente el stream de chat.** Si se corta, mostrar mensaje de error y que el usuario reenvíe manualmente
2. **La TUI recarga el historial completo vía `GET /api/sessions/:id`** después de una desconexión, así sincroniza con lo que el server persistió
3. **Cada evento SSE tiene un `sequence` number.** La TUI puede detectar si le faltaron eventos
4. **El server persiste ANTES de emitir:** cada mensaje se guarda en SQLite y luego se envía por SSE. Si el SSE falla, el dato está a salvo en DB

### Plan de mitigación ejecutable

1. **Implementar `sequence` en eventos SSE** en `packages/shared/types/sse-events.ts`:

   ```typescript
   interface SSEEvent {
     sequence: number;
     type: 'token' | 'tool_call' | 'tool_result' | 'permission_request' | 'done' | 'error';
     data: unknown;
   }
   ```

2. **En el SDK (`packages/sdk/src/sse.ts`):**
   - Trackear último `sequence` recibido
   - Al detectar desconexión: marcar estado como `disconnected`
   - Exponer método `resync(sessionId)` que llama a `GET /api/sessions/:id` y reconstruye el estado

3. **En la TUI (`hooks/use-chat.ts`):**
   - Al detectar `disconnected`: mostrar banner "Conexión perdida. Presiona Enter para recargar"
   - Al recargar: llamar `resync()`, actualizar mensajes, limpiar estado de streaming

---

## Riesgo 6: Performance de Ink con mensajes largos

**Probabilidad:** Media  
**Impacto:** Medio (la TUI se pone lenta)

### Descripción

Ink re-renderiza todo el árbol de React en cada actualización. Si hay muchos mensajes en el chat (decenas de mensajes con contenido largo), el re-render puede ser lento y generar flickering.

### Mitigación

1. **Virtualización:** Solo renderizar los últimos N mensajes visibles (ej: 50). Los anteriores se omiten del render pero están disponibles en el estado
2. **`React.memo` agresivo:** Los mensajes ya terminados no cambian, memorizarlos
3. **Throttle en streaming:** Agrupar tokens y actualizar el render cada ~50ms en vez de por cada token individual
4. **Medir temprano:** Probar con 100+ mensajes desde la fase 4. Si es inaceptable, implementar virtualización antes del MVP

### Plan de mitigación ejecutable

1. **Implementar throttle desde el inicio (Fase 4):**
   - En `hooks/use-chat.ts`: acumular tokens en buffer, flush cada 50ms con `requestAnimationFrame` o `setInterval`
   - Nunca actualizar estado React por cada token individual

2. **`React.memo` en componentes de mensajes:**
   - `MessageBubble` memoizado: solo re-renderiza si `message.id` o `message.content` cambia
   - `ToolCall` memoizado: solo re-renderiza si `status` cambia (pending → done)

3. **Benchmark script (`scripts/test-ink-perf.ts`):**
   - Generar 100 mensajes simulados de largo variado
   - Medir tiempo de render con `performance.now()`
   - Si >100ms por render → implementar virtualización (ventana de 30 mensajes visibles)

---

## Riesgo 7: Ollama OOM con modelos grandes

**Probabilidad:** Media  
**Impacto:** Medio (la sesión muere sin mensaje claro)

### Descripción

Si el usuario selecciona un modelo que no cabe en su RAM/VRAM, Ollama puede:

- Crashear silenciosamente
- Retornar errores crípticos
- Funcionar pero extremadamente lento (swapping a disco)

### Mitigación

1. **Mostrar info del modelo** (tamaño, parámetros) en la pantalla de Modelos para que el usuario elija conscientemente
2. **Detectar Ollama crash:** Si la conexión al modelo falla después de responder anteriormente, mostrar "Ollama no responde. Posible out of memory. Considera usar un modelo más pequeño"
3. **Timeout generoso pero finito:** 120s sin token = error. No dejar esperando indefinidamente

### Plan de mitigación ejecutable

1. **Enriquecer pantalla de Modelos (Fase 2):**
   - Mostrar para cada modelo: nombre, tamaño en disco, número de parámetros (via `showModel()`)
   - Advertencia visual si el modelo es >8GB: `⚠️ Modelo grande — requiere >16GB RAM`

2. **Health check post-error:**
   - Si Ollama falla mid-stream, enviar `GET http://localhost:11434/` para verificar si sigue vivo
   - Si no responde: "Ollama se detuvo inesperadamente. Reinícialo con `ollama serve`"
   - Si responde pero el modelo falló: "El modelo puede ser demasiado grande para tu hardware"

3. **Timeout configurable:**
   - Default: 120s sin primer token = error
   - En config: `ollamaTimeout: number` (segundos)
   - Mensaje: "Ollama no generó respuesta en {timeout}s. Posibles causas: modelo muy grande, CPU sin soporte AVX2"

---

## Matriz resumen

| #   | Riesgo                        | Prob.      | Impacto | Criticidad | Mitigación clave                            |
| --- | ----------------------------- | ---------- | ------- | ---------- | ------------------------------------------- |
| 1   | Tool calling con modelos ≤13B | Alta       | Crítico | 🔴         | Híbrido nativo+textual via Vercel AI SDK    |
| 2   | Ink/ANSI en Windows           | Media-Alta | Alto    | 🔴         | `supports-color` + detección + fallback     |
| 3   | child_process en Windows      | Media-Alta | Alto    | 🔴         | `cross-spawn` + `detectShell()` + UTF-8     |
| 4   | Compactación pierde info      | Media      | Alto    | 🟡         | Metadata no compactable + prompt específico |
| 5   | SSE reconexión                | Media      | Medio   | 🟡         | Persist-before-emit + sequence + resync     |
| 6   | Performance de Ink            | Media      | Medio   | 🟡         | Throttle 50ms + React.memo + benchmark      |
| 7   | Ollama OOM                    | Media      | Medio   | 🟡         | Info de modelo + health check + timeout     |

---

## Inconsistencias y gaps detectados — RESUELTOS

### 1. `cmd/` Go binaries vs Node implementation ✅ RESUELTO

El spec dice que `search_files` "puede opcionalmente delegar al binario Go". Pero también dice que `cmd/` es solo para file watching y búsqueda. **Gap:** no está definido el protocolo de comunicación entre el server Node y los binarios Go.

**Resolución:** Ignorar `cmd/` por completo en el MVP. Las 6 tools se implementan en Node puro. Los binarios Go son una optimización post-MVP (Fase 5 opcional). Si se implementan, la comunicación será via stdin/stdout con JSON line-delimited.

### 2. Falta definición de `list_files` depth default ✅ RESUELTO

El spec dice "profundidad configurable" pero no especifica el default.

**Resolución:**

- Default: **3 niveles** de profundidad
- Máximo permitido: **10 niveles**
- Exclusiones automáticas: `node_modules`, `.git`, `dist`, `build`, `__pycache__`, `.next`, `.venv`
- El LLM puede especificar `maxDepth` en el tool call si necesita más

### 3. Falta política de rate limiting del agente ✅ RESUELTO

Si el LLM entra en un loop haciendo tool calls rápidas (ej: 25 `bash` commands en 30 segundos), puede causar daño antes de que el usuario reaccione.

**Resolución:**

- **Modo plan:** cada tool destructivo requiere confirmación → rate limiting implícito
- **Modo build:** agregar delay mínimo de **500ms** entre tool calls destructivos (`write_file`, `edit_file`, `bash`)
- **Detección de repetición:** si el mismo tool call (mismo nombre + mismos args) se repite 3 veces consecutivas, parar el loop con error "Posible loop detectado"
- **Max tools por turno:** máximo **25 iteraciones** (ya definido en `maxIterations`)
