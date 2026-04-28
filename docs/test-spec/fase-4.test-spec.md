# Test Spec — Fase 4: Endpoints de Chat/Sesiones + TUI Chat + Sesiones

> **Paquetes objetivo:** `packages/server`, `packages/sdk`, `packages/tui`  
> **Framework:** Vitest + `ink-testing-library`  
> **Prerrequisitos:** Leer `docs/test-spec/setup.md` para la configuración base y mocks compartidos.

---

## 1. Endpoints de Sesiones — `routes/sessions.ts`

### Archivo: `src/__tests__/integration/sessions-routes.test.ts`

| #   | Nombre del Test                                                        | Tipo    | Descripción                                                                           | Resultado Esperado                                                  |
| --- | ---------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | `POST /api/sessions debe crear una nueva sesión`                       | Integr. | Enviar `POST /api/sessions` con `{ title: 'Test Session' }`.                          | Status `201`. Body contiene `id`, `title`, `createdAt`, `updatedAt` |
| 2   | `POST /api/sessions debe usar título por defecto si no se proporciona` | Integr. | Enviar `POST /api/sessions` con body vacío `{}`.                                      | Status `201`. `title` es `'Nueva conversación'`                     |
| 3   | `POST /api/sessions debe generar ID único con nanoid`                  | Integr. | Crear dos sesiones. Verificar que tienen IDs diferentes.                              | Los IDs son diferentes y tienen formato nanoid                      |
| 4   | `GET /api/sessions debe retornar lista vacía si no hay sesiones`       | Integr. | Llamar sin crear sesiones previas.                                                    | Status `200`. Body: `{ sessions: [] }`                              |
| 5   | `GET /api/sessions debe retornar todas las sesiones`                   | Integr. | Crear 3 sesiones. Llamar `GET /api/sessions`.                                         | Status `200`. Body contiene array con 3 sesiones                    |
| 6   | `GET /api/sessions debe ordenar por updatedAt DESC`                    | Integr. | Crear 3 sesiones con diferentes `updatedAt`. Verificar orden.                         | La sesión más reciente aparece primero                              |
| 7   | `GET /api/sessions/:id debe retornar detalle de sesión`                | Integr. | Crear sesión con mensajes. Llamar `GET /api/sessions/:id`.                            | Status `200`. Body contiene `session`, `messages`, `metadata`       |
| 8   | `GET /api/sessions/:id debe retornar 404 si no existe`                 | Integr. | Llamar con ID inexistente.                                                            | Status `404`. Body: `{ error: 'Session not found' }`                |
| 9   | `GET /api/sessions/:id debe incluir mensajes ordenados por sequence`   | Integr. | Crear sesión con 5 mensajes desordenados. Verificar orden.                            | Los mensajes están ordenados por `sequence` ascendente              |
| 10  | `GET /api/sessions/:id debe incluir metadata de la sesión`             | Integr. | Crear sesión con metadata. Verificar que se incluye.                                  | El array `metadata` contiene los registros correctos                |
| 11  | `DELETE /api/sessions/:id debe eliminar la sesión`                     | Integr. | Crear sesión. Eliminarla. Intentar obtenerla.                                         | DELETE retorna `{ ok: true }`. GET posterior retorna 404            |
| 12  | `DELETE /api/sessions/:id debe retornar 404 si no existe`              | Integr. | Intentar eliminar ID inexistente.                                                     | Status `404`. Body: `{ error: 'Session not found' }`                |
| 13  | `DELETE /api/sessions/:id debe eliminar mensajes en cascade`           | Integr. | Crear sesión con mensajes. Eliminar sesión. Verificar que mensajes fueron eliminados. | Los mensajes asociados ya no existen en la DB                       |
| 14  | `DELETE /api/sessions/:id debe eliminar metadata en cascade`           | Integr. | Crear sesión con metadata. Eliminar sesión. Verificar que metadata fue eliminada.     | La metadata asociada ya no existe en la DB                          |

#### Notas de implementación:

- Usar DB in-memory del setup compartido.
- Mockear `nanoid` si es necesario para IDs predecibles en tests.
- Verificar cascade deletes consultando directamente las tablas `messages` y `session_metadata`.

---

## 2. Endpoints de Chat — `routes/chat.ts`

### Archivo: `src/__tests__/integration/chat-routes.test.ts`

| #   | Nombre del Test                                                             | Tipo    | Descripción                                                                                              | Resultado Esperado                                            |
| --- | --------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 15  | `POST /api/sessions/:id/messages debe retornar 404 si sesión no existe`     | Integr. | Enviar mensaje a sesión inexistente.                                                                     | Status `404`. Body: `{ error: 'Session not found' }`          |
| 16  | `POST /api/sessions/:id/messages debe retornar 400 si no hay modelo activo` | Integr. | Enviar mensaje sin configurar modelo activo.                                                             | Status `400`. Body: `{ error: 'No active model configured' }` |
| 17  | `POST /api/sessions/:id/messages debe validar que content no esté vacío`    | Integr. | Enviar `{ content: '' }`.                                                                                | Status `400` (validación de Zod)                              |
| 18  | `POST /api/sessions/:id/messages debe retornar SSE stream`                  | Integr. | Mockear `runAgent`. Enviar mensaje válido. Verificar headers.                                            | Content-Type: `text/event-stream`. Headers de SSE correctos   |
| 19  | `POST /api/sessions/:id/messages debe guardar mensaje del usuario`          | Integr. | Enviar mensaje. Verificar que se guardó en la DB.                                                        | El mensaje del usuario existe en la tabla `messages`          |
| 20  | `POST /api/sessions/:id/messages debe actualizar updatedAt de sesión`       | Integr. | Crear sesión. Esperar 1s. Enviar mensaje. Verificar `updatedAt`.                                         | El `updatedAt` de la sesión cambió                            |
| 21  | `POST /api/sessions/:id/messages debe enviar eventos token via SSE`         | Integr. | Mockear `runAgent` para generar eventos `token`. Consumir el stream.                                     | Los eventos `token` se reciben con `sequence` incremental     |
| 22  | `POST /api/sessions/:id/messages debe guardar tool_call en DB`              | Integr. | Mockear `runAgent` para generar evento `tool_call`. Verificar DB.                                        | El mensaje `tool_call` se guardó con `toolName` y `toolArgs`  |
| 23  | `POST /api/sessions/:id/messages debe guardar tool_result en DB`            | Integr. | Mockear `runAgent` para generar evento `tool_result`. Verificar DB.                                      | El mensaje `tool_result` se guardó con `toolResult`           |
| 24  | `POST /api/sessions/:id/messages debe guardar mensaje final del asistente`  | Integr. | Mockear `runAgent` para generar tokens y evento `done`. Verificar DB.                                    | El mensaje `assistant` se guardó con el contenido completo    |
| 25  | `POST /api/sessions/:id/messages debe usar modo de config`                  | Integr. | Configurar modo `build`. Enviar mensaje. Verificar que `runAgent` recibe `mode: 'build'`.                | El agente se ejecuta en modo `build`                          |
| 26  | `POST /api/sessions/:id/messages debe usar modo plan por defecto`           | Integr. | No configurar modo. Enviar mensaje. Verificar modo usado.                                                | El agente se ejecuta en modo `plan` (default)                 |
| 27  | `POST /api/sessions/:id/messages debe cargar historial de mensajes`         | Integr. | Crear sesión con 5 mensajes previos. Enviar nuevo mensaje. Verificar que `runAgent` recibe el historial. | El historial contiene los 5 mensajes previos                  |
| 28  | `POST /api/sessions/:id/messages debe manejar errores del agente`           | Integr. | Mockear `runAgent` para lanzar error. Verificar que se envía evento `error`.                             | Se envía evento SSE con `type: 'error'` y el mensaje          |
| 29  | `POST /api/sessions/:id/permission debe aceptar granted=true`               | Integr. | Enviar `{ granted: true }`.                                                                              | Status `200`. Body: `{ ok: true, granted: true }`             |
| 30  | `POST /api/sessions/:id/permission debe aceptar granted=false`              | Integr. | Enviar `{ granted: false }`.                                                                             | Status `200`. Body: `{ ok: true, granted: false }`            |

#### Notas de implementación:

- Mockear `runAgent` de `../agent/loop.js` con `vi.mock()`.
- Para tests de SSE, consumir el stream con un `ReadableStreamDefaultReader`.
- Configurar modelo activo y modo en la tabla `config` antes de los tests.
- Verificar que los mensajes se guardan con `sequence` correcto.

---

## 3. Endpoints de Configuración — `routes/config.ts`

### Archivo: `src/__tests__/integration/config-routes.test.ts`

| #   | Nombre del Test                                                  | Tipo    | Descripción                                                        | Resultado Esperado                                       |
| --- | ---------------------------------------------------------------- | ------- | ------------------------------------------------------------------ | -------------------------------------------------------- |
| 31  | `GET /api/config debe retornar configuración vacía con defaults` | Integr. | Llamar sin configuración previa.                                   | Status `200`. Body contiene `{ mode: 'plan' }`           |
| 32  | `GET /api/config debe retornar configuración existente`          | Integr. | Configurar `mode: 'build'` y `active_model: 'llama3'`. Llamar GET. | Body contiene ambos valores                              |
| 33  | `POST /api/config/mode debe establecer modo plan`                | Integr. | Enviar `{ mode: 'plan' }`.                                         | Status `200`. Body: `{ ok: true, mode: 'plan' }`         |
| 34  | `POST /api/config/mode debe establecer modo build`               | Integr. | Enviar `{ mode: 'build' }`.                                        | Status `200`. Body: `{ ok: true, mode: 'build' }`        |
| 35  | `POST /api/config/mode debe persistir en la DB`                  | Integr. | Establecer modo. Verificar en la tabla `config`.                   | El registro existe con `key: 'mode'` y el valor correcto |
| 36  | `POST /api/config/mode debe actualizar si ya existe`             | Integr. | Establecer `plan`, luego `build`. Verificar que se actualizó.      | Solo existe un registro con el valor más reciente        |
| 37  | `POST /api/config/mode debe rechazar valores inválidos`          | Integr. | Enviar `{ mode: 'invalid' }`.                                      | Status `400` (validación de Zod)                         |
| 38  | `POST /api/config/mode debe rechazar body sin mode`              | Integr. | Enviar body vacío `{}`.                                            | Status `400` (validación de Zod)                         |

---

## 4. Cliente SDK — `packages/sdk/src/client.ts`

### Archivo: `packages/sdk/src/__tests__/unit/agent-client-sessions.test.ts`

| #   | Nombre del Test                                                    | Tipo     | Descripción                                                | Resultado Esperado                                               |
| --- | ------------------------------------------------------------------ | -------- | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| 39  | `createSession debe hacer POST a /api/sessions`                    | Unitario | Mockear fetch. Llamar `createSession('Test')`.             | `fetch` fue llamado con method `POST` y body `{ title: 'Test' }` |
| 40  | `createSession debe retornar la sesión creada`                     | Unitario | Mockear fetch con respuesta exitosa. Verificar retorno.    | Retorna objeto con `id`, `title`, `createdAt`, `updatedAt`       |
| 41  | `createSession debe funcionar sin título`                          | Unitario | Llamar `createSession()` sin argumentos.                   | `fetch` fue llamado con body vacío o sin `title`                 |
| 42  | `listSessions debe hacer GET a /api/sessions`                      | Unitario | Mockear fetch. Llamar `listSessions()`.                    | `fetch` fue llamado con method `GET` y URL correcta              |
| 43  | `listSessions debe retornar array de sesiones`                     | Unitario | Mockear fetch con 3 sesiones. Verificar retorno.           | Retorna array con 3 elementos                                    |
| 44  | `getSession debe hacer GET a /api/sessions/:id`                    | Unitario | Mockear fetch. Llamar `getSession('abc123')`.              | `fetch` fue llamado con URL `/api/sessions/abc123`               |
| 45  | `getSession debe retornar sesión con mensajes y metadata`          | Unitario | Mockear fetch con respuesta completa. Verificar retorno.   | Retorna objeto con `session`, `messages`, `metadata`             |
| 46  | `deleteSession debe hacer DELETE a /api/sessions/:id`              | Unitario | Mockear fetch. Llamar `deleteSession('abc123')`.           | `fetch` fue llamado con method `DELETE` y URL correcta           |
| 47  | `deleteSession debe retornar ok en éxito`                          | Unitario | Mockear fetch exitoso. Verificar retorno.                  | Retorna `{ ok: true }`                                           |
| 48  | `sendMessage debe hacer POST a /api/sessions/:id/messages`         | Unitario | Mockear fetch. Llamar `sendMessage('abc123', 'Hello')`.    | `fetch` fue llamado con method `POST`, URL y body correctos      |
| 49  | `sendMessage debe retornar AsyncGenerator de eventos SSE`          | Unitario | Mockear fetch con SSE stream. Iterar sobre el generador.   | Genera eventos con `sequence`, `type`, `data`                    |
| 50  | `sendMessage debe parsear eventos SSE correctamente`               | Unitario | Mockear stream con 3 eventos. Verificar que se parsean.    | Los 3 eventos se generan con datos correctos                     |
| 51  | `respondPermission debe hacer POST a /api/sessions/:id/permission` | Unitario | Mockear fetch. Llamar `respondPermission('abc123', true)`. | `fetch` fue llamado con body `{ granted: true }`                 |
| 52  | `setMode debe hacer POST a /api/config/mode`                       | Unitario | Mockear fetch. Llamar `setMode('build')`.                  | `fetch` fue llamado con body `{ mode: 'build' }`                 |
| 53  | `getConfig debe hacer GET a /api/config`                           | Unitario | Mockear fetch. Llamar `getConfig()`.                       | `fetch` fue llamado con method `GET` y URL correcta              |
| 54  | `getConfig debe retornar objeto de configuración`                  | Unitario | Mockear fetch con config. Verificar retorno.               | Retorna objeto con las propiedades de configuración              |

#### Notas de implementación:

- Mockear `globalThis.fetch` con `vi.stubGlobal()`.
- Para `sendMessage`, usar `createMockSSEStream()` del setup compartido.
- Restaurar mocks en `afterEach`.

---

## 5. Hook useChat — `packages/tui/src/hooks/useChat.ts`

### Archivo: `packages/tui/src/__tests__/unit/useChat-hook.test.ts`

| #   | Nombre del Test                                                  | Tipo     | Descripción                                                            | Resultado Esperado                                              |
| --- | ---------------------------------------------------------------- | -------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| 55  | `useChat debe cargar mensajes al montar`                         | Unitario | Mockear `getSession`. Montar el hook con sessionId.                    | `getSession` fue llamado con el sessionId correcto              |
| 56  | `useChat debe setear loading=false después de cargar`            | Unitario | Esperar a que la promesa resuelva.                                     | `loading` cambia de `true` a `false`                            |
| 57  | `useChat debe setear error cuando getSession falla`              | Unitario | Mockear `getSession` para lanzar error.                                | `error` contiene el mensaje de error                            |
| 58  | `sendMessage debe llamar al SDK y procesar eventos`              | Unitario | Mockear `client.sendMessage`. Invocar `sendMessage('test')`.           | `client.sendMessage` fue llamado con sessionId y contenido      |
| 59  | `sendMessage debe agregar tokens al mensaje actual`              | Unitario | Mockear eventos `token`. Verificar que se acumulan.                    | El mensaje del asistente contiene todos los tokens concatenados |
| 60  | `sendMessage debe agregar mensaje completo al historial en done` | Unitario | Mockear eventos hasta `done`. Verificar historial.                     | El historial contiene el mensaje completo del asistente         |
| 61  | `sendMessage debe manejar eventos tool_call`                     | Unitario | Mockear evento `tool_call`. Verificar estado.                          | El estado indica que hay un tool call en ejecución              |
| 62  | `sendMessage debe manejar eventos tool_result`                   | Unitario | Mockear evento `tool_result`. Verificar que se agrega al historial.    | El historial contiene el resultado del tool                     |
| 63  | `sendMessage debe manejar eventos permission_request`            | Unitario | Mockear evento `permission_request`. Verificar estado.                 | El estado indica que hay una solicitud de permiso pendiente     |
| 64  | `sendMessage debe aplicar throttle de 50ms a tokens`             | Unitario | Mockear 10 eventos `token` rápidos. Verificar que se aplica throttle.  | Los tokens se procesan con delay de 50ms entre actualizaciones  |
| 65  | `respondPermission debe llamar al SDK`                           | Unitario | Mockear `client.respondPermission`. Invocar `respondPermission(true)`. | `client.respondPermission` fue llamado con `granted: true`      |
| 66  | `resync debe recargar la sesión completa`                        | Unitario | Mockear `getSession`. Invocar `resync()`.                              | `getSession` fue llamado nuevamente                             |

---

## 6. Hook useSessions — `packages/tui/src/ho

## 6. Hook useSessions — `packages/tui/src/hooks/useSessions.ts`

### Archivo: `packages/tui/src/__tests__/unit/useSessions-hook.test.ts`

| #   | Nombre del Test                                           | Tipo     | Descripción                                                        | Resultado Esperado                                         |
| --- | --------------------------------------------------------- | -------- | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| 67  | `useSessions debe cargar sesiones al montar`              | Unitario | Mockear `listSessions`. Montar el hook.                            | `listSessions` fue llamado 1 vez                           |
| 68  | `useSessions debe setear loading=false después de cargar` | Unitario | Esperar a que la promesa resuelva.                                 | `loading` cambia de `true` a `false`                       |
| 69  | `useSessions debe setear error cuando listSessions falla` | Unitario | Mockear `listSessions` para lanzar error.                          | `error` contiene el mensaje de error                       |
| 70  | `createSession debe llamar al SDK y actualizar lista`     | Unitario | Mockear `client.createSession`. Invocar `createSession('New')`.    | `client.createSession` fue llamado y la lista se actualiza |
| 71  | `deleteSession debe llamar al SDK y remover de lista`     | Unitario | Mockear `client.deleteSession`. Invocar `deleteSession('abc123')`. | `client.deleteSession` fue llamado y la sesión se remueve  |
| 72  | `deleteSession debe manejar errores sin crashear`         | Unitario | Mockear `client.deleteSession` para lanzar error.                  | El error se captura y se setea en el estado                |
| 73  | `selectSession debe actualizar el store con sessionId`    | Unitario | Invocar `selectSession('abc123')`. Verificar store.                | El store contiene `activeSessionId: 'abc123'`              |
| 74  | `refreshSessions debe recargar la lista`                  | Unitario | Mockear `listSessions`. Invocar `refreshSessions()`.               | `listSessions` fue llamado nuevamente                      |

---

## 7. Pantalla de Chat — `packages/tui/src/screens/Chat.tsx`

### Archivo: `packages/tui/src/__tests__/components/ChatScreen.test.tsx`

| #   | Nombre del Test                                                 | Tipo       | Descripción                                                                    | Resultado Esperado                                         |
| --- | --------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| 75  | `ChatScreen debe mostrar mensaje si no hay sesión activa`       | Componente | Renderizar sin `activeSessionId` en el store.                                  | El texto `"Selecciona una sesión"` o similar está presente |
| 76  | `ChatScreen debe mostrar loading mientras carga mensajes`       | Componente | Mockear `useChat` con `{ loading: true }`. Renderizar.                         | El texto `"Cargando mensajes..."` está presente            |
| 77  | `ChatScreen debe mostrar error cuando hay un error`             | Componente | Mockear `useChat` con `{ error: 'Failed' }`. Renderizar.                       | El texto `"Error: Failed"` está presente                   |
| 78  | `ChatScreen debe mostrar lista de mensajes`                     | Componente | Mockear `useChat` con 3 mensajes. Renderizar.                                  | Los 3 mensajes aparecen en el output                       |
| 79  | `ChatScreen debe mostrar input de texto`                        | Componente | Renderizar con sesión activa. Verificar input.                                 | El input de texto está presente                            |
| 80  | `ChatScreen debe mostrar indicador de tool call en ejecución`   | Componente | Mockear `useChat` con `{ isToolExecuting: true, currentTool: 'read_file' }`.   | El texto `"Ejecutando: read_file"` o similar está presente |
| 81  | `ChatScreen debe mostrar dialog de permisos cuando se solicita` | Componente | Mockear `useChat` con `{ permissionRequest: { toolName: 'bash', args: {} } }`. | El dialog de confirmación está presente                    |
| 82  | `ChatScreen debe mostrar indicador de modo actual`              | Componente | Setear `mode: 'build'` en el store. Renderizar.                                | El indicador de modo muestra `"build"` con color rojo      |
| 83  | `ChatScreen debe aplicar throttle de 50ms a tokens`             | Componente | Mockear `useChat` para simular tokens rápidos. Verificar renders.              | Los renders se limitan a 1 cada 50ms                       |
| 84  | `ChatScreen debe hacer scroll automático al final`              | Componente | Agregar nuevo mensaje. Verificar comportamiento de scroll.                     | El scroll está al final después del nuevo mensaje          |

---

## 8. Componente MessageList — `packages/tui/src/components/MessageList.tsx`

### Archivo: `packages/tui/src/__tests__/components/MessageList.test.tsx`

| #   | Nombre del Test                                             | Tipo       | Descripción                                                      | Resultado Esperado                                          |
| --- | ----------------------------------------------------------- | ---------- | ---------------------------------------------------------------- | ----------------------------------------------------------- |
| 85  | `MessageList debe renderizar mensajes del usuario`          | Componente | Pasar array con mensaje `role: 'user'`. Renderizar.              | El contenido del mensaje aparece con indicador de usuario   |
| 86  | `MessageList debe renderizar mensajes del asistente`        | Componente | Pasar array con mensaje `role: 'assistant'`. Renderizar.         | El contenido del mensaje aparece con indicador de asistente |
| 87  | `MessageList debe renderizar tool calls`                    | Componente | Pasar mensaje con `role: 'tool_call'`, `toolName: 'bash'`.       | El texto muestra `"Tool: bash"` o similar                   |
| 88  | `MessageList debe renderizar tool results`                  | Componente | Pasar mensaje con `role: 'tool_result'`, `toolResult: 'output'`. | El resultado del tool aparece en el output                  |
| 89  | `MessageList debe mostrar mensaje vacío si no hay mensajes` | Componente | Pasar array vacío.                                               | El texto `"No hay mensajes"` o similar está presente        |
| 90  | `MessageList debe usar React.memo para optimización`        | Componente | Verificar que el componente está envuelto en `React.memo`.       | El componente no re-renderiza si props no cambian           |
| 91  | `MessageList debe truncar mensajes muy largos`              | Componente | Pasar mensaje con contenido de 1000 caracteres.                  | El mensaje se trunca o se muestra con scroll                |

---

## 9. Componente MessageInput — `packages/tui/src/components/MessageInput.tsx`

### Archivo: `packages/tui/src/__tests__/components/MessageInput.test.tsx`

| #   | Nombre del Test                                               | Tipo       | Descripción                                           | Resultado Esperado                                     |
| --- | ------------------------------------------------------------- | ---------- | ----------------------------------------------------- | ------------------------------------------------------ |
| 92  | `MessageInput debe renderizar input de texto`                 | Componente | Renderizar el componente.                             | El input está presente                                 |
| 93  | `MessageInput debe llamar onSubmit al presionar Enter`        | Componente | Mockear `onSubmit`. Escribir texto y presionar Enter. | `onSubmit` fue llamado con el texto ingresado          |
| 94  | `MessageInput debe limpiar input después de submit`           | Componente | Escribir texto, presionar Enter. Verificar input.     | El input está vacío después del submit                 |
| 95  | `MessageInput debe deshabilitar input mientras está enviando` | Componente | Pasar prop `isSending: true`. Renderizar.             | El input está deshabilitado                            |
| 96  | `MessageInput debe mostrar placeholder`                       | Componente | Renderizar. Verificar texto del placeholder.          | El placeholder `"Escribe un mensaje..."` está presente |
| 97  | `MessageInput no debe enviar mensajes vacíos`                 | Componente | Presionar Enter sin escribir nada.                    | `onSubmit` no fue llamado                              |

---

## 10. Componente PermissionDialog — `packages/tui/src/components/PermissionDialog.tsx`

### Archivo: `packages/tui/src/__tests__/components/PermissionDialog.test.tsx`

| #   | Nombre del Test                                         | Tipo       | Descripción                                     | Resultado Esperado                                 |
| --- | ------------------------------------------------------- | ---------- | ----------------------------------------------- | -------------------------------------------------- |
| 98  | `PermissionDialog debe mostrar nombre del tool`         | Componente | Renderizar con `toolName: 'bash'`.              | El texto contiene `"bash"`                         |
| 99  | `PermissionDialog debe mostrar argumentos del tool`     | Componente | Renderizar con `args: { command: 'rm -rf /' }`. | El texto contiene los argumentos formateados       |
| 100 | `PermissionDialog debe llamar onApprove al presionar Y` | Componente | Mockear `onApprove`. Presionar tecla `y`.       | `onApprove` fue llamado con `true`                 |
| 101 | `PermissionDialog debe llamar onApprove al presionar N` | Componente | Mockear `onApprove`. Presionar tecla `n`.       | `onApprove` fue llamado con `false`                |
| 102 | `PermissionDialog debe mostrar opciones (Y/N)`          | Componente | Renderizar. Verificar texto.                    | El texto contiene `"(Y/N)"` o similar              |
| 103 | `PermissionDialog debe bloquear otras interacciones`    | Componente | Verificar que el dialog es modal.               | El dialog captura el foco y bloquea otras acciones |

---

## 11. Pantalla de Sesiones — `packages/tui/src/screens/Sessions.tsx`

### Archivo: `packages/tui/src/__tests__/components/SessionsScreen.test.tsx`

| #   | Nombre del Test                                               | Tipo       | Descripción                                                   | Resultado Esperado                                       |
| --- | ------------------------------------------------------------- | ---------- | ------------------------------------------------------------- | -------------------------------------------------------- |
| 104 | `SessionsScreen debe mostrar loading mientras carga`          | Componente | Mockear `useSessions` con `{ loading: true }`. Renderizar.    | El texto `"Cargando sesiones..."` está presente          |
| 105 | `SessionsScreen debe mostrar error cuando hay un error`       | Componente | Mockear `useSessions` con `{ error: 'Failed' }`. Renderizar.  | El texto `"Error: Failed"` está presente                 |
| 106 | `SessionsScreen debe mostrar lista de sesiones`               | Componente | Mockear `useSessions` con 3 sesiones. Renderizar.             | Las 3 sesiones aparecen en el output                     |
| 107 | `SessionsScreen debe mostrar fecha formateada de cada sesión` | Componente | Mockear sesiones con diferentes fechas. Verificar formato.    | Las fechas aparecen en formato relativo ("hace 2 horas") |
| 108 | `SessionsScreen debe mostrar preview del primer mensaje`      | Componente | Mockear sesión con mensajes. Verificar preview.               | El preview del primer mensaje aparece truncado           |
| 109 | `SessionsScreen debe truncar preview a 50 caracteres`         | Componente | Mockear sesión con mensaje largo. Verificar truncamiento.     | El preview tiene máximo 50 caracteres + "..."            |
| 110 | `SessionsScreen debe mostrar botón para crear nueva sesión`   | Componente | Renderizar. Verificar presencia del botón.                    | El botón "Nueva sesión" está presente                    |
| 111 | `SessionsScreen debe mostrar mensaje si no hay sesiones`      | Componente | Mockear `useSessions` con array vacío. Renderizar.            | El texto `"No hay sesiones"` o similar está presente     |
| 112 | `SessionsScreen debe resaltar sesión seleccionada`            | Componente | Mockear sesiones. Simular selección de una. Verificar estilo. | La sesión seleccionada aparece resaltada                 |
| 113 | `SessionsScreen debe mostrar confirmación antes de borrar`    | Componente | Simular intento de borrar sesión. Verificar dialog.           | Aparece dialog de confirmación                           |

---

## 12. Componente SessionList — `packages/tui/src/components/SessionList.tsx`

### Archivo: `packages/tui/src/__tests__/components/SessionList.test.tsx`

| #   | Nombre del Test                                        | Tipo       | Descripción                                                | Resultado Esperado                                     |
| --- | ------------------------------------------------------ | ---------- | ---------------------------------------------------------- | ------------------------------------------------------ |
| 114 | `SessionList debe renderizar lista de sesiones`        | Componente | Pasar array con 3 sesiones. Renderizar.                    | Las 3 sesiones aparecen en el output                   |
| 115 | `SessionList debe mostrar título de cada sesión`       | Componente | Pasar sesiones con títulos diferentes. Verificar.          | Todos los títulos aparecen correctamente               |
| 116 | `SessionList debe permitir navegación con flechas`     | Componente | Simular presionar flecha abajo. Verificar selección.       | La selección se mueve a la siguiente sesión            |
| 117 | `SessionList debe llamar onSelect al presionar Enter`  | Componente | Mockear `onSelect`. Seleccionar sesión y presionar Enter.  | `onSelect` fue llamado con el ID de la sesión          |
| 118 | `SessionList debe llamar onDelete al presionar Delete` | Componente | Mockear `onDelete`. Seleccionar sesión y presionar Delete. | `onDelete` fue llamado con el ID de la sesión          |
| 119 | `SessionList debe mostrar indicador de sesión activa`  | Componente | Pasar `activeSessionId`. Verificar indicador visual.       | La sesión activa tiene un indicador especial (ej: "★") |

---

## 13. Atajo de Teclado — `packages/tui/src/App.tsx`

### Archivo: `packages/tui/src/__tests__/components/App-keyboard.test.tsx`

| #   | Nombre del Test                                                   | Tipo       | Descripción                                                    | Resultado Esperado                                 |
| --- | ----------------------------------------------------------------- | ---------- | -------------------------------------------------------------- | -------------------------------------------------- |
| 120 | `App debe cambiar modo al presionar Ctrl+M`                       | Componente | Setear modo `plan`. Simular Ctrl+M. Verificar store.           | El modo cambia a `build`                           |
| 121 | `App debe toggle entre plan y build con Ctrl+M`                   | Componente | Presionar Ctrl+M dos veces. Verificar modo.                    | El modo vuelve a `plan` después del segundo toggle |
| 122 | `App debe actualizar indicador en Header después de cambiar modo` | Componente | Cambiar modo. Verificar que el Header muestra el nuevo modo.   | El Header refleja el cambio de modo                |
| 123 | `App debe llamar al SDK para persistir cambio de modo`            | Componente | Mockear `client.setMode`. Presionar Ctrl+M. Verificar llamada. | `client.setMode` fue llamado con el nuevo modo     |

---

## 14. Benchmark de Performance — `scripts/test-ink-perf.ts`

### Archivo: `scripts/__tests__/test-ink-perf.test.ts`

| #   | Nombre del Test                                        | Tipo    | Descripción                                                       | Resultado Esperado                                  |
| --- | ------------------------------------------------------ | ------- | ----------------------------------------------------------------- | --------------------------------------------------- |
| 124 | `test-ink-perf debe renderizar 100 mensajes sin lag`   | Integr. | Crear 100 mensajes. Medir tiempo de render.                       | El render completa en <1 segundo                    |
| 125 | `test-ink-perf debe manejar streaming de 1000 tokens`  | Integr. | Simular streaming de 1000 tokens con throttle. Medir performance. | No hay lag visible, throttle funciona correctamente |
| 126 | `test-ink-perf debe verificar uso de React.memo`       | Integr. | Verificar que componentes pesados usan React.memo.                | Los componentes no re-renderizan innecesariamente   |
| 127 | `test-ink-perf debe medir memoria con muchos mensajes` | Integr. | Crear 500 mensajes. Medir uso de memoria.                         | El uso de memoria es razonable (<100MB)             |

---

## Resumen de Cobertura Fase 4

| Módulo                                | Tests Unitarios | Tests Integración/Componente |  Total  |
| ------------------------------------- | :-------------: | :--------------------------: | :-----: |
| `routes/sessions.ts`                  |        0        |              14              |   14    |
| `routes/chat.ts`                      |        0        |              16              |   16    |
| `routes/config.ts`                    |        0        |              8               |    8    |
| `sdk/client.ts` (sesiones)            |       16        |              0               |   16    |
| `tui/hooks/useChat.ts`                |       12        |              0               |   12    |
| `tui/hooks/useSessions.ts`            |        8        |              0               |    8    |
| `tui/screens/Chat.tsx`                |        0        |              10              |   10    |
| `tui/components/MessageList.tsx`      |        0        |              7               |    7    |
| `tui/components/MessageInput.tsx`     |        0        |              6               |    6    |
| `tui/components/PermissionDialog.tsx` |        0        |              6               |    6    |
| `tui/screens/Sessions.tsx`            |        0        |              10              |   10    |
| `tui/components/SessionList.tsx`      |        0        |              6               |    6    |
| `tui/App.tsx` (keyboard)              |        0        |              4               |    4    |
| `scripts/test-ink-perf.ts`            |        0        |              4               |    4    |
| **TOTAL**                             |     **36**      |            **91**            | **127** |

---

## Resumen General del Proyecto (Fases 1-4)

| Fase      | Tests Unitarios | Tests Integración/Componente |  Total  |
| --------- | :-------------: | :--------------------------: | :-----: |
| Fase 1    |       19        |              14              | **33**  |
| Fase 2    |       32        |              20              | **52**  |
| Fase 3    |       104       |              24              | **128** |
| Fase 4    |       36        |              91              | **127** |
| **TOTAL** |     **191**     |           **149**            | **340** |

---

## Prioridad de Implementación

### Alta Prioridad (Core Functionality)

1. Endpoints de sesiones (tests 1-14)
2. Endpoints de chat (tests 15-30)
3. Endpoints de config (tests 31-38)
4. SDK cliente sesiones (tests 39-54)

### Media Prioridad (UI Functionality)

1. Hook useChat (tests 55-66)
2. Hook useSessions (tests 67-74)
3. Pantalla de Chat (tests 75-84)
4. Pantalla de Sesiones (tests 104-113)

### Baja Prioridad (UI Components & Polish)

1. Componentes individuales (tests 85-103, 114-119)
2. Atajos de teclado (tests 120-123)
3. Benchmark de performance (tests 124-127)

---

## Comandos de Ejecución

```bash
# Ejecutar todos los tests de Fase 4
pnpm test

# Ejecutar solo tests del servidor
pnpm test --filter @agent/server -- sessions-routes.test.ts

# Ejecutar solo tests del SDK
pnpm test --filter @agent/sdk -- agent-client-sessions.test.ts

# Ejecutar solo tests de TUI
pnpm test --filter @agent/tui -- ChatScreen.test.tsx

# Con coverage
pnpm test:coverage
```

---

## Notas de Implementación

### Para Endpoints (Server)

- Usar DB in-memory del setup compartido
- Mockear `runAgent` para tests de chat
- Verificar cascade deletes consultando tablas directamente
- Configurar modelo activo y modo antes de tests de chat

### Para SDK

- Mockear `globalThis.fetch` con `vi.stubGlobal()`
- Usar `createMockSSEStream()` para tests de streaming
- Restaurar mocks en `afterEach`

### Para TUI

- Mockear hooks de red (`useChat`, `useSessions`)
- Usar `render()` de `ink-testing-library`
- Verificar texto con `lastFrame()`
- Simular teclas con `stdin.write()`
- Usar `vi.useFakeTimers()` para tests de throttle

### Para Performance

- Medir tiempo con `performance.now()`
- Verificar uso de memoria con `process.memoryUsage()`
- Validar que React.memo está aplicado en componentes pesados
