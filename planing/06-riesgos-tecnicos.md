# 06 — Riesgos Técnicos

Partes del proyecto con mayor probabilidad de dar problemas, ordenadas por severidad. Cada riesgo incluye: descripción, impacto, probabilidad y mitigación concreta.

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
1. **Prompt engineering exhaustivo:** Iterar el system prompt con los 3-4 modelos más populares en Ollama (Llama 3.1 8B, Qwen 2.5 7B, Deepseek Coder 6.7B, Mistral 7B). El prompt debe incluir ejemplos concretos de uso correcto
2. **Validación Zod estricta:** Todo tool call parseado se valida contra el schema. Si falla, se trata como respuesta de texto
3. **Guard contra loops:** Máximo de iteraciones (default 25) y detección de repetición (si la misma tool call se repite 3 veces consecutivas, parar)
4. **Documentar modelos probados:** En el README, listar qué modelos funcionan bien y cuáles no, con la versión de Ollama testeada
5. **Fallback graceful:** Si el parsing falla, el agente retorna la respuesta como texto plano en vez de crashear

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
3. **Metadata explicita:** Además del resumen, guardar una lista estructurada de: archivos tocados, comandos ejecutados, errores encontrados. Esta metadata NO se compacta
4. **Compactación incremental:** No resumir todo de golpe. Compactar en bloques (ej: cada 20 mensajes se resume un bloque), así los resúmenes son más precisos
5. **Test de regresión:** Crear un escenario largo de test donde se sabe que la compactación ocurrirá y verificar que el agente recuerda información clave post-compactación

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

---

## Matriz resumen

| # | Riesgo | Prob. | Impacto | Criticidad |
|---|--------|-------|---------|------------|
| 1 | Tool calling con modelos ≤13B | Alta | Crítico | 🔴 |
| 2 | Ink/ANSI en Windows | Media-Alta | Alto | 🔴 |
| 3 | child_process en Windows | Media-Alta | Alto | 🔴 |
| 4 | Compactación pierde info | Media | Alto | 🟡 |
| 5 | SSE reconexión | Media | Medio | 🟡 |
| 6 | Performance de Ink | Media | Medio | 🟡 |
| 7 | Ollama OOM | Media | Medio | 🟡 |

---

## Inconsistencias y gaps detectados

### 1. `cmd/` Go binaries vs Node implementation
El spec dice que `search_files` "puede opcionalmente delegar al binario Go". Pero también dice que `cmd/` es solo para file watching y búsqueda. **Gap:** no está definido el protocolo de comunicación entre el server Node y los binarios Go (stdin/stdout con JSON? flags de CLI? socket?). Para el MVP sugiero ignorar `cmd/` por completo y usar implementaciones puras en Node. Los binarios Go son una optimización post-MVP.

### 2. Falta definición de `list_files` depth default
El spec dice "profundidad configurable" pero no especifica el default. **Recomendación:** default 3 niveles, max 10, con exclusiones automáticas de `node_modules`, `.git`, `dist`, `build`.

### 3. Falta política de rate limiting del agente
Si el LLM entra en un loop haciendo tool calls rápidas (ej: 25 `bash` commands en 30 segundos), puede causar daño antes de que el usuario reaccione. **Recomendación:** en modo build, agregar un delay mínimo de 500ms entre tool calls destructivos. En modo plan es innecesario porque cada una requiere confirmación.
