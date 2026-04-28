# Test Spec — Fase 2: SDK + TUI Shell + Pantalla de Modelos

> **Paquetes objetivo:** `packages/sdk`, `packages/tui`  
> **Framework:** Vitest + `ink-testing-library`  
> **Prerrequisitos:** Leer `docs/test-spec/setup.md` para la configuración base y mocks compartidos.

---

## 1. SSE Parser — `packages/sdk/src/sse.ts`

### Archivo: `packages/sdk/src/__tests__/unit/sse-parser.test.ts`

| #   | Nombre del Test                                                  | Tipo     | Descripción                                                                                                                         | Resultado Esperado                                     |
| --- | ---------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1   | `parseSSE debe parsear un stream con un solo evento`             | Unitario | Crear un `Response` mock con body = `ReadableStream` que emita `data: {"a":1}\n\n`. Iterar con `for await`.                         | Genera un solo elemento: `{ a: 1 }`                    |
| 2   | `parseSSE debe parsear múltiples eventos en un stream`           | Unitario | Emitir 3 eventos SSE en el stream.                                                                                                  | Genera 3 elementos en orden correcto                   |
| 3   | `parseSSE debe manejar chunks parciales (split entre dos reads)` | Unitario | Emitir un evento dividido en dos chunks: primero `data: {"a":` y luego `1}\n\n`. Simular con un `ReadableStream` con dos `enqueue`. | Genera un solo elemento completo: `{ a: 1 }`           |
| 4   | `parseSSE debe ignorar líneas que no empiezan con "data: "`      | Unitario | Incluir líneas como `: comment\n\n` o `event: type\n\n` en el stream.                                                               | No genera ningún elemento para esas líneas             |
| 5   | `parseSSE debe manejar JSON inválido sin crashear`               | Unitario | Emitir `data: {invalid-json}\n\n`. Capturar `console.error`.                                                                        | No lanza excepción. Llama a `console.error` y continúa |
| 6   | `parseSSE debe retornar inmediatamente si el body es null`       | Unitario | Crear un `Response` con `body: null`.                                                                                               | El generador no produce ningún elemento                |

#### Notas de implementación:

- Usar `createMockSSEStream()` del mock compartido en `setup.md`.
- Para el test 3, crear un `ReadableStream` con un controller que haga dos `enqueue()` separados.
- Para el test 5, espiar `console.error` con `vi.spyOn(console, 'error')`.

---

## 2. Cliente SDK — `packages/sdk/src/client.ts`

### Archivo: `packages/sdk/src/__tests__/unit/agent-client.test.ts`

| #   | Nombre del Test                                                 | Tipo     | Descripción                                                                                                                             | Resultado Esperado                                                       |
| --- | --------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 7   | `constructor debe usar la URL por defecto`                      | Unitario | Crear `new AgentClient()`. Llamar `listModels()` con fetch mockeado. Verificar que `fetch` fue llamado con `http://localhost:4096/...`. | URL base es `http://localhost:4096`                                      |
| 8   | `constructor debe aceptar una URL personalizada`                | Unitario | Crear `new AgentClient('http://custom:9999')`. Verificar URL de `fetch`.                                                                | URL base es `http://custom:9999`                                         |
| 9   | `listModels debe retornar el array de modelos del servidor`     | Unitario | Mockear fetch con `{ models: [modelo1, modelo2] }`.                                                                                     | Retorna exactamente `[modelo1, modelo2]`                                 |
| 10  | `listModels debe lanzar error específico cuando status es 503`  | Unitario | Mockear fetch con `{ ok: false, status: 503 }`.                                                                                         | Lanza `Error('Ollama no está disponible')`                               |
| 11  | `listModels debe lanzar error genérico para otros errores HTTP` | Unitario | Mockear fetch con `{ ok: false, status: 500, statusText: 'Internal Server Error' }`.                                                    | Lanza `Error('Server error: Internal Server Error')`                     |
| 12  | `pullModel debe iterar los eventos SSE del stream`              | Unitario | Mockear fetch con un SSE stream de 3 eventos (`progress`, `progress`, `done`).                                                          | La iteración produce 3 elementos con `sequence` incremental              |
| 13  | `pullModel debe lanzar error si la respuesta no es ok`          | Unitario | Mockear fetch con `ok: false`.                                                                                                          | Lanza `Error('Server error: ...')`                                       |
| 14  | `getActiveModel debe retornar el nombre del modelo activo`      | Unitario | Mockear fetch con `{ model: 'llama3:8b' }`.                                                                                             | Retorna `'llama3:8b'`                                                    |
| 15  | `getActiveModel debe retornar null si no hay modelo activo`     | Unitario | Mockear fetch con `{ model: null }`.                                                                                                    | Retorna `null`                                                           |
| 16  | `setActiveModel debe hacer POST con el modelo correcto`         | Unitario | Mockear fetch. Llamar `setActiveModel('codellama:7b')`. Verificar el body del `fetch`.                                                  | `fetch` fue llamado con body `{ model: 'codellama:7b' }` y method `POST` |
| 17  | `setActiveModel debe lanzar error si la respuesta no es ok`     | Unitario | Mockear fetch con `ok: false`.                                                                                                          | Lanza `Error('Server error')`                                            |

#### Notas de implementación:

- Mockear `globalThis.fetch` con `vi.stubGlobal()`.
- Para el test 12 usar `createMockSSEStream()`.
- Restaurar mocks en `afterEach`.

---

## 3. Zustand Store — `packages/tui/src/store/app-store.ts`

### Archivo: `packages/tui/src/__tests__/unit/app-store.test.ts`

| #   | Nombre del Test                                            | Tipo     | Descripción                                                | Resultado Esperado                       |
| --- | ---------------------------------------------------------- | -------- | ---------------------------------------------------------- | ---------------------------------------- |
| 18  | `estado inicial debe tener activeScreen='models'`          | Unitario | Leer `useAppStore.getState().activeScreen`.                | Valor: `'models'`                        |
| 19  | `estado inicial debe tener activeModel=null`               | Unitario | Leer `useAppStore.getState().activeModel`.                 | Valor: `null`                            |
| 20  | `estado inicial debe tener mode='plan'`                    | Unitario | Leer `useAppStore.getState().mode`.                        | Valor: `'plan'`                          |
| 21  | `estado inicial debe tener serverConnected=false`          | Unitario | Leer `useAppStore.getState().serverConnected`.             | Valor: `false`                           |
| 22  | `setScreen debe cambiar la pantalla activa`                | Unitario | Llamar `useAppStore.getState().setScreen('chat')`.         | `activeScreen` cambia a `'chat'`         |
| 23  | `setModel debe establecer el modelo activo`                | Unitario | Llamar `useAppStore.getState().setModel('llama3:8b')`.     | `activeModel` cambia a `'llama3:8b'`     |
| 24  | `setModel(null) debe limpiar el modelo activo`             | Unitario | Llamar `setModel('llama3:8b')` y después `setModel(null)`. | `activeModel` es `null`                  |
| 25  | `setMode debe alternar entre plan y build`                 | Unitario | Llamar `setMode('build')`.                                 | `mode` cambia a `'build'`                |
| 26  | `setServerConnected debe actualizar el estado de conexión` | Unitario | Llamar `setServerConnected(true)`.                         | `serverConnected` es `true`              |
| 27  | `setSession debe guardar el ID de sesión activa`           | Unitario | Llamar `setSession('session-abc-123')`.                    | `activeSessionId` es `'session-abc-123'` |
| 28  | `setSession(null) debe limpiar la sesión activa`           | Unitario | Llamar `setSession('x')` y después `setSession(null)`.     | `activeSessionId` es `null`              |

#### Notas de implementación:

- **Importante:** Resetear el store entre tests con `useAppStore.setState({ ... valores iniciales })` en un `beforeEach`.
- El store de Zustand se accede directamente con `getState()` — no se necesita React para los tests unitarios.

---

## 4. Componentes Ink — `packages/tui/src/components/`

### Archivo: `packages/tui/src/__tests__/components/Header.test.tsx`

| #   | Nombre del Test                                                | Tipo       | Descripción                                                                                    | Resultado Esperado                     |
| --- | -------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------- | -------------------------------------- |
| 29  | `Header debe mostrar "Agent" como título`                      | Componente | Renderizar `<Header />` con `ink-testing-library`. Buscar en el output.                        | El texto `"Agent"` está presente       |
| 30  | `Header debe mostrar el modo actual del store`                 | Componente | Setear `mode: 'build'` en el store antes de renderizar. Verificar que aparece `"Modo: build"`. | El texto `"Modo: build"` está presente |
| 31  | `Header debe mostrar "● Online" cuando serverConnected=true`   | Componente | Setear `serverConnected: true`.                                                                | El texto `"● Online"` está presente    |
| 32  | `Header debe mostrar "○ Offline" cuando serverConnected=false` | Componente | Setear `serverConnected: false`.                                                               | El texto `"○ Offline"` está presente   |
| 33  | `Header debe mostrar el nombre del modelo activo`              | Componente | Setear `activeModel: 'llama3:8b'`.                                                             | El texto `"llama3:8b"` está presente   |
| 34  | `Header debe mostrar "Ninguno" si no hay modelo activo`        | Componente | Dejar `activeModel: null`.                                                                     | El texto `"Ninguno"` está presente     |

### Archivo: `packages/tui/src/__tests__/components/TabBar.test.tsx`

| #   | Nombre del Test                                               | Tipo       | Descripción                                                    | Resultado Esperado                                             |
| --- | ------------------------------------------------------------- | ---------- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| 35  | `TabBar debe mostrar las 3 pestañas`                          | Componente | Renderizar `<TabBar />`.                                       | Los textos `"Modelos"`, `"Chat"`, `"Sesiones"` están presentes |
| 36  | `TabBar debe resaltar la pestaña activa (models por defecto)` | Componente | Con `activeScreen: 'models'`, verificar el output renderizado. | `"1. Modelos"` aparece con estilo bold                         |
| 37  | `TabBar debe resaltar "Chat" cuando activeScreen='chat'`      | Componente | Setear `activeScreen: 'chat'`.                                 | `"2. Chat"` aparece resaltado                                  |

#### Notas de implementación para componentes:

- Usar `render()` de `ink-testing-library` para renderizar componentes Ink.
- Acceder al output con `lastFrame()` que retorna un string con el contenido renderizado.
- Para verificar estilos (bold, color), puede ser necesario inspeccionar los códigos ANSI o simplemente verificar la presencia del texto.

---

## 5. Pantalla de Modelos — `packages/tui/src/screens/Models.tsx` + `hooks/useModels.ts`

### Archivo: `packages/tui/src/__tests__/unit/useModels-hook.test.ts`

| #   | Nombre del Test                                                          | Tipo     | Descripción                                                                          | Resultado Esperado                                                 |
| --- | ------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 38  | `useModels debe llamar a listModels al montarse`                         | Unitario | Mockear `AgentClient.prototype.listModels`. Montar el hook (via un wrapper de test). | `listModels` fue llamado 1 vez                                     |
| 39  | `useModels debe setear loading=false después de cargar`                  | Unitario | Esperar a que la promesa resuelva.                                                   | `loading` cambia de `true` a `false`                               |
| 40  | `useModels debe setear error cuando listModels falla`                    | Unitario | Mockear `listModels` para lanzar `Error('fail')`.                                    | `error` es `'fail'`                                                |
| 41  | `selectModel debe llamar a setActiveModel del SDK y actualizar el store` | Unitario | Mockear `AgentClient.prototype.setActiveModel`. Invocar `selectModel('llama3')`.     | `setActiveModel` fue llamado con `'llama3'`. El store se actualiza |

#### Notas de implementación:

- Mockear todo el módulo `@agent/sdk` con `vi.mock('@agent/sdk')`.
- Para testear hooks aislados, usar un wrapper mínimo de React con `renderHook` de `@testing-library/react` o un componente de test con Ink.

### Archivo: `packages/tui/src/__tests__/components/ModelsScreen.test.tsx`

| #   | Nombre del Test                                                  | Tipo       | Descripción                                                                               | Resultado Esperado                                         |
| --- | ---------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 42  | `ModelsScreen debe mostrar "Cargando modelos..." mientras carga` | Componente | Mockear `useModels` para retornar `{ loading: true, ...defaults }`. Renderizar.           | El texto `"Cargando modelos..."` está presente             |
| 43  | `ModelsScreen debe mostrar error cuando hay un error`            | Componente | Mockear `useModels` con `{ error: 'Fallo', loading: false }`.                             | El texto `"Error: Fallo"` está presente con color rojo     |
| 44  | `ModelsScreen debe listar los modelos con nombre y tamaño`       | Componente | Mockear con 2 modelos. Renderizar.                                                        | Ambos nombres de modelo y tamaños GB aparecen en el output |
| 45  | `ModelsScreen debe marcar el modelo activo con ★`                | Componente | Mockear `activeModel` en el store al nombre del primer modelo. Renderizar.                | El texto `"★"` aparece junto al modelo activo              |
| 46  | `ModelsScreen debe mostrar advertencia para modelos >8GB`        | Componente | Incluir un modelo con `size: 10 * 1024 * 1024 * 1024` (10GB).                             | El texto `"⚠️ Requiere >16GB RAM"` está presente           |
| 47  | `ModelsScreen debe mostrar barra de progreso durante pull`       | Componente | Mockear `useModels` con `{ pulling: true, pullProgress: { completed: 50, total: 100 } }`. | El texto `"Descargando... 50%"` está presente              |

---

## 6. App Principal — `packages/tui/src/App.tsx`

### Archivo: `packages/tui/src/__tests__/components/App.test.tsx`

| #   | Nombre del Test                                                  | Tipo       | Descripción                                                               | Resultado Esperado                                            |
| --- | ---------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 48  | `App debe renderizar el Header`                                  | Componente | Renderizar `<App />`. Buscar `"Agent"` en el output.                      | `"Agent"` está presente                                       |
| 49  | `App debe renderizar el TabBar`                                  | Componente | Buscar `"Modelos"`, `"Chat"`, `"Sesiones"` en el output.                  | Los 3 textos de pestañas están presentes                      |
| 50  | `App debe mostrar ModelsScreen por defecto`                      | Componente | Verificar que el contenido de ModelsScreen aparece (mockear `useModels`). | Contenido de la pantalla de Modelos está visible              |
| 51  | `App debe mostrar ChatScreen cuando activeScreen='chat'`         | Componente | Setear `activeScreen: 'chat'` en el store antes de renderizar.            | El texto `"Pantalla de Chat (Placeholder)"` está presente     |
| 52  | `App debe mostrar SessionsScreen cuando activeScreen='sessions'` | Componente | Setear `activeScreen: 'sessions'`.                                        | El texto `"Pantalla de Sesiones (Placeholder)"` está presente |

#### Notas de implementación:

- Para tests de navegación con `useInput`, se puede usar `stdin.write()` de `ink-testing-library` para simular teclas.
- Mockear los hooks de red (`useModels`) para evitar llamadas HTTP reales.

---

## Resumen de Cobertura Fase 2

| Módulo                      | Tests Unitarios | Tests Componente | Total  |
| --------------------------- | :-------------: | :--------------: | :----: |
| `sdk/src/sse.ts`            |        6        |        0         |   6    |
| `sdk/src/client.ts`         |       11        |        0         |   11   |
| `tui/store/app-store.ts`    |       11        |        0         |   11   |
| `tui/components/Header.tsx` |        0        |        6         |   6    |
| `tui/components/TabBar.tsx` |        0        |        3         |   3    |
| `tui/hooks/useModels.ts`    |        4        |        0         |   4    |
| `tui/screens/Models.tsx`    |        0        |        6         |   6    |
| `tui/App.tsx`               |        0        |        5         |   5    |
| **TOTAL**                   |     **32**      |      **20**      | **52** |

---

## Resumen General del Proyecto

| Fase      | Tests Unitarios | Tests Integración/Componente | Total  |
| --------- | :-------------: | :--------------------------: | :----: |
| Fase 1    |       19        |              14              | **33** |
| Fase 2    |       32        |              20              | **52** |
| **TOTAL** |     **51**      |            **34**            | **85** |
