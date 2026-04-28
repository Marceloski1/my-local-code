# Plan de Commits (Fases 0 - 2)

Este plan está diseñado para ser ejecutado por una IA. Cada paso debe ser un commit independiente siguiendo el formato de **Conventional Commits**.

## Instrucciones para la IA Ejecutora

1. Ejecuta cada bloque de comandos en orden.
2. Asegúrate de que el mensaje de commit sea exacto.
3. Si un archivo no existe, sáltalo (pero deberían estar todos).

---

### Fase 0: Scaffold y Estructura Base

#### Commit 1: Configuración Raíz

**Mensaje:** `chore(root): inicializar monorepo con pnpm y turbo`

```bash
git add package.json pnpm-workspace.yaml turbo.json tsconfig.base.json .gitignore .nvmrc
git commit -m "chore(root): inicializar monorepo con pnpm y turbo"
```

#### Commit 2: Documentación de Planificación

**Mensaje:** `docs(planing): añadir documentos de arquitectura y fases`

```bash
git add planing/*.md
git commit -m "docs(planing): añadir documentos de arquitectura y fases"
```

#### Commit 3: Paquete @agent/shared

**Mensaje:** `feat(shared): definir esquemas zod para mensajes y constantes`

```bash
git add packages/shared/package.json packages/shared/tsconfig.json packages/shared/src/index.ts
git commit -m "feat(shared): definir esquemas zod para mensajes y constantes"
```

#### Commit 4: Estructura de Paquetes

**Mensaje:** `chore(packages): crear esqueletos de server, sdk y tui`

```bash
git add packages/server/package.json packages/server/tsconfig.json
git add packages/sdk/package.json packages/sdk/tsconfig.json
git add packages/tui/package.json packages/tui/tsconfig.json
git commit -m "chore(packages): crear esqueletos de server, sdk y tui"
```

#### Commit 5: Directorios Auxiliares

**Mensaje:** `chore: añadir scripts y configuración inicial de Go`

```bash
git add scripts/ cmd/
git commit -m "chore: añadir scripts y configuración inicial de Go"
```

---

### Fase 1: Servidor, DB e Integración AI

#### Commit 6: Base de Datos

**Mensaje:** `feat(server): configurar drizzle orm con sqlite y esquema inicial`

```bash
git add packages/server/src/db/
git commit -m "feat(server): configurar drizzle orm con sqlite y esquema inicial"
```

#### Commit 7: Proveedores de IA

**Mensaje:** `feat(server): integrar vercel ai sdk y gestión de modelos ollama`

```bash
git add packages/server/src/ai/
git commit -m "feat(server): integrar vercel ai sdk y gestión de modelos ollama"
```

#### Commit 8: Comunicación SSE

**Mensaje:** `feat(server): implementar middleware de sse con sequence numbers`

```bash
git add packages/server/src/middleware/sse.ts
git commit -m "feat(server): implementar middleware de sse con sequence numbers"
```

#### Commit 9: Endpoints de Modelos

**Mensaje:** `feat(server): añadir rutas para gestión de modelos y health check`

```bash
git add packages/server/src/api/models.ts packages/server/src/index.ts
git commit -m "feat(server): añadir rutas para gestión de modelos y health check"
```

#### Commit 10: Pruebas de Servidor

**Mensaje:** `test(server): añadir tests unitarios para servidor y sse`

```bash
git add packages/server/src/__tests__/
git commit -m "test(server): añadir tests unitarios para servidor y sse"
```

---

### Fase 2: SDK y TUI (Modelos)

#### Commit 11: Implementación del SDK

**Mensaje:** `feat(sdk): crear cliente agent-client con soporte para sse`

```bash
git add packages/sdk/src/
git commit -m "feat(sdk): crear cliente agent-client con soporte para sse"
```

#### Commit 12: Estado Global TUI

**Mensaje:** `feat(tui): configurar zustand para gestión de estado de la terminal`

```bash
git add packages/tui/src/store/
git commit -m "feat(tui): configurar zustand para gestión de estado de la terminal"
```

#### Commit 13: Componentes Visuales Core

**Mensaje:** `feat(tui): implementar header y tabbar reactivos con ink`

```bash
git add packages/tui/src/components/Header.tsx packages/tui/src/components/TabBar.tsx
git commit -m "feat(tui): implementar header y tabbar reactivos con ink"
```

#### Commit 14: Pantalla de Modelos

**Mensaje:** `feat(tui): implementar pantalla de modelos con barra de progreso y selección`

```bash
git add packages/tui/src/screens/Models.tsx packages/tui/src/hooks/useModels.ts
git commit -m "feat(tui): implementar pantalla de modelos con barra de progreso y selección"
```

#### Commit 15: App e Inicialización

**Mensaje:** `feat(tui): integrar componentes en app principal, chat funcional y punto de entrada`

```bash
git add packages/tui/src/App.tsx packages/tui/src/index.tsx packages/tui/src/screens/Chat.tsx
git commit -m "feat(tui): integrar componentes en app principal, chat funcional y punto de entrada"
```

#### Commit 16: Setup de Pruebas TUI

**Mensaje:** `test(tui): configurar entorno de pruebas unitarias y de componentes`

```bash
git add packages/tui/vitest.config.ts packages/tui/src/__tests__/
git commit -m "test(tui): configurar entorno de pruebas unitarias y de componentes"
```

---

### Husky y Finalización

#### Commit 17: Husky y Commitizen

**Mensaje:** `chore: configurar husky, commitizen y commitlint para el monorepo`

```bash
git add package.json .husky/ commitlint.config.js commit-plan.md
git commit -m "chore: configurar husky, commitizen y commitlint para el monorepo"
```
