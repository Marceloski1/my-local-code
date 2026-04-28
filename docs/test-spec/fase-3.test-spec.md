# Test Spec — Fase 3: Tools del Agente + Loop ReAct

> **Paquete objetivo:** `packages/server`  
> **Framework:** Vitest  
> **Prerrequisitos:** Leer `docs/test-spec/setup.md` para la configuración base y mocks compartidos.

---

## 1. Shell Detection — `lib/shell.ts`

### Archivo: `src/__tests__/unit/shell.test.ts`

| #   | Nombre del Test                                                | Tipo     | Descripción                                                            | Resultado Esperado                                                 |
| --- | -------------------------------------------------------------- | -------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | `detectShell debe retornar pwsh en Windows si está disponible` | Unitario | Mockear `platform` como `'win32'` y `execSync` para que `pwsh` exista. | Retorna `{ path: 'pwsh', args: ['-NoProfile', '-Command'] }`       |
| 2   | `detectShell debe retornar powershell si pwsh no existe`       | Unitario | Mockear `platform` como `'win32'`. `pwsh` falla, `powershell` existe.  | Retorna `{ path: 'powershell', args: ['-NoProfile', '-Command'] }` |
| 3   | `detectShell debe retornar cmd.exe como fallback en Windows`   | Unitario | Mockear `platform` como `'win32'`. Ambos `pwsh` y `powershell` fallan. | Retorna `{ path: 'cmd.exe', args: ['/C'] }`                        |
| 4   | `detectShell debe retornar bash en Linux si está disponible`   | Unitario | Mockear `platform` como `'linux'` y `execSync` para que `bash` exista. | Retorna `{ path: 'bash', args: ['-c'] }`                           |
| 5   | `detectShell debe retornar sh como fallback en Linux`          | Unitario | Mockear `platform` como `'linux'`. `bash` falla, `sh` existe.          | Retorna `{ path: 'sh', args: ['-c'] }`                             |
| 6   | `getShellInfo debe retornar OS y shell correctos para Windows` | Unitario | Mockear `platform` como `'win32'` y shell detectado como `'pwsh'`.     | Retorna `{ os: 'Windows', shell: 'pwsh' }`                         |
| 7   | `getShellInfo debe retornar OS y shell correctos para Linux`   | Unitario | Mockear `platform` como `'linux'` y shell detectado como `'bash'`.     | Retorna `{ os: 'Linux', shell: 'bash' }`                           |
| 8   | `getShellInfo debe retornar OS y shell correctos para macOS`   | Unitario | Mockear `platform` como `'darwin'` y shell detectado como `'bash'`.    | Retorna `{ os: 'macOS', shell: 'bash' }`                           |

#### Notas de implementación:

- Mockear `process.platform` con `vi.stubGlobal('process', { platform: 'win32' })`.
- Mockear `execSync` de `node:child_process` con `vi.mock('node:child_process')`.
- Simular que un comando falla lanzando un error en el mock.
- Restaurar con `vi.restoreAllMocks()` en `afterEach`.

---

## 2. Tool: read_file — `tools/read-file.ts`

### Archivo: `src/__tests__/unit/tools/read-file.test.ts`

| #   | Nombre del Test                                               | Tipo     | Descripción                                                         | Resultado Esperado                                                  |
| --- | ------------------------------------------------------------- | -------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 9   | `read_file debe leer un archivo existente`                    | Unitario | Crear un archivo temporal con contenido conocido. Ejecutar el tool. | `success: true`, `output` contiene el contenido del archivo         |
| 10  | `read_file debe retornar error si el archivo no existe`       | Unitario | Intentar leer un archivo que no existe.                             | `success: false`, `error` contiene mensaje de archivo no encontrado |
| 11  | `read_file debe truncar archivos >100KB`                      | Unitario | Crear un archivo de 150KB. Ejecutar el tool.                        | `output` contiene solo los primeros 100KB + mensaje de truncamiento |
| 12  | `read_file debe manejar rutas relativas correctamente`        | Unitario | Usar una ruta relativa como `./test/file.txt`.                      | El archivo se lee correctamente desde el directorio de trabajo      |
| 13  | `read_file debe rechazar rutas absolutas fuera del workspace` | Unitario | Intentar leer `/etc/passwd` o `C:\Windows\System32\config`.         | `success: false`, `error` indica ruta no permitida                  |
| 14  | `read_file debe manejar archivos vacíos`                      | Unitario | Crear un archivo vacío (0 bytes). Ejecutar el tool.                 | `success: true`, `output` es string vacío                           |

#### Notas de implementación:

- Usar `fs.mkdtempSync()` para crear un directorio temporal de test.
- Limpiar archivos temporales en `afterEach`.
- Para el test 11, crear un archivo con `Buffer.alloc(150 * 1024).fill('a')`.

---

## 3. Tool: write_file — `tools/write-file.ts`

### Archivo: `src/__tests__/unit/tools/write-file.test.ts`

| #   | Nombre del Test                                                | Tipo     | Descripción                                                                | Resultado Esperado                                             |
| --- | -------------------------------------------------------------- | -------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 15  | `write_file debe crear un archivo nuevo`                       | Unitario | Ejecutar el tool con un path que no existe.                                | `success: true`, el archivo se crea con el contenido correcto  |
| 16  | `write_file debe sobreescribir un archivo existente`           | Unitario | Crear un archivo con contenido A. Ejecutar el tool con contenido B.        | El archivo ahora contiene B (no A)                             |
| 17  | `write_file debe crear directorios padres automáticamente`     | Unitario | Ejecutar con path `nested/deep/file.txt` donde los directorios no existen. | Los directorios se crean y el archivo se escribe correctamente |
| 18  | `write_file debe rechazar rutas absolutas fuera del workspace` | Unitario | Intentar escribir en `/tmp/file.txt` o `C:\file.txt`.                      | `success: false`, `error` indica ruta no permitida             |
| 19  | `write_file debe manejar contenido vacío`                      | Unitario | Ejecutar con `content: ''`.                                                | `success: true`, el archivo se crea vacío                      |
| 20  | `write_file debe manejar contenido con caracteres especiales`  | Unitario | Ejecutar con contenido que incluya emojis, UTF-8, saltos de línea.         | El archivo se escribe correctamente con encoding UTF-8         |

---

## 4. Tool: edit_file — `tools/edit-file.ts`

### Archivo: `src/__tests__/unit/tools/edit-file.test.ts`

| #   | Nombre del Test                                                  | Tipo     | Descripción                                                                           | Resultado Esperado                                              |
| --- | ---------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 21  | `edit_file debe reemplazar la primera ocurrencia de oldText`     | Unitario | Crear archivo con `"foo\nbar\nfoo"`. Ejecutar con `oldText: 'foo'`, `newText: 'baz'`. | El archivo contiene `"baz\nbar\nfoo"` (solo primera ocurrencia) |
| 22  | `edit_file debe retornar error si oldText no se encuentra`       | Unitario | Ejecutar con `oldText` que no existe en el archivo.                                   | `success: false`, `error` indica que el texto no fue encontrado |
| 23  | `edit_file debe retornar error si el archivo no existe`          | Unitario | Ejecutar con un path que no existe.                                                   | `success: false`, `error` indica archivo no encontrado          |
| 24  | `edit_file debe manejar reemplazos multilínea`                   | Unitario | Crear archivo con múltiples líneas. Reemplazar un bloque de 3 líneas.                 | El bloque se reemplaza correctamente                            |
| 25  | `edit_file debe preservar el resto del archivo sin cambios`      | Unitario | Archivo con 10 líneas. Reemplazar línea 5. Verificar líneas 1-4 y 6-10.               | Solo la línea 5 cambia, el resto permanece igual                |
| 26  | `edit_file debe manejar oldText con caracteres especiales regex` | Unitario | Usar `oldText` con caracteres como `$`, `^`, `*`, `(`, `)`.                           | El reemplazo funciona correctamente (no interpreta como regex)  |

---

## 5. Tool: bash — `tools/bash.ts`

### Archivo: `src/__tests__/unit/tools/bash.test.ts`

| #   | Nombre del Test                                                   | Tipo     | Descripción                                                                                     | Resultado Esperado                                        |
| --- | ----------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 27  | `bash debe ejecutar un comando simple y retornar stdout`          | Unitario | Ejecutar `echo "hello"` (o `Write-Output "hello"` en Windows).                                  | `success: true`, `output` contiene `"hello"`              |
| 28  | `bash debe capturar stderr en el output`                          | Unitario | Ejecutar un comando que escribe a stderr (ej: `node -e "console.error('err')"`).                | `output` contiene el mensaje de stderr                    |
| 29  | `bash debe retornar error cuando el comando falla (exit code ≠0)` | Unitario | Ejecutar un comando que falla (ej: `exit 1` o `node -e "process.exit(1)"`).                     | `success: false`, `error` contiene información del fallo  |
| 30  | `bash debe usar el shell detectado correctamente`                 | Unitario | Mockear `detectShell()` para retornar un shell específico. Verificar que `spawn` usa ese shell. | `spawn` es llamado con el path y args del shell detectado |
| 31  | `bash debe aplicar timeout de 30 segundos`                        | Unitario | Ejecutar un comando que duerme >30s (ej: `sleep 35` o `Start-Sleep 35`). Mockear timer.         | El comando se termina con error de timeout                |
| 32  | `bash debe manejar comandos con argumentos complejos`             | Unitario | Ejecutar comando con comillas, espacios, caracteres especiales.                                 | El comando se ejecuta correctamente                       |
| 33  | `bash debe usar el cwd proporcionado si se especifica`            | Unitario | Ejecutar con `cwd: './subdir'`. Verificar que `spawn` recibe ese cwd.                           | `spawn` es llamado con `cwd: './subdir'`                  |

#### Notas de implementación:

- Mockear `detectShell()` con `vi.mock('../lib/shell.js')`.
- Para el test 31, usar `vi.useFakeTimers()` y `vi.advanceTimersByTime()`.
- Espiar `spawn` de `node:child_process` para verificar argumentos.

---

## 6. Tool: list_files — `tools/list-files.ts`

### Archivo: `src/__tests__/unit/tools/list-files.test.ts`

| #   | Nombre del Test                                             | Tipo     | Descripción                                                                             | Resultado Esperado                                            |
| --- | ----------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 34  | `list_files debe listar archivos en un directorio`          | Unitario | Crear estructura temporal: `dir/file1.txt`, `dir/file2.js`. Ejecutar con `path: 'dir'`. | `output` contiene `file1.txt` y `file2.js`                    |
| 35  | `list_files debe usar depth=3 por defecto`                  | Unitario | Crear estructura con 4 niveles de profundidad. Ejecutar sin especificar depth.          | Solo se listan hasta 3 niveles de profundidad                 |
| 36  | `list_files debe respetar el depth especificado`            | Unitario | Crear estructura con 3 niveles. Ejecutar con `depth: 1`.                                | Solo se lista el primer nivel                                 |
| 37  | `list_files debe limitar a depth=10 máximo`                 | Unitario | Ejecutar con `depth: 15`.                                                               | Se usa depth=10 (máximo permitido)                            |
| 38  | `list_files debe excluir node_modules por defecto`          | Unitario | Crear `dir/node_modules/pkg/file.js` y `dir/src/file.js`. Ejecutar con `path: 'dir'`.   | `output` contiene `src/file.js` pero NO `node_modules`        |
| 39  | `list_files debe excluir .git por defecto`                  | Unitario | Crear `dir/.git/config` y `dir/src/file.js`. Ejecutar.                                  | `output` contiene `src/file.js` pero NO `.git`                |
| 40  | `list_files debe excluir dist y build por defecto`          | Unitario | Crear `dir/dist/bundle.js`, `dir/build/out.js`, `dir/src/file.js`. Ejecutar.            | `output` contiene solo `src/file.js`                          |
| 41  | `list_files debe retornar error si el directorio no existe` | Unitario | Ejecutar con `path: 'noexiste'`.                                                        | `success: false`, `error` indica directorio no encontrado     |
| 42  | `list_files debe manejar directorios vacíos`                | Unitario | Crear un directorio vacío. Ejecutar.                                                    | `success: true`, `output` indica que el directorio está vacío |

---

## 7. Tool: search_files — `tools/search-files.ts`

### Archivo: `src/__tests__/unit/tools/search-files.test.ts`

| #   | Nombre del Test                                              | Tipo     | Descripción                                                                            | Resultado Esperado                                                |
| --- | ------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 43  | `search_files debe encontrar coincidencias en archivos`      | Unitario | Crear `file1.txt` con `"hello world"` y `file2.txt` con `"goodbye"`. Buscar `"hello"`. | `output` contiene `file1.txt` con la línea que contiene `"hello"` |
| 44  | `search_files debe buscar recursivamente en subdirectorios`  | Unitario | Crear `dir/sub/file.txt` con `"target"`. Buscar `"target"` desde `dir`.                | `output` contiene `sub/file.txt` con la coincidencia              |
| 45  | `search_files debe limitar resultados a 50 coincidencias`    | Unitario | Crear 60 archivos con la palabra buscada. Ejecutar.                                    | `output` contiene máximo 50 resultados + mensaje de truncamiento  |
| 46  | `search_files debe ser case-insensitive por defecto`         | Unitario | Crear archivo con `"Hello"`. Buscar `"hello"`.                                         | Encuentra la coincidencia                                         |
| 47  | `search_files debe excluir node_modules, .git, dist, build`  | Unitario | Crear coincidencias en `node_modules/`, `.git/`, `dist/`, `build/` y `src/`. Buscar.   | Solo encuentra la coincidencia en `src/`                          |
| 48  | `search_files debe retornar mensaje si no hay coincidencias` | Unitario | Buscar un patrón que no existe en ningún archivo.                                      | `success: true`, `output` indica que no se encontraron resultados |
| 49  | `search_files debe manejar patrones regex simples`           | Unitario | Crear archivo con `"test123"`. Buscar `"test\\d+"`.                                    | Encuentra la coincidencia                                         |
| 50  | `search_files debe incluir número de línea en resultados`    | Unitario | Crear archivo multilínea. Buscar patrón en línea 5.                                    | `output` incluye `:5:` indicando el número de línea               |

#### Notas de implementación:

- Usar `grep` o `ripgrep` si está disponible, o implementar búsqueda con `fs.readFileSync()`.
- Para el test 45, verificar que el output incluye un mensaje como `"... (truncated, 10 more results)"`.

---

## 8. Tool Registry — `tools/registry.ts`

### Archivo: `src/__tests__/unit/tools/registry.test.ts`

| #   | Nombre del Test                                                        | Tipo     | Descripción                                                                                                           | Resultado Esperado                                                         |
| --- | ---------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 51  | `getToolRegistry debe retornar los 6 tools`                            | Unitario | Llamar `getToolRegistry()`.                                                                                           | Retorna un `Map` con 6 entradas                                            |
| 52  | `getToolRegistry debe incluir todos los nombres esperados`             | Unitario | Verificar que el Map contiene las keys: `read_file`, `write_file`, `edit_file`, `bash`, `list_files`, `search_files`. | Todas las keys están presentes                                             |
| 53  | `getVercelTools debe retornar tools en formato Vercel SDK`             | Unitario | Llamar `getVercelTools()`. Verificar estructura de cada tool.                                                         | Cada tool tiene `description` (string) y `parameters` (ZodSchema)          |
| 54  | `executeTool debe ejecutar un tool válido`                             | Unitario | Llamar `executeTool('read_file', { path: 'test.txt' })` con archivo existente.                                        | Retorna `ToolResult` con `success: true`                                   |
| 55  | `executeTool debe retornar error si el tool no existe`                 | Unitario | Llamar `executeTool('nonexistent', {})`.                                                                              | Retorna `{ success: false, error: 'Tool not found: nonexistent' }`         |
| 56  | `executeTool debe validar params con Zod schema`                       | Unitario | Llamar `executeTool('read_file', { invalid: 'params' })`.                                                             | Retorna `{ success: false, error: 'Validation failed' }`                   |
| 57  | `getToolDefinitions debe retornar array con name, description, schema` | Unitario | Llamar `getToolDefinitions()`.                                                                                        | Retorna array de 6 elementos, cada uno con `name`, `description`, `schema` |
| 58  | `requiresPermission debe retornar true para tools destructivos`        | Unitario | Llamar con `'write_file'`, `'edit_file'`, `'bash'`.                                                                   | Retorna `true` para los 3                                                  |
| 59  | `requiresPermission debe retornar false para tools de lectura`         | Unitario | Llamar con `'read_file'`, `'list_files'`, `'search_files'`.                                                           | Retorna `false` para los 3                                                 |

---

## 9. System Prompt — `agent/prompt.ts`

### Archivo: `src/__tests__/unit/agent/prompt.test.ts`

| #   | Nombre del Test                                            | Tipo     | Descripción                                                                                 | Resultado Esperado                                                |
| --- | ---------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 60  | `buildSystemPrompt debe incluir instrucciones ReAct`       | Unitario | Llamar `buildSystemPrompt({ mode: 'plan', tools: [] })`.                                    | El prompt contiene texto sobre "Thought", "Action", "Observation" |
| 61  | `buildSystemPrompt debe incluir información de OS y shell` | Unitario | Mockear `getShellInfo()` para retornar `{ os: 'Linux', shell: 'bash' }`. Llamar la función. | El prompt contiene `"OS: Linux"` y `"Shell: bash"`                |
| 62  | `buildSystemPrompt debe incluir descripciones de tools`    | Unitario | Pasar 2 tools con descripciones conocidas.                                                  | El prompt contiene ambas descripciones de tools                   |
| 63  | `buildSystemPrompt debe incluir formato de tool_call XML`  | Unitario | Llamar la función.                                                                          | El prompt contiene ejemplo de `<tool_call>` con JSON              |
| 64  | `buildSystemPrompt debe mencionar modo plan con permisos`  | Unitario | Llamar con `mode: 'plan'`.                                                                  | El prompt menciona que tools destructivos requieren permiso       |
| 65  | `buildSystemPrompt debe mencionar modo build sin permisos` | Unitario | Llamar con `mode: 'build'`.                                                                 | El prompt indica que tools se ejecutan automáticamente            |
| 66  | `buildSystemPrompt debe incluir límite de iteraciones`     | Unitario | Llamar la función.                                                                          | El prompt menciona el límite de iteraciones (ej: 10)              |

#### Notas de implementación:

- Mockear `getShellInfo()` de `../lib/shell.js`.
- Verificar presencia de strings clave en el prompt generado.

---

## 10. Parser Textual — `agent/parser.ts`

### Archivo: `src/__tests__/unit/agent/parser.test.ts`

| #   | Nombre del Test                                                 | Tipo     | Descripción                                                                      | Resultado Esperado                                                 |
| --- | --------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 67  | `parseToolCalls debe parsear un tool call válido`               | Unitario | Texto: `<tool_call>{"name":"read_file","args":{"path":"test.txt"}}</tool_call>`. | Retorna array con 1 elemento: `{ name: 'read_file', args: {...} }` |
| 68  | `parseToolCalls debe parsear múltiples tool calls`              | Unitario | Texto con 3 `<tool_call>` tags.                                                  | Retorna array con 3 elementos                                      |
| 69  | `parseToolCalls debe ignorar tool calls con JSON inválido`      | Unitario | Incluir un `<tool_call>{invalid json}</tool_call>`.                              | Ese tool call es ignorado, no lanza excepción                      |
| 70  | `parseToolCalls debe validar estructura con Zod`                | Unitario | Incluir `<tool_call>{"wrong":"structure"}</tool_call>` (sin `name` o `args`).    | Ese tool call es ignorado                                          |
| 71  | `parseToolCalls debe manejar whitespace alrededor del JSON`     | Unitario | Texto: `<tool_call>  \n  {"name":"bash","args":{}}  \n  </tool_call>`.           | Parsea correctamente                                               |
| 72  | `parseToolCalls debe retornar array vacío si no hay tool calls` | Unitario | Texto sin ningún `<tool_call>`.                                                  | Retorna `[]`                                                       |
| 73  | `hasToolCalls debe retornar true si hay tool calls`             | Unitario | Texto con al menos un `<tool_call>`.                                             | Retorna `true`                                                     |
| 74  | `hasToolCalls debe retornar false si no hay tool calls`         | Unitario | Texto sin `<tool_call>`.                                                         | Retorna `false`                                                    |
| 75  | `extractFirstToolCall debe retornar el primer tool call`        | Unitario | Texto con 3 tool calls.                                                          | Retorna solo el primero                                            |
| 76  | `extractFirstToolCall debe retornar null si no hay tool calls`  | Unitario | Texto sin tool calls.                                                            | Retorna `null`                                                     |

---

## 11. Context Compaction — `agent/context.ts`

### Archivo: `src/__tests__/unit/agent/context.test.ts`

| #   | Nombre del Test                                                  | Tipo     | Descripción                                                                                               | Resultado Esperado                                           |
| --- | ---------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 77  | `estimateTokens debe usar heurística chars/4`                    | Unitario | Llamar con string de 400 caracteres.                                                                      | Retorna `100` tokens                                         |
| 78  | `estimateTokens debe redondear hacia arriba`                     | Unitario | Llamar con string de 401 caracteres.                                                                      | Retorna `101` tokens (no 100.25)                             |
| 79  | `messageTokens debe sumar content + toolArgs + toolResult`       | Unitario | Crear mensaje con `content: 'a'.repeat(100)`, `toolArgs: 'b'.repeat(100)`, `toolResult: 'c'.repeat(100)`. | Retorna aproximadamente `75` tokens (300 chars / 4)          |
| 80  | `historyTokens debe sumar tokens de todos los mensajes`          | Unitario | Crear array de 3 mensajes con 100 chars cada uno.                                                         | Retorna aproximadamente `75` tokens (300 chars total / 4)    |
| 81  | `shouldCompact debe retornar true cuando se excede el threshold` | Unitario | Crear mensajes que sumen 4000 tokens. Llamar con `contextLength: 4096`.                                   | Retorna `true` (4000 > 4096 \* 0.75)                         |
| 82  | `shouldCompact debe retornar false cuando no se excede`          | Unitario | Crear mensajes que sumen 2000 tokens. Llamar con `contextLength: 4096`.                                   | Retorna `false` (2000 < 4096 \* 0.75)                        |
| 83  | `getRecentMessages debe retornar los últimos N mensajes`         | Unitario | Crear array de 20 mensajes. Llamar con `keepCount: 10`.                                                   | Retorna los últimos 10 mensajes                              |
| 84  | `getRecentMessages debe retornar todos si hay menos de N`        | Unitario | Crear array de 5 mensajes. Llamar con `keepCount: 10`.                                                    | Retorna los 5 mensajes                                       |
| 85  | `getOldMessages debe retornar los primeros M mensajes`           | Unitario | Crear array de 20 mensajes. Llamar con `keepCount: 10`.                                                   | Retorna los primeros 10 mensajes                             |
| 86  | `getOldMessages debe retornar array vacío si hay menos de N`     | Unitario | Crear array de 5 mensajes. Llamar con `keepCount: 10`.                                                    | Retorna `[]`                                                 |
| 87  | `buildCompactionPrompt debe incluir resumen de mensajes`         | Unitario | Crear 3 mensajes con roles diferentes. Llamar la función.                                                 | El prompt contiene información de los 3 mensajes             |
| 88  | `buildCompactionPrompt debe truncar contenido largo`             | Unitario | Crear mensaje con `content` de 500 caracteres.                                                            | El prompt incluye solo los primeros 100 caracteres + `"..."` |

---

## 12. Permissions — `agent/permissions.ts`

### Archivo: `src/__tests__/unit/agent/permissions.test.ts`

| #   | Nombre del Test                                                      | Tipo     | Descripción                                                     | Resultado Esperado                                            |
| --- | -------------------------------------------------------------------- | -------- | --------------------------------------------------------------- | ------------------------------------------------------------- |
| 89  | `requiresPermissionInPlanMode debe retornar true para write_file`    | Unitario | Llamar con `'write_file'`.                                      | Retorna `true`                                                |
| 90  | `requiresPermissionInPlanMode debe retornar true para edit_file`     | Unitario | Llamar con `'edit_file'`.                                       | Retorna `true`                                                |
| 91  | `requiresPermissionInPlanMode debe retornar true para bash`          | Unitario | Llamar con `'bash'`.                                            | Retorna `true`                                                |
| 92  | `requiresPermissionInPlanMode debe retornar false para read_file`    | Unitario | Llamar con `'read_file'`.                                       | Retorna `false`                                               |
| 93  | `requiresPermissionInPlanMode debe retornar false para list_files`   | Unitario | Llamar con `'list_files'`.                                      | Retorna `false`                                               |
| 94  | `requiresPermissionInPlanMode debe retornar false para search_files` | Unitario | Llamar con `'search_files'`.                                    | Retorna `false`                                               |
| 95  | `buildPermissionRequest debe formatear el mensaje correctamente`     | Unitario | Llamar con `toolName: 'bash'`, `args: { command: 'rm -rf /' }`. | El mensaje contiene el nombre del tool y los args formateados |
| 96  | `isPermissionGranted debe retornar true para "yes"`                  | Unitario | Llamar con `'yes'`.                                             | Retorna `true`                                                |
| 97  | `isPermissionGranted debe retornar true para "y"`                    | Unitario | Llamar con `'y'`.                                               | Retorna `true`                                                |
| 98  | `isPermissionGranted debe retornar true para "yes " (con espacios)`  | Unitario | Llamar con `'  yes  '`.                                         | Retorna `true` (normaliza whitespace)                         |
| 99  | `isPermissionGranted debe retornar false para "no"`                  | Unitario | Llamar con `'no'`.                                              | Retorna `false`                                               |
| 100 | `isPermissionGranted debe retornar false para respuestas ambiguas`   | Unitario | Llamar con `'maybe'`, `'ok'`, `''`.                             | Retorna `false` para todos                                    |

---

## 13. Agent Loop — `agent/loop.ts`

### Archivo: `src/__tests__/integration/agent-loop.test.ts`

| #   | Nombre del Test                                                        | Tipo    | Descripción                                                                                     | Resultado Esperado                                                        |
| --- | ---------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 101 | `runAgent debe generar eventos de tipo token`                          | Integr. | Mockear `streamText` para retornar chunks de texto. Iterar sobre el generador.                  | Genera eventos con `type: 'token'` y `data` con el chunk                  |
| 102 | `runAgent debe incrementar sequence en cada evento`                    | Integr. | Iterar sobre varios eventos.                                                                    | Cada evento tiene `sequence` mayor que el anterior                        |
| 103 | `runAgent debe detectar tool calls en la respuesta`                    | Integr. | Mockear respuesta con `<tool_call>{"name":"read_file","args":{"path":"test.txt"}}</tool_call>`. | Genera evento `type: 'tool_call'` con los datos del tool                  |
| 104 | `runAgent debe ejecutar el tool y generar tool_result`                 | Integr. | Mockear `executeTool` para retornar resultado exitoso.                                          | Genera evento `type: 'tool_result'` con el resultado                      |
| 105 | `runAgent debe agregar tool result al historial`                       | Integr. | Después de ejecutar un tool, verificar que el siguiente mensaje incluye el resultado.           | El historial contiene mensaje con el resultado del tool                   |
| 106 | `runAgent debe generar evento done cuando no hay más tool calls`       | Integr. | Mockear respuesta sin tool calls.                                                               | Genera evento `type: 'done'` con la respuesta final                       |
| 107 | `runAgent debe detectar loops (3 repeticiones del mismo tool)`         | Integr. | Mockear 3 iteraciones con el mismo tool call idéntico.                                          | Genera evento `type: 'error'` con mensaje de loop detectado               |
| 108 | `runAgent debe solicitar permiso en modo plan para tools destructivos` | Integr. | Modo `'plan'`, tool call `write_file`. Verificar evento generado.                               | Genera evento `type: 'permission_request'` con datos del tool             |
| 109 | `runAgent debe continuar si el permiso es concedido`                   | Integr. | Mockear `onPermissionResponse` para retornar `true`.                                            | El tool se ejecuta después del permiso                                    |
| 110 | `runAgent debe agregar mensaje de denegación si permiso rechazado`     | Integr. | Mockear `onPermissionResponse` para retornar `false`.                                           | El historial contiene `"Permission denied for this operation."`           |
| 111 | `runAgent NO debe solicitar permiso en modo build`                     | Integr. | Modo `'build'`, tool call `write_file`.                                                         | NO genera evento `permission_request`, ejecuta directamente               |
| 112 | `runAgent debe aplicar rate limiting en modo build`                    | Integr. | Modo `'build'`, tool destructivo. Verificar delay entre ejecuciones.                            | Hay un delay de 500ms después de ejecutar el tool                         |
| 113 | `runAgent debe respetar maxIterations`                                 | Integr. | Configurar `maxIterations: 3`. Mockear respuestas que siempre tienen tool calls.                | Después de 3 iteraciones, genera evento `type: 'error'` con mensaje       |
| 114 | `runAgent debe generar evento de compaction cuando es necesario`       | Integr. | Pasar mensajes que excedan el threshold de compactación.                                        | Genera evento `type: 'compaction'` al inicio                              |
| 115 | `runAgent debe preservar mensajes recientes después de compactar`      | Integr. | Pasar 20 mensajes. Verificar que los últimos 10 se mantienen en el historial.                   | El historial contiene los últimos 10 mensajes                             |
| 116 | `runAgent debe capturar errores del modelo y generar evento error`     | Integr. | Mockear `streamText` para lanzar un error.                                                      | Genera evento `type: 'error'` con el mensaje de error                     |
| 117 | `runAgent debe capturar errores de tool execution`                     | Integr. | Mockear `executeTool` para retornar `{ success: false, error: 'fail' }`.                        | El evento `tool_result` contiene el error                                 |
| 118 | `runAgent debe incluir system prompt en la llamada al modelo`          | Integr. | Espiar la llamada a `streamText`. Verificar el parámetro `system`.                              | El parámetro `system` contiene el prompt generado por `buildSystemPrompt` |
| 119 | `runAgent debe agregar el mensaje del usuario al historial`            | Integr. | Pasar `userMessage: 'test'`. Verificar el historial después de la primera iteración.            | El historial contiene `{ role: 'user', content: 'test' }`                 |
| 120 | `runAgent debe procesar solo el primer tool call si hay múltiples`     | Integr. | Mockear respuesta con 3 tool calls en un solo mensaje.                                          | Solo el primer tool call se ejecuta en esa iteración                      |

#### Notas de implementación:

- Mockear `streamText` de `ai` con `vi.mock('ai')`.
- Mockear `executeTool` de `../tools/registry.js`.
- Mockear `buildSystemPrompt` de `./prompt.js`.
- Para el test 112, usar `vi.useFakeTimers()` y verificar que se llama `setTimeout`.
- Para el test 114-115, mockear `shouldCompact` para retornar `true`.

---

## 14. Validation Scripts

### Archivo: `scripts/__tests__/test-models.test.ts`

| #   | Nombre del Test                                               | Tipo    | Descripción                                                                           | Resultado Esperado                              |
| --- | ------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 121 | `test-models debe conectar con Ollama`                        | Integr. | Ejecutar el script con un modelo instalado. Verificar que no lanza error de conexión. | El script se conecta exitosamente               |
| 122 | `test-models debe enviar un prompt de prueba`                 | Integr. | Verificar que el script envía el prompt de test al modelo.                            | El modelo recibe y responde al prompt           |
| 123 | `test-models debe parsear tool calls de la respuesta`         | Integr. | Verificar que el script usa `parseToolCalls()` en la respuesta.                       | Los tool calls se detectan correctamente        |
| 124 | `test-models debe reportar si el modelo soporta tool calling` | Integr. | Ejecutar con un modelo que soporta tool calling.                                      | El script reporta `"Tool calling: ✓ Supported"` |

### Archivo: `scripts/__tests__/test-compaction.test.ts`

| #   | Nombre del Test                                       | Tipo     | Descripción                                                                                        | Resultado Esperado                                         |
| --- | ----------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 125 | `test-compaction debe calcular tokens correctamente`  | Unitario | Crear mensajes de prueba con tamaño conocido. Verificar cálculo.                                   | Los tokens calculados coinciden con la heurística chars/4  |
| 126 | `test-compaction debe identificar cuando compactar`   | Unitario | Crear mensajes que excedan el threshold. Verificar `shouldCompact()`.                              | Retorna `true` cuando se excede el threshold               |
| 127 | `test-compaction debe separar mensajes old vs recent` | Unitario | Crear 20 mensajes. Verificar que `getOldMessages()` y `getRecentMessages()` dividen correctamente. | Los primeros 10 son "old", los últimos 10 son "recent"     |
| 128 | `test-compaction debe generar prompt de compactación` | Unitario | Llamar `buildCompactionPrompt()` con mensajes de prueba.                                           | El prompt contiene instrucciones de resumen y los mensajes |

#### Notas de implementación:

- Los tests 121-124 son de integración y requieren Ollama corriendo (marcarlos como `skip` si no está disponible).
- Los tests 125-128 son unitarios y no requieren conexión externa.
- Usar `vi.mock()` para aislar las funciones de compactación.

---

## Resumen de Cobertura Fase 3

| Módulo                       | Tests Unitarios | Tests Integración |  Total  |
| ---------------------------- | :-------------: | :---------------: | :-----: |
| `lib/shell.ts`               |        8        |         0         |    8    |
| `tools/read-file.ts`         |        6        |         0         |    6    |
| `tools/write-file.ts`        |        6        |         0         |    6    |
| `tools/edit-file.ts`         |        6        |         0         |    6    |
| `tools/bash.ts`              |        7        |         0         |    7    |
| `tools/list-files.ts`        |        9        |         0         |    9    |
| `tools/search-files.ts`      |        8        |         0         |    8    |
| `tools/registry.ts`          |        9        |         0         |    9    |
| `agent/prompt.ts`            |        7        |         0         |    7    |
| `agent/parser.ts`            |       10        |         0         |   10    |
| `agent/context.ts`           |       12        |         0         |   12    |
| `agent/permissions.ts`       |       12        |         0         |   12    |
| `agent/loop.ts`              |        0        |        20         |   20    |
| `scripts/test-models.ts`     |        0        |         4         |    4    |
| `scripts/test-compaction.ts` |        4        |         0         |    4    |
| **TOTAL**                    |     **104**     |      **24**       | **128** |

---

## Resumen General del Proyecto (Fases 1-3)

| Fase      | Tests Unitarios | Tests Integración/Componente |  Total  |
| --------- | :-------------: | :--------------------------: | :-----: |
| Fase 1    |       19        |              14              | **33**  |
| Fase 2    |       32        |              20              | **52**  |
| Fase 3    |       104       |              24              | **128** |
| **TOTAL** |     **155**     |            **58**            | **213** |

---

## Prioridad de Implementación

### Alta Prioridad (Core Functionality)

1. Shell detection (tests 1-8)
2. Tool registry (tests 51-59)
3. Parser textual (tests 67-76)
4. Agent loop básico (tests 101-106, 116-120)

### Media Prioridad (Safety & Reliability)

1. Permissions (tests 89-100)
2. Context compaction (tests 77-88)
3. Agent loop avanzado (tests 107-115)

### Baja Prioridad (Individual Tools)

1. read_file (tests 9-14)
2. write_file (tests 15-20)
3. edit_file (tests 21-26)
4. bash (tests 27-33)
5. list_files (tests 34-42)
6. search_files (tests 43-50)
7. Validation scripts (tests 121-128)

---

## Comandos de Ejecución

```bash
# Ejecutar todos los tests de Fase 3
pnpm test --filter @agent/server

# Ejecutar solo tests unitarios
pnpm test --filter @agent/server -- src/__tests__/unit

# Ejecutar solo tests de integración
pnpm test --filter @agent/server -- src/__tests__/integration

# Ejecutar tests de un módulo específico
pnpm test --filter @agent/server -- shell.test.ts

# Con coverage
pnpm test:coverage --filter @agent/server
```
