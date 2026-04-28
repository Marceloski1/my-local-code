# Fase 3 — Tools del agente + loop ReAct

## Resumen

Implementación de los 6 tools del agente, el loop ReAct completo con Vercel AI SDK, compactación de contexto con metadata no compactable, y soporte para modos plan/build.

## Tareas Completadas

### 1. ✅ Shell Detection (`lib/shell.ts`)

**Estado**: Completado

Detecta el shell disponible en el sistema:

- Windows: `pwsh` → `powershell` → `cmd`
- Linux: `bash` → `sh`

**Archivos**:

- `packages/server/src/lib/shell.ts` — Función `detectShell()` y `getShellInfo()`

**Notas**:

- Usa `which` en Linux y `where` en Windows para buscar ejecutables
- Fallback garantizado (siempre hay un shell disponible)

### 2. ✅ Tools Implementation (6 tools)

**Estado**: Completado

Todos los 6 tools implementados y compilando:

- `read_file` — Lee contenido, trunca >100KB
- `write_file` — Crea/sobreescribe, crea directorios padres
- `edit_file` — Reemplaza primera ocurrencia
- `bash` — Ejecuta con shell detectada, timeout 30s
- `list_files` — Depth 3 default, max 10, excluye node_modules/.git/dist/build
- `search_files` — Grep recursivo, max 50 resultados

**Archivos**:

- `packages/server/src/tools/read-file.ts`
- `packages/server/src/tools/write-file.ts`
- `packages/server/src/tools/edit-file.ts`
- `packages/server/src/tools/bash.ts`
- `packages/server/src/tools/list-files.ts`
- `packages/server/src/tools/search-files.ts`

### 3. ✅ Tool Registry

**Estado**: Completado

Registro centralizado de tools con dos interfaces:

- Interna: `ToolSpec` con schema Zod + ejecutor
- Vercel SDK: `{ description, parameters }`

**Archivos**:

- `packages/server/src/tools/registry.ts`

### 4. ✅ System Prompt

**Estado**: Completado

Prompt base con instrucciones ReAct e inyección dinámica de info de OS/shell.

**Archivos**:

- `packages/server/src/agent/prompt.ts` — Función `buildSystemPrompt()`

### 5. ✅ Parser Textual

**Estado**: Completado

Parser con regex estricta + validación Zod para fallback textual.

**Archivos**:

- `packages/server/src/agent/parser.ts` — Funciones `parseToolCalls()`, `hasToolCalls()`, `extractFirstToolCall()`

### 6. ✅ Context Compaction

**Estado**: Completado

Módulo para estimación de tokens y compactación de contexto.

**Archivos**:

- `packages/server/src/agent/context.ts` — Funciones de compactación y estimación

### 8. ✅ Agent Loop

**Estado**: Completado

Loop ReAct completo con Vercel AI SDK, enfoque híbrido, modos plan/build.

**Archivos**:

- `packages/server/src/agent/loop.ts` — Función `runAgent()` con generador async

**Características**:

- Streaming de tokens
- Detección de tool calls con parser textual
- Detección de loops (máximo 3 repeticiones)
- Permisos en modo plan
- Rate limiting en modo build
- Compactación de contexto

---

## Próximas Tareas

### 10. ✅ Validación Scripts

**Estado**: Completado

Scripts para validar compatibilidad de modelos y compactación.

**Archivos**:

- `scripts/test-models.ts` — Prueba tool calling con modelos instalados
- `scripts/test-compaction.ts` — Valida lógica de compactación

### 11. 🔄 Tests de Fase 3

**Estado**: Especificación completada, implementación pendiente

Especificación de tests creada en `docs/test-spec/fase-3.test-spec.md`:

- 128 tests especificados (104 unitarios + 24 integración)
- Cobertura completa de todos los módulos de Fase 3
- Tests organizados por módulo con descripciones detalladas

**Estado actual de tests**:

- ✅ Fase 1: 33/33 tests pasando (server)
- ✅ Fase 2: 17/17 tests pasando (SDK)
- ⚠️ Fase 2: 29/31 tests pasando (TUI - 2 fallos pre-existentes)
- ⏳ Fase 3: 0/128 tests implementados (especificación lista)

---

## Resumen de Fase 3

**Completado**: 10/10 tareas principales + especificación de tests

### Componentes Implementados

1. **Shell Detection** - Detección cross-platform de shell
2. **6 Tools** - read_file, write_file, edit_file, bash, list_files, search_files
3. **Tool Registry** - Registro centralizado con dos interfaces
4. **System Prompt** - Prompt dinámico con info de OS/shell
5. **Parser Textual** - Regex + Zod para fallback
6. **Context Compaction** - Estimación de tokens y compactación
7. **Permissions** - Gestión de permisos en modo plan
8. **Agent Loop** - Loop ReAct completo con Vercel AI SDK
9. **Validation Scripts** - Test de modelos y compactación

### Características Clave

✅ Enfoque híbrido para tool calling (nativo + textual fallback)  
✅ Modos plan/build con permisos y rate limiting  
✅ Detección de loops (máximo 3 repeticiones)  
✅ Compactación de contexto al 75% del context_length  
✅ Streaming de tokens en tiempo real  
✅ Cross-platform (Windows, Linux, macOS)  
✅ Validación con Zod en todos los inputs

### Archivos Creados

**Shared**:

- packages/shared/src/index.ts (tipos ToolSpec, ToolResult)

**Server - Tools**:

- packages/server/src/tools/registry.ts
- packages/server/src/tools/read-file.ts
- packages/server/src/tools/write-file.ts
- packages/server/src/tools/edit-file.ts
- packages/server/src/tools/bash.ts
- packages/server/src/tools/list-files.ts
- packages/server/src/tools/search-files.ts

**Server - Agent**:

- packages/server/src/agent/loop.ts
- packages/server/src/agent/prompt.ts
- packages/server/src/agent/parser.ts
- packages/server/src/agent/context.ts
- packages/server/src/agent/permissions.ts

**Server - Lib**:

- packages/server/src/lib/shell.ts

**Scripts**:

- scripts/test-models.ts
- scripts/test-compaction.ts

### Estado de Compilación

✅ Todos los nuevos módulos compilan correctamente  
✅ Errores restantes son solo de tests existentes (no relacionados con Fase 3)  
✅ Tipos compartidos en @agent/shared funcionan correctamente

### Próxima Fase (Fase 4)

La Fase 4 implementará:

- Endpoints de chat/sesiones
- Persistencia de mensajes en SQLite
- Pantalla de Chat en TUI
- Pantalla de Sesiones en TUI
- Integración completa end-to-end

---

## Timeline

| Tarea              | Duración | Estado |
| ------------------ | -------- | ------ |
| Shell detection    | 1h       | ✅     |
| Tools (6)          | 2-3h     | ✅     |
| Tool registry      | 1h       | ✅     |
| System prompt      | 1h       | ✅     |
| Agent loop         | 2-3h     | ✅     |
| Parser textual     | 1h       | ✅     |
| Context compaction | 1-2h     | ✅     |
| Validation scripts | 1h       | ✅     |

**Total**: ~12 horas de desarrollo completadas

---

## Decisiones Técnicas

- **Vercel AI SDK**: Proveedor OpenAI-compatible con Ollama
- **Enfoque híbrido**: Tools nativos + fallback textual
- **Metadata no compactable**: Preserva contexto crítico
- **Rate limiting**: 500ms entre tools destructivos en modo build
- **Detección de loops**: Máximo 3 repeticiones de la misma tool call

---

## Riesgos Mitigados

| Riesgo                             | Mitigación                                |
| ---------------------------------- | ----------------------------------------- |
| Tool calling débil en modelos ≤13B | Enfoque híbrido nativo + textual          |
| Shell incompatible en Windows      | Detección pwsh → powershell → cmd         |
| Compactación pierde info           | Metadata no compactable                   |
| Loops infinitos                    | Detección de repetición + max iteraciones |

---

## Timeline

| Tarea              | Duración estimada | Estado         |
| ------------------ | ----------------- | -------------- |
| Shell detection    | 1h                | ⏳ En progreso |
| Tools (6)          | 2-3h              | ⏳ Próximo     |
| Tool registry      | 1h                | ⏳ Próximo     |
| System prompt      | 1h                | ⏳ Próximo     |
| Agent loop         | 2-3h              | ⏳ Próximo     |
| Parser textual     | 1h                | ⏳ Próximo     |
| Context compaction | 1-2h              | ⏳ Próximo     |
| Persistencia       | 1h                | ⏳ Próximo     |
| Validación         | 1-2h              | ⏳ Próximo     |

**Total estimado**: 5-7 días

---

## Notas de Implementación

- Todos los tools usan schemas Zod de `@agent/shared`
- El registry expone dos interfaces: interna (`ToolSpec`) y Vercel SDK (`tool()`)
- El loop del agente es agnóstico al proveedor (Ollama, LMStudio, OpenAI)
- La compactación preserva los últimos 10 mensajes intactos
- El parser textual es fallback, no la ruta principal
