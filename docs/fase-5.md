# Fase 5 — Pulido, Edge Cases y Validación

## Resumen

Completar el MVP del sistema de agente transformando el sistema funcional de las fases anteriores en un producto robusto y listo para uso real. Esta fase se enfoca en robustez, manejo de errores, validación cross-platform y documentación de compatibilidad.

## Estado Actual (27 de marzo, 2026)

### Progreso General

- **Completado**: 6 de 20 tareas principales (30%)
- **Archivos creados**: 10 nuevos módulos
- **Archivos modificados**: 11 archivos existentes

### ✅ Completado

- Documento de requisitos creado (16 requisitos, 127 criterios de aceptación)
- Documento de diseño técnico creado (33 properties, 8 módulos nuevos)
- Documento de tareas creado (20 tareas principales, 73 sub-tareas)
- Especificación completa lista para implementación
- **Tarea 18**: Dependencias instaladas (pino, pino-pretty, lodash.throttle, fast-check)
- **Tarea 1**: Error Handler Module implementado (100%)
  - ✅ Error handler centralizado con clases específicas de error
  - ✅ Health check de Ollama
  - ✅ Logger con pino (niveles configurables, pretty-print/JSON)
  - ✅ Middleware de error handling integrado en Hono
  - ✅ Logging integrado en agent loop, tools y SSE
- **Tarea 3**: Graceful Shutdown implementado (100%)
  - ✅ Módulo GracefulShutdown con tracking de conexiones
  - ✅ Secuencia de shutdown: stop accepting → wait requests → close SSE → close DB
  - ✅ Integrado en servidor con handlers SIGINT/SIGTERM
- **Tarea 4**: Manejo de errores de Ollama en TUI (100%)
  - ✅ Pantalla de Modelos muestra mensaje claro cuando Ollama no está disponible
  - ✅ Componente ModelWarning para modelos >8GB
  - ✅ Confirmación antes de seleccionar modelo grande
  - ✅ Manejo de errores mid-stream en Chat (preserva tokens parciales)
- **Tarea 5**: Recuperación de desconexión SSE (100%)
  - ✅ Método resync() en SDK
  - ✅ Detección de desconexión en <5 segundos
  - ✅ Banner de reconexión en Chat
  - ✅ Preservación de input no enviado
- **Tarea 7**: CLI Wrapper implementado (100%)
  - ✅ Script cli.ts con validación de Node ≥20
  - ✅ Espera a que servidor responda en /health (timeout 30s)
  - ✅ Coordinación de shutdown (TUI exit → SIGTERM a server)
  - ✅ Manejo de crashes (server crash → close TUI)
  - ✅ Scripts actualizados en package.json (dev, dev:server, dev:tui)
- **Tarea 12**: Optimizaciones de performance (100%)
  - ✅ Throttling de tokens a 50ms con lodash.throttle
  - ✅ Virtualización de mensajes (solo últimos 50 cuando >50)
  - ✅ Componentes MessageBubble y ToolCall con React.memo
  - ✅ Scroll automático condicional

### ⏳ Pendiente

- Tarea 8-9: Validación cross-platform (Windows/Linux)
- Tarea 11: Componentes mejorados de TUI (PermissionDialog, ModeIndicator)
- Tarea 13-15: Scripts de validación (modelos, ANSI, performance)
- Tarea 17: Mejoras en parser de tool calls
- Tarea 19: Actualizar documentación
- Tests unitarios y property-based tests (opcionales, 33 properties)

### 🎯 Próximos Pasos

1. Instalar dependencias necesarias (pino, supports-color, lodash.throttle, fast-check)
2. Implementar infraestructura base (error handler, logger, graceful shutdown)
3. Implementar CLI wrapper
4. Agregar manejo de errores en TUI
5. Implementar recuperación de desconexión SSE
6. Crear scripts de validación
7. Implementar optimizaciones de performance
8. Ejecutar validación cross-platform

## Objetivos de la Fase

1. **Robustez**: Manejo graceful de todos los escenarios de error comunes
2. **Validación Cross-Platform**: Garantizar funcionamiento en Windows y Linux
3. **Documentación y Tooling**: Scripts de validación y documentación de modelos
4. **Performance**: Optimizaciones para TUI fluida con muchos mensajes
5. **UX**: Mensajes de error claros y recuperación automática de fallos

---

## Módulos a Implementar

### 1. Error Handler Module

**Archivo**: `packages/server/src/lib/error-handler.ts`

Módulo centralizado para manejo de errores del servidor:

- Clases de error específicas (OllamaNotAvailableError, ModelNotFoundError, etc.)
- Health check de Ollama después de errores
- Formato consistente de respuestas de error
- Contexto y sugerencias en errores

**Estado**: ⏳ Pendiente

---

### 2. Graceful Shutdown Module

**Archivo**: `packages/server/src/lib/shutdown.ts`

Maneja el cierre ordenado del servidor:

- Tracking de conexiones SSE activas
- Tracking de requests en progreso
- Secuencia de shutdown: stop accepting → wait requests → close SSE → close DB
- Timeout de 10 segundos con force exit

**Estado**: ⏳ Pendiente

---

### 3. Logger Module

**Archivo**: `packages/server/src/lib/logger.ts`

Sistema de logging estructurado con pino:

- 6 niveles: trace, debug, info, warn, error, fatal
- Configuración via LOG_LEVEL env var
- Pretty-print en development, JSON en production
- Helpers para logging contextual (requests, tool calls, SSE)

**Estado**: ⏳ Pendiente

---

### 4. CLI Wrapper

**Archivo**: `packages/tui/src/cli.ts`

Script que arranca servidor y TUI simultáneamente:

- Verificación de Node.js ≥20
- Espera a que servidor responda en /health (timeout 30s)
- Coordinación de shutdown (TUI exit → SIGTERM a server)
- Manejo de crashes (server crash → close TUI)

**Estado**: ⏳ Pendiente

---

### 5. Model Validation Script

**Archivo**: `scripts/test-models.ts`

Script para validar compatibilidad de modelos:

- 5 escenarios de test predefinidos (read_file, list_files, search_files, write_file, bash)
- Validación de tool calls, JSON y parámetros
- Cálculo de tasa de éxito por modelo
- Generación automática de MODELS.md

**Estado**: ⏳ Pendiente

---

### 6. ANSI Validation Script

**Archivo**: `scripts/test-ansi.ts`

Script para validar soporte ANSI en terminales:

- Detección de terminal via env vars
- Tests de colores 256, true color, cursor movement, clear screen
- Reporte de capacidades disponibles
- Tabla de compatibilidad

**Estado**: ⏳ Pendiente

---

### 7. Performance Benchmark Script

**Archivo**: `scripts/test-ink-perf.ts`

Script para medir performance de la TUI:

- Simulación de 100 mensajes
- Medición de tiempo de render
- Validación de <200ms total
- Reporte de resultados

**Estado**: ⏳ Pendiente

---

### 8. Enhanced TUI Components

**Permission Dialog** (`packages/tui/src/components/PermissionDialog.tsx`):

- Modal con opciones Sí/No
- Muestra tool name, args y descripción
- Countdown de 5 minutos
- Bloquea interacción hasta respuesta

**Mode Indicator** (en `packages/tui/src/components/Header.tsx`):

- Muestra "Modo: PLAN" (amarillo) o "Modo: BUILD" (rojo)
- Atajo Ctrl+M para cambiar modo
- Notificación temporal al cambiar

**Model Warning** (en `packages/tui/src/screens/Models.tsx`):

- Indicador "⚠️ Modelo grande — requiere >16GB RAM" para modelos >8GB
- Confirmación antes de seleccionar modelo grande
- Muestra tamaño y parámetros para todos los modelos

**Estado**: ⏳ Pendiente

---

## Correctness Properties

El diseño identifica 33 properties únicas después de eliminar redundancias:

### Error Handling (Properties 1-3)

- Property 1: Tool Error Injection
- Property 2: Tool Error Logging
- Property 3: Bash Exit Code Handling

### Large Models (Properties 4-5)

- Property 4: Large Model Warning Display
- Property 5: Model Information Completeness

### SSE & Resync (Properties 6-7)

- Property 6: SSE Disconnection Detection
- Property 7: Resync State Preservation

### Graceful Shutdown (Property 8)

- Property 8: Graceful Shutdown Invariants

### Logging (Properties 9-12)

- Property 9: Logger Level Support
- Property 10: Error Logging Format
- Property 11: Log Format by Environment
- Property 12: SSE Connection Logging

### CLI Wrapper (Properties 13-15)

- Property 13: Node Version Validation
- Property 14: Server Health Wait
- Property 15: Coordinated Shutdown

### Cross-Platform (Properties 16-19)

- Property 16: ANSI Support Detection
- Property 17: Cross-Platform Path Normalization
- Property 18: Windows UTF-8 Encoding
- Property 19: Unix Permission Respect

### Model Documentation (Properties 20-23)

- Property 20: Model Documentation Completeness
- Property 21: Model Test Execution
- Property 22: Test Result Reporting
- Property 23: Terminal Detection

### Performance (Properties 24-27)

- Property 24: Token Render Throttling
- Property 25: Message Virtualization
- Property 26: Scroll Auto-disable
- Property 27: Performance Benchmark

### UI Components (Properties 28-31)

- Property 28: Permission Dialog Display
- Property 29: Permission Dialog Countdown
- Property 30: Mode Indicator Display
- Property 31: Mode Change Reactivity

### Parser (Properties 32-33)

- Property 32: Parser Round-Trip Preservation
- Property 33: Parser Validation Error Messages

---

## Testing Strategy

### Dual Approach

- **Unit Tests**: Ejemplos específicos, edge cases, platform-specific behavior
- **Property-Based Tests**: Invariantes universales, round-trip properties

### Configuration

- Biblioteca: `fast-check`
- Mínimo 100 iteraciones por property test
- Seed-based reproducibility para tests fallidos
- Tags: `Feature: fase-5-pulido-validacion, Property {number}: {property_text}`

### Test Organization

```
packages/server/tests/
├── unit/
│   ├── error-handler.test.ts
│   ├── graceful-shutdown.test.ts
│   ├── logger.test.ts
│   └── health-check.test.ts
├── integration/
│   ├── cli-wrapper.test.ts
│   ├── cross-platform.test.ts
│   └── resync.test.ts
└── property/
    ├── tool-errors.test.ts
    ├── paths.test.ts
    ├── parser.test.ts
    └── performance.test.ts

scripts/tests/
├── test-models.test.ts
├── test-ansi.test.ts
└── test-ink-perf.test.ts

packages/tui/tests/
├── components/
│   ├── permission-dialog.test.ts
│   ├── mode-indicator.test.ts
│   └── model-warning.test.ts
└── integration/
    ├── disconnection.test.ts
    └── throttling.test.ts
```

---

## Nuevas Dependencias

### Server

- `pino` (^8.0.0): Structured logging
- `pino-pretty` (^10.0.0): Pretty-print logs in development

### TUI

- `supports-color` (^9.0.0): ANSI capability detection
- `lodash.throttle` (^4.1.1): Token update throttling

### Scripts

- `fast-check` (^3.0.0): Property-based testing library

### Dev Dependencies

- `@types/lodash.throttle` (^4.1.7)

---

## Timeline Estimado

| Tarea                                      | Duración | Dependencias            |
| ------------------------------------------ | -------- | ----------------------- |
| Error Handler + Health Check               | 1 día    | -                       |
| Graceful Shutdown                          | 1 día    | -                       |
| Logger Module                              | 0.5 día  | -                       |
| CLI Wrapper                                | 1 día    | Logger                  |
| Model Validation Script                    | 1 día    | -                       |
| ANSI Validation Script                     | 0.5 día  | -                       |
| Performance Benchmark                      | 0.5 día  | -                       |
| TUI Components (Dialog, Indicators)        | 1 día    | -                       |
| Performance Optimizations (throttle, memo) | 1 día    | -                       |
| Cross-Platform Testing                     | 1 día    | Todos los módulos       |
| Property-Based Tests                       | 1 día    | Todos los módulos       |
| Documentation (MODELS.md)                  | 0.5 día  | Model Validation Script |

**Total estimado**: 9-10 días

---

## Decisiones Técnicas

- **Error Handling**: Estrategia en 3 capas (TUI → SDK → Server)
- **Graceful Shutdown**: Timeout de 10s, force exit si no completa
- **Logging**: pino con pretty-print en dev, JSON en prod
- **CLI Wrapper**: Espera health check antes de arrancar TUI
- **Performance**: Throttle 50ms, virtualización >50 mensajes, React.memo
- **Cross-Platform**: Normalización automática de paths, detección de shell
- **Testing**: Dual approach (unit + property-based con fast-check)

---

## Riesgos y Mitigaciones

| Riesgo                              | Impacto | Mitigación                                                |
| ----------------------------------- | ------- | --------------------------------------------------------- |
| Ollama crashes durante generación   | Alto    | Health check después de errores, preservar output parcial |
| Modelos grandes causan OOM          | Alto    | Warning UI, documentación de requisitos de hardware       |
| Desconexión SSE pierde estado       | Medio   | Mecanismo de resync, preservar input no enviado           |
| Problemas de paths cross-platform   | Medio   | Normalizar todos los paths, tests en ambas plataformas    |
| Performance TUI con muchos mensajes | Medio   | Throttling, virtualización, React.memo                    |
| Timeout de graceful shutdown        | Bajo    | Force exit después de 10s, log de shutdown incompleto     |
| Terminal sin soporte ANSI           | Bajo    | Detectar y fallback a layout simplificado                 |

---

## Demostrable al Final

MVP completo funcional:

1. ✅ Manejo graceful de todos los errores comunes
2. ✅ Funciona en Windows 10/11 y Linux
3. ✅ Se puede instalar con: instala Ollama, instala Node, clona, pnpm install, pnpm dev
4. ✅ MODELS.md documenta qué modelos funcionan y con qué nivel de calidad
5. ✅ TUI fluida incluso con 100+ mensajes
6. ✅ Recuperación automática de desconexiones SSE
7. ✅ Logging estructurado para debugging
8. ✅ CLI wrapper arranca todo con un comando
9. ✅ Validación cross-platform completa
10. ✅ Tests (unit + property-based) pasan en ambas plataformas

---

## Notas de Implementación

### Error Response Format

Todos los errores del servidor siguen formato consistente:

```typescript
{
  error: string;        // Error code (e.g., "OLLAMA_NOT_AVAILABLE")
  message: string;      // Human-readable message
  context?: {           // Optional context for debugging
    operation: string;
    sessionId?: string;
    toolName?: string;
    modelName?: string;
  };
  suggestion?: string;  // Actionable suggestion (e.g., "Run 'ollama serve'")
}
```

### Timeout Configuration

- Ollama generation: 120s
- Permission request: 5min
- Graceful shutdown: 10s
- Server health wait: 30s

### Log Levels

- `trace`: Very detailed debugging (not used in production)
- `debug`: HTTP requests, tool calls, SSE connections
- `info`: Server startup, configuration, major events
- `warn`: Recoverable errors, deprecations
- `error`: Tool failures, Ollama errors, DB errors
- `fatal`: Unrecoverable errors that crash the server

### Performance Optimizations

1. **React.memo**: Wrap MessageBubble and ToolCall components
2. **Throttle**: Group token updates to 50ms intervals
3. **Virtualization**: Render only last 50 messages when >50 exist
4. **Conditional Scroll**: Only auto-scroll when user is at bottom

### Cross-Platform Considerations

- **Windows**: pwsh → powershell → cmd (shell detection)
- **Linux**: bash → sh (shell detection)
- **Paths**: Normalización automática con `path.normalize()`
- **ANSI**: Detección con `supports-color`, fallback si no disponible
- **UTF-8**: Forzar encoding en Windows para bash tool

---

## Correcciones de Seguridad (27 de marzo, 2026)

### Vulnerabilidades Críticas Corregidas

#### ✅ VULN-001: Inyección de Comandos Shell (CRÍTICA)

**Archivo**: `packages/server/src/tools/bash.ts`

**Implementación**:

- Whitelist de comandos permitidos (ls, cat, grep, git, npm, pnpm, node, python, etc.)
- Validación de patrones peligrosos (`;`, `&`, `|`, `` ` ``, `$`, `()`)
- Filtrado de variables de entorno a whitelist segura (PATH, HOME, USER, TEMP)
- Rechazo de comandos no permitidos con mensaje de error claro

**Estado**: ✅ Completado

---

#### ✅ VULN-002: Path Traversal (CRÍTICA)

**Archivos modificados**:

- `packages/server/src/lib/path-validator.ts` (nuevo)
- `packages/server/src/tools/read-file.ts`
- `packages/server/src/tools/write-file.ts`
- `packages/server/src/tools/edit-file.ts`
- `packages/server/src/tools/list-files.ts`
- `packages/server/src/tools/search-files.ts`

**Implementación**:

- Módulo `validatePath()` que normaliza paths y valida que estén dentro del workspace
- Rechazo de paths con `..` (path traversal)
- Validación de que el path resuelto esté dentro de WORKSPACE_ROOT
- Aplicado a todas las operaciones de archivos (read, write, edit, list, search)

**Estado**: ✅ Completado

---

#### ✅ VULN-003: Prompt Injection (CRÍTICA)

**Archivos modificados**:

- `packages/server/src/agent/prompt.ts`
- `packages/server/src/agent/loop.ts`

**Implementación**:

- Instrucciones en system prompt sobre delimitadores XML
- Mensajes de usuario envueltos en `<user_data>` tags
- Resultados de herramientas envueltos en `<tool_result>` tags
- Separación clara entre instrucciones del sistema y datos del usuario

**Estado**: ✅ Completado

---

### Vulnerabilidades Altas Corregidas

#### ✅ VULN-004: Exfiltración de Secretos en Logs (ALTA)

**Archivo**: `packages/server/src/lib/logger.ts`

**Implementación**:

- Función `redactSensitive()` que detecta patrones sensibles (api_key, password, secret, token, bearer, authorization)
- Redacción de valores sensibles a `[REDACTED]`
- Truncado de strings largos (>200 chars)
- Aplicado a `logToolCall()` para filtrar args y results

**Estado**: ✅ Completado

---

#### ✅ VULN-005: Variables de Entorno sin Filtrar (ALTA)

**Archivo**: `packages/server/src/tools/bash.ts`

**Implementación**:

- Incluido en fix de VULN-001
- Whitelist de variables de entorno seguras (PATH, HOME, USER, USERPROFILE, TEMP, TMP)
- Eliminación de todas las demás variables de entorno del proceso hijo

**Estado**: ✅ Completado

---

#### ✅ VULN-006: ReDoS en search_files (ALTA)

**Archivo**: `packages/server/src/tools/search-files.ts`

**Implementación**:

- Función `isRegexSafe()` que detecta patrones peligrosos (nested quantifiers)
- Límite de longitud de regex (<100 chars)
- Timeout de 10 segundos con `Promise.race()`
- Rechazo de regex complejos con mensaje de error

**Estado**: ✅ Completado

---

#### ✅ VULN-007: Bypass de Permisos en Modo Build (ALTA)

**Archivo**: `packages/server/src/agent/permissions.ts`

**Implementación**:

- Función `requiresHumanConfirmation()` para operaciones críticas
- Detección de comandos peligrosos (rm, del, format, dd, mkfs, rmdir, deltree)
- Detección de paths críticos (.git, package.json, .env, config, database)
- Confirmación humana requerida incluso en modo build para operaciones críticas

**Estado**: ✅ Completado

---

### Vulnerabilidades Medias Corregidas

#### ✅ VULN-010: Detección de Loops Insuficiente (MEDIA)

**Archivo**: `packages/server/src/agent/loop.ts`

**Implementación**:

- Tracking de historial de tool calls (nombre + args)
- Detección de ciclos de longitud 2 (A→B→A→B)
- Detección de ciclos de longitud 3 (A→B→C→A→B→C)
- Comparación de nombre y argumentos para detectar patrones

**Estado**: ✅ Completado

---

#### ✅ VULN-011: Stack Traces en Errores (MEDIA)

**Archivo**: `packages/server/src/lib/logger.ts`

**Implementación**:

- Stack traces solo en desarrollo (NODE_ENV !== 'production')
- Omisión de stack traces en producción para evitar exposición de información
- Aplicado a función `logError()`

**Estado**: ✅ Completado

---

#### ✅ VULN-012: Ausencia de Timeout en Archivos (MEDIA)

**Archivo**: `packages/server/src/tools/read-file.ts`

**Implementación**:

- Límite de tamaño de archivo: 10MB (antes 100KB)
- Timeout de lectura: 5 segundos
- Validación de tamaño antes de leer con `statSync()`
- `Promise.race()` para implementar timeout

**Estado**: ✅ Completado

---

### Resumen de Correcciones

| ID       | Vulnerabilidad               | Severidad | Estado |
| -------- | ---------------------------- | --------- | ------ |
| VULN-001 | Inyección de Comandos Shell  | CRÍTICA   | ✅     |
| VULN-002 | Path Traversal               | CRÍTICA   | ✅     |
| VULN-003 | Prompt Injection             | CRÍTICA   | ✅     |
| VULN-004 | Exfiltración de Secretos     | ALTA      | ✅     |
| VULN-005 | Variables de Entorno         | ALTA      | ✅     |
| VULN-006 | ReDoS                        | ALTA      | ✅     |
| VULN-007 | Bypass de Permisos           | ALTA      | ✅     |
| VULN-010 | Detección de Loops           | MEDIA     | ✅     |
| VULN-011 | Stack Traces                 | MEDIA     | ✅     |
| VULN-012 | Timeout en Archivos          | MEDIA     | ✅     |
| VULN-008 | Base de Datos sin Cifrar     | ALTA      | ⏳     |
| VULN-009 | Ausencia de Rate Limiting    | MEDIA     | ⏳     |
| VULN-013 | Compactación sin Implementar | MEDIA     | ⏳     |
| VULN-014 | HTTP Ollama                  | BAJA      | ⏳     |
| VULN-015 | CORS                         | BAJA      | ⏳     |

**Progreso**: 10 de 15 vulnerabilidades corregidas (67%)

---

### Archivos Modificados para Seguridad

**Nuevos**:

- `packages/server/src/lib/path-validator.ts`

**Modificados**:

- `packages/server/src/tools/bash.ts`
- `packages/server/src/tools/read-file.ts`
- `packages/server/src/tools/write-file.ts`
- `packages/server/src/tools/edit-file.ts`
- `packages/server/src/tools/list-files.ts`
- `packages/server/src/tools/search-files.ts`
- `packages/server/src/agent/prompt.ts`
- `packages/server/src/agent/loop.ts`
- `packages/server/src/agent/permissions.ts`
- `packages/server/src/lib/logger.ts`

**Total**: 1 nuevo, 10 modificados

---

### Próximas Correcciones de Seguridad

1. **VULN-008**: Cifrado de base de datos (Alta prioridad)
   - Crear módulo de cifrado con AES-256-GCM
   - Cifrar campos sensibles antes de almacenar
   - Implementar rotación de claves

2. **VULN-009**: Rate Limiting (Media prioridad)
   - Middleware de rate limiting por IP
   - 60 requests por minuto por IP
   - Respuesta 429 cuando se excede el límite

3. **VULN-013**: Compactación real con LLM (Media prioridad)
   - Implementar resumen real de mensajes antiguos
   - Usar LLM para generar resumen contextual
   - Reemplazar mensajes antiguos con resumen

4. **VULN-014**: HTTPS para Ollama (Baja prioridad)
   - Documentar configuración de HTTPS
   - Agregar validación de certificados

5. **VULN-015**: CORS restrictivo (Baja prioridad)
   - Configurar CORS con whitelist de orígenes
   - Solo permitir localhost en desarrollo

---

### Controles Preventivos Pendientes

Según `auditoria-seguridad/03-controles-preventivos.md`:

1. **Análisis Estático**:
   - Configurar eslint-plugin-security
   - Configurar Semgrep con reglas custom
   - Integrar en pre-commit hooks

2. **Métricas de Seguridad**:
   - Tracking de tool calls rechazados
   - Tracking de intentos de path traversal
   - Tracking de comandos bloqueados
   - Dashboard de métricas de seguridad

3. **Documentación**:
   - Guía de seguridad para desarrolladores
   - Documentación de arquitectura de seguridad
   - Runbook de respuesta a incidentes

---

## Fix Adicional: Visualización de Respuestas del Modelo

### Problema Identificado

El TUI mostraba el texto completo del modelo incluyendo los bloques JSON de tool calls, lo que hacía que las respuestas fueran ilegibles. El modelo solo mostraba código JSON en lugar de texto conversacional.

### Solución Implementada

**Archivos modificados**:

- `packages/server/src/agent/parser.ts`
- `packages/server/src/agent/loop.ts`
- `packages/server/src/agent/prompt.ts`
- `packages/tui/src/hooks/useChat.ts`

**Cambios**:

1. **Parser mejorado**:
   - Regex más flexible que acepta `<tool_call>` y `<tool_call name="...">` (malformado)
   - Función `stripToolCalls()` para remover bloques de tool calls del texto
   - Manejo de formatos incorrectos generados por modelos pequeños

2. **Prompt mejorado**:
   - Ejemplos explícitos de formato CORRECTO vs INCORRECTO
   - Instrucciones claras sobre el formato exacto del tag `<tool_call>`
   - Reglas críticas destacadas

3. **Filtrado en cliente (TUI)**:
   - Filtrado de tool calls durante streaming (actualización en tiempo real)
   - Filtrado de tool calls al guardar mensaje final
   - Separación de texto conversacional antes del tool call
   - Solo muestra texto limpio al usuario

4. **Limpieza en servidor**:
   - Filtrado de tool calls malformados en evento 'done'
   - Preservación de texto conversacional

**Resultado**:

- El usuario ahora ve solo el texto conversacional del modelo
- Los tool calls se muestran en componentes separados (ToolCall component)
- El texto JSON no contamina la conversación
- Mejor experiencia de usuario

**Estado**: ✅ Completado
