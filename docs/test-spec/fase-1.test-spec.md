# Test Spec — Fase 1: Servidor Base + DB + Vercel AI SDK

> **Paquete objetivo:** `packages/server`  
> **Framework:** Vitest  
> **Prerrequisitos:** Leer `docs/test-spec/setup.md` para la configuración base y mocks compartidos.

---

## 1. Base de Datos — `db/schema.ts` + `db/connection.ts`

### Archivo: `src/__tests__/unit/db-schema.test.ts`

| #   | Nombre del Test                                           | Tipo     | Descripción                                                                                                 | Resultado Esperado                                                            |
| --- | --------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1   | `debe crear la tabla sessions con las columnas correctas` | Unitario | Usar `createTestDb()` e inspeccionar `pragma table_info('sessions')`.                                       | Columnas: `id (TEXT PK)`, `title (TEXT NOT NULL)`, `created_at`, `updated_at` |
| 2   | `debe crear la tabla messages con FK a sessions`          | Unitario | Inspeccionar `pragma table_info('messages')` y `pragma foreign_key_list('messages')`.                       | 9 columnas. FK: `session_id → sessions.id` con `ON DELETE CASCADE`            |
| 3   | `debe crear la tabla config con primary key en key`       | Unitario | Inspeccionar `pragma table_info('config')`.                                                                 | 2 columnas: `key (TEXT PK)`, `value (TEXT NOT NULL)`                          |
| 4   | `debe crear la tabla session_metadata con FK a sessions`  | Unitario | Similar al test 2 pero para `session_metadata`.                                                             | 6 columnas. FK: `session_id → sessions.id` con `ON DELETE CASCADE`            |
| 5   | `debe aplicar CASCADE al eliminar una sesión`             | Integr.  | Insertar una sesión + mensajes + metadata. Eliminar la sesión. Verificar que los hijos fueron eliminados.   | `messages` y `session_metadata` vacíos después del DELETE                     |
| 6   | `debe permitir upsert en la tabla config`                 | Integr.  | Insertar `{ key: 'test', value: 'a' }`, luego hacer `onConflictDoUpdate` con value `'b'`. Leer el registro. | El valor final debe ser `'b'`                                                 |

#### Notas de implementación:

- Usar `createTestDb()` del setup compartido (`:memory:`).
- No depender del filesystem real.
- Ejecutar `PRAGMA foreign_keys = ON` antes de los tests de CASCADE (SQLite lo desactiva por defecto).

---

## 2. Servidor Hono — `index.ts`

### Archivo: `src/__tests__/integration/server.test.ts`

| #   | Nombre del Test                                    | Tipo    | Descripción                                                                                                           | Resultado Esperado                                                                  |
| --- | -------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 7   | `GET /health debe retornar status ok`              | Integr. | Hacer un request a `app.request('/health')` usando la API de testing de Hono (no requiere levantar el servidor real). | Status `200`. Body: `{ status: 'ok', timestamp: string, ollamaAvailable: boolean }` |
| 8   | `GET /health debe incluir un timestamp ISO válido` | Integr. | Parsear el campo `timestamp` con `new Date()` y verificar que es válido.                                              | `!isNaN(new Date(body.timestamp).getTime())` es `true`                              |
| 9   | `CORS debe estar habilitado para todas las rutas`  | Integr. | Hacer un request `OPTIONS /health` con header `Origin: http://test.com`.                                              | El response debe contener el header `Access-Control-Allow-Origin`                   |
| 10  | `Ruta inexistente debe retornar 404`               | Integr. | Hacer `GET /api/noexiste`.                                                                                            | Status `404`                                                                        |

#### Notas de implementación:

- Usar `app.request()` de Hono directamente, sin `serve()`.
- Para aislar de la DB real, mockear `getDb()` o importar el app separado de `serve()`.

---

## 3. AI Provider — `ai/provider.ts`

### Archivo: `src/__tests__/unit/ai-provider.test.ts`

| #   | Nombre del Test                                         | Tipo     | Descripción                                                                          | Resultado Esperado                                                 |
| --- | ------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 11  | `createAIProvider con Ollama debe usar apiKey dummy`    | Unitario | Llamar `createAIProvider({ type: 'ollama', baseURL: 'http://localhost:11434/v1' })`. | El provider se crea sin excepción. La apiKey interna es `'ollama'` |
| 12  | `createAIProvider con apiKey personalizada debe usarla` | Unitario | Llamar con `apiKey: 'sk-real-key'`.                                                  | La apiKey debe ser `'sk-real-key'`, no `'ollama'`                  |
| 13  | `createAIProvider debe pasar el baseURL correctamente`  | Unitario | Verificar que el provider apunta al baseURL proporcionado.                           | baseURL del provider coincide con el argumento                     |

#### Notas de implementación:

- Mockear `createOpenAI` de `@ai-sdk/openai` con `vi.mock()` para capturar los argumentos.
- No se necesita una conexión real a Ollama.

---

## 4. Ollama Management — `ai/ollama-management.ts`

### Archivo: `src/__tests__/unit/ollama-management.test.ts`

| #   | Nombre del Test                                                                | Tipo     | Descripción                                                                                                                                             | Resultado Esperado                                                                                                         |
| --- | ------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 14  | `listModels debe retornar los modelos mapeados correctamente`                  | Unitario | Mockear `fetch` para que retorne `{ models: [{ name: 'llama3:8b', size: 4000000000, details: { parameter_size: '8B' }, modified_at: '2024-01-01' }] }`. | Retorna `[{ name: 'llama3:8b', size: 4000000000, parameter_size: '8B', context_length: 8192, modified_at: '2024-01-01' }]` |
| 15  | `listModels debe manejar models sin details.parameter_size`                    | Unitario | Mockear la respuesta con `details: {}`.                                                                                                                 | `parameter_size` debe ser `'unknown'`                                                                                      |
| 16  | `listModels debe lanzar error cuando Ollama no está disponible (ECONNREFUSED)` | Unitario | Mockear `fetch` para que lance un error con `cause.code === 'ECONNREFUSED'`.                                                                            | Lanza `Error('Ollama no está disponible')`                                                                                 |
| 17  | `listModels debe lanzar error cuando la API retorna status no-ok`              | Unitario | Mockear `fetch` con `ok: false, statusText: 'Service Unavailable'`.                                                                                     | Lanza `Error('Ollama API error: Service Unavailable')`                                                                     |
| 18  | `pullModel debe invocar el callback onProgress con cada chunk`                 | Unitario | Mockear `fetch` con un `ReadableStream` que emita 3 chunks NDJSON (`{ status: 'downloading', completed: 50, total: 100 }`, etc.).                       | `onProgress` es llamado 3 veces con los datos correctos                                                                    |
| 19  | `pullModel debe lanzar error si la respuesta no es ok`                         | Unitario | Mockear `fetch` con `ok: false`.                                                                                                                        | Lanza `Error('Ollama pull error: ...')`                                                                                    |
| 20  | `pullModel debe lanzar error si la respuesta no tiene body`                    | Unitario | Mockear `fetch` con `ok: true, body: null`.                                                                                                             | Lanza `Error('No body in response')`                                                                                       |

#### Notas de implementación:

- Mockear `globalThis.fetch` con `vi.stubGlobal('fetch', mockFn)`.
- Para el `ReadableStream` del test 18, crear uno con `new ReadableStream({ start(c) { ... c.enqueue(encoder.encode(JSON.stringify(chunk) + '\n')); } })`.
- Restaurar con `vi.restoreAllMocks()` en `afterEach`.

---

## 5. SSE Middleware — `middleware/sse.ts`

### Archivo: `src/__tests__/unit/sse-middleware.test.ts`

| #   | Nombre del Test                                                          | Tipo     | Descripción                                                                                                           | Resultado Esperado                                                                     |
| --- | ------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 21  | `streamSSE debe establecer los headers correctos`                        | Unitario | Simular un `Context` de Hono y verificar que se llama `c.header()` con los 3 headers requeridos.                      | `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive` |
| 22  | `streamSSE debe enviar eventos con sequence numbers incrementales`       | Unitario | Invocar `streamSSE` con un callback que envíe 3 eventos. Consumir el `ReadableStream` resultante y parsear la salida. | Los payloads tienen `sequence: 0`, `sequence: 1`, `sequence: 2`                        |
| 23  | `streamSSE debe formatear los eventos como SSE válido (data: ...\\n\\n)` | Unitario | Consumir la salida y verificar que cada evento se escribe como `data: {...}\n\n`.                                     | Cada chunk termina con `\n\n` y empieza con `data: `                                   |
| 24  | `streamSSE close debe cerrar el ReadableStream`                          | Unitario | Enviar un evento, llamar `close()`, y verificar que `reader.read()` retorna `done: true`.                             | El stream se cierra correctamente                                                      |
| 25  | `streamSSE debe capturar errores del callback`                           | Unitario | Pasar un callback que lance un error. Verificar que el `ReadableStream` se cierra con error.                          | El stream se cierra sin crashear el proceso                                            |

#### Notas de implementación:

- Crear un mock de `Context` de Hono con los métodos `header()`, `body()`.
- Consumir el `ReadableStream` con un `ReadableStreamDefaultReader` para verificar los chunks.

---

## 6. Rutas de Modelos — `routes/models.ts`

### Archivo: `src/__tests__/integration/models-routes.test.ts`

| #   | Nombre del Test                                                     | Tipo    | Descripción                                                                                                     | Resultado Esperado                                                      |
| --- | ------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 26  | `GET /api/models debe retornar la lista de modelos`                 | Integr. | Mockear `listModels` para retornar 2 modelos. Hacer `app.request('/api/models')`.                               | Status `200`. Body: `{ models: [...] }` con 2 elementos                 |
| 27  | `GET /api/models debe retornar 503 si Ollama no está disponible`    | Integr. | Mockear `listModels` para lanzar error.                                                                         | Status `503`. Body: `{ error: 'Ollama no está disponible' }`            |
| 28  | `POST /api/models/pull debe iniciar un stream SSE`                  | Integr. | Mockear `pullModel`. Hacer `POST /api/models/pull` con `{ name: 'llama3' }`. Verificar headers y primer evento. | Content-Type: `text/event-stream`. Primer evento contiene `sequence: 0` |
| 29  | `POST /api/models/pull debe rechazar body inválido (sin name)`      | Integr. | Enviar `POST` con body vacío `{}`.                                                                              | Status `400` (validación de Zod)                                        |
| 30  | `GET /api/models/active debe retornar null si no hay modelo activo` | Integr. | Usar la DB in-memory sin datos previos.                                                                         | Status `200`. Body: `{ model: null }`                                   |
| 31  | `POST /api/models/active debe guardar el modelo activo`             | Integr. | Enviar `POST /api/models/active` con `{ model: 'llama3:8b' }`. Luego verificar con `GET /api/models/active`.    | `POST` retorna `{ ok: true }`. `GET` retorna `{ model: 'llama3:8b' }`   |
| 32  | `POST /api/models/active debe actualizar el modelo si ya existe`    | Integr. | Guardar `'llama3:8b'`, luego guardar `'codellama:7b'`. Verificar que se sobreescribió.                          | `GET` retorna `{ model: 'codellama:7b' }`                               |
| 33  | `POST /api/models/active debe rechazar body sin model`              | Integr. | Enviar `POST` con body vacío.                                                                                   | Status `400`                                                            |

#### Notas de implementación:

- Para tests 26-29: Mockear el módulo `../ai/ollama-management.js` con `vi.mock()`.
- Para tests 30-33: Mockear `getDb()` para retornar la DB in-memory del setup compartido.
- Es recomendable crear un helper `createTestApp()` que configure la app Hono con las dependencias mockeadas.

---

## Resumen de Cobertura Fase 1

| Módulo                 | Tests Unitarios | Tests Integración | Total  |
| ---------------------- | :-------------: | :---------------: | :----: |
| `db/schema.ts`         |        4        |         2         |   6    |
| `index.ts`             |        0        |         4         |   4    |
| `ai/provider.ts`       |        3        |         0         |   3    |
| `ai/ollama-management` |        7        |         0         |   7    |
| `middleware/sse.ts`    |        5        |         0         |   5    |
| `routes/models.ts`     |        0        |         8         |   8    |
| **TOTAL**              |     **19**      |      **14**       | **33** |
