# Agent - Local Code Assistant

![alt text]({C97367D4-7C91-409D-8865-201F129F1735}.png)
No se ha tenido acceso, por desgracia, al código de claude code para la realización de este proyecto
Un asistente de código local que usa Ollama y LMStudio para ejecutar modelos de lenguaje con capacidad de usar herramientas (tool calling). Sistema completo con interfaz de terminal (TUI), servidor API, y gestión de sesiones persistentes.

## 🚀 Quick Start

### Prerrequisitos

1. **Node.js 20+** (verifica con `node --version`)
2. **pnpm 10.30.0+** (instala con `npm install -g pnpm`)
3. **Proveedor de AI** (elige uno):
   - **Ollama** ([ollama.ai](https://ollama.ai)) - Recomendado, fácil de usar
   - **LMStudio** ([lmstudio.ai](https://lmstudio.ai)) - Alternativa con UI gráfica

### Instalación

````bash
# Clonar el repositorio
git clone <repo-url>
cd local-code

# Instalar dependencias
pnpm install

# Compilar el proyecto
pnpm build

# Opción A: Usar Ollama (recomendado)
ollama pull qwen2.5:7b        # Mejor balance calidad/velocidad
ollama pull llama3.2:3b       # Rápido, bueno para tareas simples
ollama pull gemma2:9b         # Alta calidad, requiere más RAM

# Opción B: Usar LMStudio
# 1. Descarga e instala LMStudio desde lmstudio.ai
# 2. Descarga un modelo compatible desde la UI
# 3. Inicia el servidor local en LMStudio (puerto 1234)
# Ver docs/lmstudio-integration.md para más detalles
```ama pull llama3.2:3b       # Rápido, bueno para tareas simples
ollama pull gemma2:9b         # Alta calidad, requiere más RAM
````

### Iniciar la Aplicación

```bash
# Iniciar todo con un comando (CLI wrapper automático)
pnpm dev

# El CLI wrapper:
# 1. Verifica Node.js ≥20
# 2. Inicia el servidor en background
# 3. Espera a que el servidor responda (health check)
# 4. Inicia la TUI
# 5. Coordina el shutdown cuando sales

# Alternativamente, iniciar componentes por separado:
pnpm dev:server    # Solo servidor (puerto 3000)
pnpm dev:tui       # Solo TUI (requiere servidor corriendo)
```

### Uso

1. **Pantalla de Modelos** (Tab 1):
   - Selecciona un modelo con las flechas ↑↓
   - Presiona Enter para activarlo
   - Verifica que aparece ★ junto al modelo activo
   - ⚠️ Advertencia automática para modelos >8GB

2. **Pantalla de Chat** (Tab 2):
   - Escribe tu pregunta o comando
   - El agente usa herramientas automáticamente:
     - `read_file` - Leer archivos (con validación de paths)
     - `write_file` - Crear/modificar archivos (con límites de tamaño)
     - `edit_file` - Editar archivos existentes
     - `bash` - Ejecutar comandos (whitelist de comandos seguros)
     - `list_files` - Listar directorios
     - `search_files` - Buscar en archivos (con protección ReDoS)
   - Recuperación automática de desconexiones SSE
   - Throttling de tokens (50ms) para performance fluida

3. **Pantalla de Sesiones** (Tab 3):
   - Ver historial de conversaciones
   - Continuar sesiones anteriores
   - Eliminar sesiones
   - Títulos dinámicos generados automáticamente

### Modos de Operación

- **Plan Mode** (default): El agente pide permiso antes de ejecutar comandos destructivos
- **Build Mode**: El agente ejecuta comandos automáticamente con delay de 500ms
- Operaciones críticas (rm, format, .git, .env) siempre requieren confirmación

Cambia entre modos con `Ctrl+M`.

---

## 📁 Estructura del Proyecto

```
local-code/
├── packages/
│   ├── server/      # API REST + Agent Loop + Tools
│   │   ├── src/agent/       # Loop ReAct, parser, permisos
│   │   ├── src/ai/          # Providers (Ollama, LMStudio)
│   │   ├── src/db/          # Drizzle ORM + SQLite
│   │   ├── src/lib/         # Error handler, logger, shutdown
│   │   ├── src/routes/      # Endpoints HTTP
│   │   └── src/tools/       # 6 herramientas del agente
│   ├── sdk/         # Cliente TypeScript + SSE
│   ├── tui/         # Terminal UI (Ink + Zustand)
│   └── shared/      # Tipos y constantes compartidas
├── scripts/         # Scripts de validación (modelos, ANSI, perf)
├── docs/            # Documentación de fases + specs de tests
├── auditoria-seguridad/  # Auditoría y correcciones de seguridad
└── .husky/          # Git hooks (commitlint, pre-commit)
```

---

## 🧪 Testing

```bash
# Ejecutar todos los tests
pnpm test

# Tests por paquete
pnpm --filter @agent/server test
pnpm --filter @agent/sdk test
pnpm --filter @agent/tui test
```

### Scripts de Validación

```bash
# Verificar soporte de colores ANSI en tu terminal
node scripts/test-ansi.ts

# Validar compatibilidad de modelos con tool calling
node scripts/test-models.ts

# Benchmark de performance de la TUI
node scripts/test-ink-perf.ts
```

### Cobertura de Tests

- Fase 1: 33 tests (servidor base + DB)
- Fase 2: 52 tests (SDK + TUI)
- Fase 3: 128 tests (tools + agent loop)
- Fase 4: 127 tests (chat + sesiones)
- Total especificado: 340 tests

---

## 🔧 Desarrollo

### Compilar

```bash
# Compilar todos los paquetes
pnpm build

# Compilar un paquete específico
pnpm --filter @agent/server build
```

### Linting, Formatting y Type Checking

```bash
# Lint (ESLint con TypeScript + React + Prettier)
pnpm lint
pnpm lint:fix

# Format (Prettier)
pnpm format
pnpm format:check

# Type checking
pnpm typecheck

# Spell checking
pnpm spell-check
```

### Commits

Este proyecto usa [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Usar el asistente de commits
pnpm commit

# O manualmente
git commit -m "feat: agregar nueva funcionalidad"
git commit -m "fix: corregir bug en chat"
git commit -m "docs: actualizar README"
```

---

## 📚 Documentación

### Configuración

- [ESLint Setup](docs/eslint-setup.md)
- [Prettier Setup](docs/prettier-setup.md)
- [Git Hooks Setup](docs/git-hooks-setup.md)

**Total**: 340 tests especificados

### Auditoría de Seguridad

- [Vulnerabilidades Identificadas](auditoria-seguridad/01-vulnerabilidades.md)
- [Plan de Remediación](auditoria-seguridad/02-plan-de-remediacion.md)
- [Controles Preventivos](auditoria-seguridad/03-controles-preventivos.md)
- [Resumen Ejecutivo](auditoria-seguridad/04-resumen-ejecutivo.md)

---

## 🐛 Troubleshooting

### Error: "Ollama no está disponible"

**Causa**: Ollama no está corriendo o no responde.

**Solución**:

```bash
# Iniciar Ollama
ollama serve

# Verificar que está corriendo
curl http://localhost:11434/api/tags
```

## 🐛 Troubleshooting

### Error: "Ollama no está disponible" / "LMStudio no está disponible"

**Causa**: El proveedor de AI no está corriendo o no responde.

**Solución para Ollama**:

```bash
# Iniciar Ollama
ollama serve

# Verificar que está corriendo
curl http://localhost:11434/api/tags
```

**Solución para LMStudio**:

1. Abre LMStudio
2. Ve a la pestaña "Local Server"
3. Carga un modelo
4. Haz clic en "Start Server" (puerto 1234 por defecto)
5. Verifica: `curl http://localhost:1234/v1/models`

El sistema detecta automáticamente cuando el proveedor no está disponible y muestra un mensaje claro en la TUI.

Consulta [docs/lmstudio-integration.md](docs/lmstudio-integration.md) para configuración detallada de LMStudio.

- Virtualización (solo últimos 50 mensajes cuando >50)
- React.memo en componentes pesados

### Logs para debugging

```bash
# Ver logs del servidor (desarrollo)
LOG_LEVEL=debug pnpm dev:server

# Logs en producción (JSON)
NODE_ENV=production pnpm dev:server
```

Para más problemas, consulta [docs/troubleshooting.md](docs/troubleshooting.md).

---

## 🏗️ Arquitectura

### Stack Tecnológico

- **Backend**: Hono + Drizzle ORM + SQLite
- **AI**: Vercel AI SDK + Ollama (soporte para LMStudio)
- **Frontend**: Ink (React para terminal) + Zustand
- **Monorepo**: pnpm workspaces + Turbo
- **Linting**: ESLint + TypeScript ESLint + React plugins
- **Formatting**: Prettier (integrado con ESLint)
- **Testing**: Vitest + fast-check (property-based testing)
- **Logging**: Pino (structured logging)
- **Git Hooks**: Husky + Commitlint
- **Language**: TypeScript

### Comandos de Desarrollo

```bash
# Desarrollo
pnpm dev                    # Iniciar todo (CLI wrapper)
pnpm dev:server             # Solo servidor
pnpm dev:tui                # Solo TUI
pnpm build                  # Compilar todos los packages
pnpm test                   # Ejecutar tests
pnpm typecheck              # Verificar tipos TypeScript

# Linting y Formato
pnpm lint                   # Ejecutar ESLint en todo el monorepo
pnpm lint:fix               # Auto-fix de errores de ESLint
pnpm format                 # Formatear código con Prettier
pnpm format:check           # Verificar formato sin modificar
pnpm spell-check            # Verificar ortografía

# Commits
pnpm commit                 # Asistente de commits (Conventional Commits)

# Por package
pnpm --filter @agent/sdk lint
pnpm --filter @agent/server format
pnpm --filter @agent/tui lint:fix
```

Para más información:

- ESLint: [docs/eslint-setup.md](docs/eslint-setup.md)
- Prettier: [docs/prettier-setup.md](docs/prettier-setup.md)
- Git Hooks: [docs/git-hooks-setup.md](docs/git-hooks-setup.md)

### Flujo de Datos

```
TUI (Ink) → SDK Client → Server API → Agent Loop → Ollama
                                    ↓
                                SQLite (sessions, messages)
### Flujo de Datos

```

TUI (Ink) → SDK Client → Server API → Agent Loop → AI Provider (Ollama/LMStudio)
↓
SQLite (sessions, messages)

```

### Proveedores de AI Soportados

El sistema soporta múltiples proveedores de AI a través de Vercel AI SDK:

1. **Ollama** (por defecto)
   - Puerto: 11434
   - Endpoint: `http://localhost:11434`
   - Gestión de modelos: CLI (`ollama pull`, `ollama list`)
   - Documentación: [docs/lmstudio-integration.md](docs/lmstudio-integration.md)

2. **LMStudio**
   - Puerto: 1234
   - Endpoint: `http://localhost:1234/v1`
   - Gestión de modelos: UI gráfica
   - Compatible con API de OpenAI
   - Documentación: [docs/lmstudio-integration.md](docs/lmstudio-integration.md)

El servidor detecta automáticamente qué proveedor está disponible y se adapta.Si necesita herramienta:
   - En modo Plan: pide permiso
   - En modo Build: ejecuta con delay
4. Ejecuta herramienta y obtiene resultado
5. Agente analiza resultado y continúa o responde
6. Todos los mensajes se persisten en SQLite

---

## 🎯 Roadmap

### ✅ Completado (Fases 0-5)

- [x] Monorepo con pnpm + Turbo
- [x] Servidor Hono con endpoints de modelos, chat y sesiones
- [x] Base de datos SQLite con Drizzle
- [x] SDK cliente con soporte SSE y resync
- [x] TUI completa con 3 pantallas (Modelos, Chat, Sesiones)
- [x] 6 herramientas del agente con validación de seguridad
- [x] Loop ReAct completo con detección de loops
- [x] Modos plan/build con permisos críticos
- [x] Compactación de contexto
- [x] CLI wrapper con health check y shutdown coordinado
- [x] Logging estructurado con Pino
- [x] Graceful shutdown
- [x] Manejo robusto de errores (Ollama, SSE, tools)
- [x] Recuperación automática de desconexiones SSE
- [x] Optimizaciones de performance (throttling, virtualización, memo)
- [x] Títulos dinámicos de sesiones
- [x] Advertencias para modelos grandes
- [x] Git hooks (commitlint, pre-commit)
- [x] Auditoría de seguridad (10/15 vulnerabilidades corregidas)

### 🔒 Seguridad Implementada

- [x] Validación de paths (anti path-traversal)
- [x] Whitelist de comandos bash
- [x] Protección contra prompt injection
- [x] Redacción de secretos en logs
- [x] Filtrado de variables de entorno
- [x] Protección ReDoS en regex
- [x] Permisos críticos obligatorios
- [x] Detección mejorada de loops
- [x] Timeouts en operaciones de archivos
- [x] Stack traces solo en desarrollo

### 📋 Pendiente

- [ ] Cifrado de base de datos (VULN-008)
- [ ] Rate limiting (VULN-009)
- [ ] Compactación real con LLM (VULN-013)
- [ ] Análisis estático con eslint-plugin-security
- [ ] Métricas de seguridad
- [ ] Documentación de modelos compatibles (MODELS.md)

---

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit tus cambios: `pnpm commit`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

---

## 📄 Licencia

MIT

---

## � Seguridad

Este proyecto implementa múltiples capas de seguridad:

- Validación de paths para prevenir path traversal
- Whitelist de comandos bash permitidos
- Protección contra prompt injection con delimitadores XML
- Redacción automática de secretos en logs
- Protección ReDoS en búsquedas con regex
- Permisos críticos obligatorios (incluso en modo build)
- Timeouts en operaciones de archivos
- Detección mejorada de loops infinitos

Para más detalles, consulta la [auditoría de seguridad](auditoria-seguridad/README.md).

---

## 🙏 Agradecimientos

- [Ollama](https://ollama.ai) - Modelos de lenguaje locales
- [Vercel AI SDK](https://sdk.vercel.ai) - Framework de AI
- [Ink](https://github.com/vadimdemedes/ink) - React para terminal
- [Hono](https://hono.dev) - Framework web ultrarrápido
- [Drizzle](https://orm.drizzle.team) - ORM TypeScript
- [Pino](https://getpino.io) - Logging estructurado
- [Vitest](https://vitest.dev) - Testing framework
- [Turbo](https://turbo.build) - Build system para monorepos

---
```
