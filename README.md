# Agent - Local Code Assistant

Un asistente de código local que usa Ollama para ejecutar modelos de lenguaje con capacidad de usar herramientas (tool calling).

## 🚀 Quick Start

### Prerrequisitos

1. **Node.js 20+** (verifica con `node --version`)
2. **pnpm** (instala con `npm install -g pnpm`)
3. **Ollama** instalado y corriendo ([ollama.ai](https://ollama.ai))

### Instalación

```bash
# Clonar el repositorio
git clone <repo-url>
cd local-code

# Instalar dependencias
pnpm install

# Descargar un modelo de Ollama
ollama pull gemma3:1b
# o
ollama pull llama3:8b
```

### Iniciar la Aplicación

```bash
# Opción 1: Iniciar todo con un comando (Recomendado)
pnpm dev

# Opción 2: Iniciar servidor y TUI por separado
# Terminal 1:
pnpm --filter @agent/server dev

# Terminal 2:
pnpm --filter @agent/tui dev
```

### Uso

1. **Pantalla de Modelos** (Tab 1):
   - Selecciona un modelo con las flechas ↑↓
   - Presiona Enter para activarlo
   - Verifica que aparece ★ junto al modelo activo

2. **Pantalla de Chat** (Tab 2):
   - Escribe tu pregunta o comando
   - El agente puede usar herramientas:
     - `read_file` - Leer archivos
     - `write_file` - Crear/modificar archivos
     - `edit_file` - Editar archivos existentes
     - `bash` - Ejecutar comandos
     - `list_files` - Listar directorios
     - `search_files` - Buscar en archivos

3. **Pantalla de Sesiones** (Tab 3):
   - Ver historial de conversaciones
   - Continuar sesiones anteriores
   - Eliminar sesiones

### Modos de Operación

- **Plan Mode** (default): El agente pide permiso antes de ejecutar comandos destructivos
- **Build Mode**: El agente ejecuta comandos automáticamente con un delay de 500ms

Cambia entre modos con `Ctrl+M` (próximamente).

---

## 📁 Estructura del Proyecto

```
local-code/
├── packages/
│   ├── server/      # API REST + Agent Loop
│   ├── sdk/         # Cliente TypeScript
│   ├── tui/         # Terminal UI (Ink)
│   └── shared/      # Tipos y constantes compartidas
├── scripts/         # Scripts de validación
├── docs/            # Documentación de fases
└── cmd/             # Binarios Go (futuro)
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

# Con coverage
pnpm test:coverage
```

### Scripts de Validación

```bash
cd scripts

# Verificar soporte de colores ANSI
pnpm test:ansi

# Validar lógica de compactación de contexto
pnpm test:compaction

# Probar compatibilidad de modelos con tool calling
pnpm test:models
```

---

## 🔧 Desarrollo

### Compilar

```bash
# Compilar todos los paquetes
pnpm build

# Compilar un paquete específico
pnpm --filter @agent/server build
```

### Linting y Type Checking

```bash
# Lint
pnpm lint

# Type checking
pnpm typecheck
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

- [Fase 0](docs/fase-0.md) - Scaffold del monorepo
- [Fase 1](docs/fase-1.md) - Servidor base + DB + Vercel AI SDK
- [Fase 2](docs/fase-2.md) - SDK + TUI shell + Pantalla de Modelos
- [Fase 3](docs/fase-3.md) - Tools del agente + Loop ReAct
- [Fase 4](docs/fase-4.md) - Endpoints de Chat/Sesiones + TUI completa
- [Troubleshooting](docs/troubleshooting.md) - Solución de problemas comunes

### Test Specs

- [Setup](docs/test-spec/setup.md) - Configuración de testing
- [Fase 1](docs/test-spec/fase-1.test-spec.md) - 33 tests
- [Fase 2](docs/test-spec/fase-2.test-spec.md) - 52 tests
- [Fase 3](docs/test-spec/fase-3.test-spec.md) - 128 tests
- [Fase 4](docs/test-spec/fase-4.test-spec.md) - 127 tests

**Total**: 340 tests especificados

---

## 🐛 Troubleshooting

### Error: "fetch failed" en la TUI

**Causa**: El servidor no está corriendo.

**Solución**: Usa `pnpm dev` desde la raíz, o inicia el servidor manualmente:

```bash
pnpm --filter @agent/server dev
```

### Error: "Ollama no está disponible"

**Causa**: Ollama no está corriendo.

**Solución**:

```bash
# Iniciar Ollama
ollama serve

# Verificar que está corriendo
curl http://localhost:11434/api/tags
```

### Error: "No active model configured"

**Causa**: No has seleccionado un modelo activo.

**Solución**: Ve a la pantalla de Modelos (Tab 1) y selecciona un modelo con Enter.

Para más problemas, consulta [docs/troubleshooting.md](docs/troubleshooting.md).

---

## 🏗️ Arquitectura

### Stack Tecnológico

- **Backend**: Hono + Drizzle ORM + SQLite
- **AI**: Vercel AI SDK + Ollama
- **Frontend**: Ink (React para terminal)
- **Monorepo**: pnpm workspaces + Turbo
- **Linting**: ESLint + TypeScript ESLint + React plugins
- **Formatting**: Prettier (integrado con ESLint)

### Comandos de Desarrollo

```bash
# Desarrollo
pnpm dev                    # Iniciar todo (servidor + TUI)
pnpm build                  # Compilar todos los packages
pnpm test                   # Ejecutar tests
pnpm typecheck              # Verificar tipos TypeScript

# Linting y Formato
pnpm lint                   # Ejecutar ESLint en todo el monorepo
pnpm lint:fix               # Auto-fix de errores de ESLint
pnpm format                 # Formatear código con Prettier
pnpm format:check           # Verificar formato sin modificar

# Por package
pnpm --filter @agent/sdk lint
pnpm --filter @agent/server format
pnpm --filter @agent/tui lint:fix
```

Para más información:

- ESLint: [docs/eslint-setup.md](docs/eslint-setup.md)
- Prettier: [docs/prettier-setup.md](docs/prettier-setup.md)
- **Testing**: Vitest
- **Language**: TypeScript

### Flujo de Datos

```
TUI (Ink) → SDK Client → Server API → Agent Loop → Ollama
                                    ↓
                                SQLite (sessions, messages)
```

### Agent Loop (ReAct)

1. Usuario envía mensaje
2. Agente analiza y decide si necesita herramientas
3. Si necesita herramienta:
   - En modo Plan: pide permiso
   - En modo Build: ejecuta con delay
4. Ejecuta herramienta y obtiene resultado
5. Agente analiza resultado y continúa o responde
6. Todos los mensajes se persisten en SQLite

---

## 🎯 Roadmap

### ✅ Completado (Fases 0-3)

- [x] Monorepo con pnpm + Turbo
- [x] Servidor Hono con endpoints de modelos
- [x] Base de datos SQLite con Drizzle
- [x] SDK cliente con soporte SSE
- [x] TUI con Ink (pantalla de Modelos)
- [x] 6 herramientas del agente
- [x] Loop ReAct completo
- [x] Modos plan/build
- [x] Compactación de contexto
- [x] Detección de loops

### 🚧 En Progreso (Fase 4)

- [x] Endpoints de sesiones y chat
- [x] Persistencia de mensajes
- [ ] Pantalla de Chat funcional
- [ ] Pantalla de Sesiones
- [ ] Resync después de desconexión
- [ ] Throttle de tokens (50ms)
- [ ] Dialog de permisos

### 📋 Futuro (Fase 5)

- [ ] Manejo robusto de errores
- [ ] Graceful shutdown
- [ ] CLI wrapper
- [ ] Logging estructurado
- [ ] Validación cross-platform completa
- [ ] Binarios Go (opcional)

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

## 🙏 Agradecimientos

- [Ollama](https://ollama.ai) - Modelos de lenguaje locales
- [Vercel AI SDK](https://sdk.vercel.ai) - Framework de AI
- [Ink](https://github.com/vadimdemedes/ink) - React para terminal
- [Hono](https://hono.dev) - Framework web ultrarrápido
- [Drizzle](https://orm.drizzle.team) - ORM TypeScript

---
