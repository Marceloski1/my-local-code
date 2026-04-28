# Configuración Base del Framework de Testing

## Framework Recomendado

**Vitest** — compatible con ESM nativo, TypeScript sin transpilación extra, y monorepos con workspaces.

## Instalación

```bash
# Desde la raíz del monorepo
pnpm add -D vitest @vitest/coverage-v8 -w

# En packages/server (tests de integración con DB)
pnpm add -D vitest --filter @agent/server

# En packages/sdk
pnpm add -D vitest --filter @agent/sdk

# En packages/tui (tests de componentes React/Ink)
pnpm add -D vitest ink-testing-library @testing-library/react --filter @agent/tui
```

## Configuración por Paquete

Cada paquete tiene su propio `vitest.config.ts`:

```typescript
// packages/server/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
```

```typescript
// packages/sdk/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

```typescript
// packages/tui/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

## Script en `turbo.json`

Agregar la tarea `test` al `turbo.json` raíz:

```json
{
  "tasks": {
    "test": {
      "dependsOn": ["build"],
      "inputs": ["src/**/*.ts", "src/**/*.tsx"],
      "outputs": ["coverage/**"]
    }
  }
}
```

Y en cada `package.json` de paquete:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## Mocks Compartidos

### Mock de `fetch` (usado en servidor y SDK)

Archivo: `packages/server/src/__tests__/mocks/fetch.ts`

```typescript
import { vi } from 'vitest';

export function mockFetch(
  responses: Array<{ ok: boolean; status?: number; json?: any; body?: ReadableStream }>
) {
  let callIndex = 0;
  return vi.fn(async () => {
    const res = responses[callIndex++] || responses[responses.length - 1];
    return {
      ok: res.ok,
      status: res.status ?? (res.ok ? 200 : 500),
      statusText: res.ok ? 'OK' : 'Internal Server Error',
      json: async () => res.json,
      body: res.body ?? null,
      headers: new Headers(),
    } as unknown as Response;
  });
}
```

### Mock de la Base de Datos (in-memory SQLite para tests)

Archivo: `packages/server/src/__tests__/setup.ts`

```typescript
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../db/schema.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Crea una instancia de DB in-memory para cada suite de tests.
 * Aplica migraciones automáticamente.
 */
export function createTestDb() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.resolve(__dirname, '../../drizzle') });
  return { db, sqlite };
}
```

### Mock de SSE Stream (para SDK)

Archivo: `packages/sdk/src/__tests__/mocks/sse-stream.ts`

```typescript
/**
 * Crea un ReadableStream que simula un flujo SSE del servidor.
 * @param events - Array de objetos que serán enviados como eventos SSE
 */
export function createMockSSEStream(events: Array<{ sequence: number; type: string; data: any }>) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const event of events) {
        const payload = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      }
      controller.close();
    },
  });
}
```

---

## Convenciones de Nombres

| Tipo de test             | Ubicación                                    | Sufijo      |
| ------------------------ | -------------------------------------------- | ----------- |
| Test unitario            | `src/__tests__/unit/<modulo>.test.ts`        | `.test.ts`  |
| Test de integración      | `src/__tests__/integration/<modulo>.test.ts` | `.test.ts`  |
| Test de componente (Ink) | `src/__tests__/components/<Comp>.test.tsx`   | `.test.tsx` |

## Ejecución Global

```bash
# Todos los tests desde la raíz
pnpm test

# Solo un paquete
pnpm test --filter @agent/server

# Con coverage
pnpm test:coverage
```
