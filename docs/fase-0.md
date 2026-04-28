# Fase 0 — Scaffold del monorepo

## Resumen de lo realizado

En la **Fase 0** se sentaron las bases del monorepo (Turborepo + pnpm) y se configuró la infraestructura principal para alojar los paquetes (`packages/*`). Se verificó que todas las dependencias compartidas se instalaran y compilaran exitosamente con el sistema de workspaces.

### Tareas Completadas:

1. **Configuración Raíz:**
   - Creación de `package.json` con `pnpm@10.30.0` como manejador de paquetes y el `name: agent-monorepo`.
   - Inclusión de las dependencias base de `turbo` y `typescript`.
   - Definición del archivo `pnpm-workspace.yaml` apuntando a la carpeta de `packages/*`.
   - Creación del archivo `turbo.json` (usando el formato V2 de Turborepo con `tasks`).
   - Archivos generales como `.gitignore`, `.nvmrc` (`Node v20`) y un `tsconfig.base.json` con soporte para composite routing de TypeScript (`NodeNext` y ES2022).

2. **Creación del paquete de Contratos (Shared):**
   - Se creó `packages/shared`, de acuerdo a las últimas decisiones técnicas.
   - Cuenta con su `package.json`, `tsconfig.json` y el punto de entrada `src/index.ts`.
   - Implementa schemas de **Zod** para la comunicación (`MessageSchema`, Roles, Modes) y constantes globales (valores por defecto como los timeouts o `context_compaction_threshold`).

3. **Esqueletos de los demás paquetes:**
   - Se inicializaron los package.json y tsconfigs de `packages/server`, `packages/sdk`, y `packages/tui`.
   - Se dejaron en ellos archivos _stub_ (`index.ts`) junto con las referencias (paths) cruzadas (p. ej. el sdk, server y tui todos dependen de `workspace:*` para `@agent/shared`).

4. **Carpetas auxiliares:**
   - Creación de la carpeta para binarios de Go (`cmd/go.mod`).
   - Creación de la carpeta de `scripts/` para alojar los scripts de validación.

5. **Validación:**
   - Se ejecutó `pnpm install`, resolviendo el entorno de workspaces sin problemas.
   - Se ejecutó repetidamente la validación y corrección de la compilación de TypeScript a lo largo de los paquetes hasta que el comando `pnpm build` (`turbo build`) y la comprobación de TS fueron `success` para los 4 paquetes de forma aislada e interdependiente.
