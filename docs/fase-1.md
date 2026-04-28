# Fase 1 — Servidor base + DB + Vercel AI SDK

## Resumen de lo realizado

En la **Fase 1**, se implementó el esqueleto principal del servidor Hono y sus integraciones vitales: Persistencia (Base de Datos) e IA.

### Tareas Completadas:

1. **Servidor Hono (`index.ts`):**
   - Inicialización del servidor backend.
   - Endpoint `/health` con el status de conexión, listo para la TUI.
   - Habilitación de CORS para el consumo externo y estructuración de rutas.

2. **Base de Datos y Migraciones (Drizzle + SQLite):**
   - Configuración de `better-sqlite3`.
   - Definición del esquema (`db/schema.ts`) con las tablas principales: `sessions`, `messages`, `config`, y la nueva tabla `session_metadata` pensada para la mitigación del riesgo 4 (compactación de contexto).
   - Generación de un script `migrate.ts` para ejecutar automáticamente las migraciones disponibles.

3. **Integración con IA (`ai/provider.ts` y `ai/ollama-management.ts`):**
   - Construcción del proveedor AI genérico configurando el SDK de Vercel (`createOpenAI`).
   - Implementación de herramientas nativas para interactuar con la API directa de Ollama (`listModels`, `pullModel`) que trascienden el uso estándar de texto de Vercel SDK.

4. **SSE (Server-Sent Events):**
   - Nuevo middleware (`middleware/sse.ts`) diseñado específicamente para enviar secuencias consistentes (`sequence number`) y evitar problemas de desconexión descritos en los riesgos técnicos identificados.

5. **Rutas REST estructuradas:**
   - Creación y asociación de `api/models` validado por Zod, utilizando los componentes antes mencionados para listar modelos, iniciar descargas en stream de SSE y definir el modelo activo guardándolo en base de datos.
