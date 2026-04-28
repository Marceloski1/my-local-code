# Resumen de Errores de Linting

## Estado Actual

Después de ejecutar `pnpm lint`, se encontraron **25 problemas** en el SDK:

- **20 errores** (requieren corrección manual)
- **5 warnings** (pueden ignorarse temporalmente)

## Errores por Archivo

### 1. `packages/sdk/src/__tests__/unit/agent-client.test.ts` (5 errores)

**Problema**: Funciones `async` sin `await`

```typescript
// ❌ Mal
json: async () => ({ models: mockModels });

// ✅ Bien - Opción 1: Remover async
json: () => ({ models: mockModels });

// ✅ Bien - Opción 2: Usar Promise.resolve
json: async () => Promise.resolve({ models: mockModels });
```

**Líneas afectadas**: 11, 19, 30, 87, 97

### 2. `packages/sdk/src/client.ts` (19 problemas)

#### A. Unsafe operations con `any` (15 errores)

**Problema**: Uso de `res.json()` sin tipo específico

```typescript
// ❌ Mal
const data = await res.json();
return data.models;

// ✅ Bien
interface ModelsResponse {
  models: OllamaModelInfo[];
}
const data = (await res.json()) as ModelsResponse;
return data.models;
```

**Solución recomendada**: Crear interfaces para todas las respuestas

```typescript
// Agregar al inicio del archivo
interface ModelsResponse {
  models: OllamaModelInfo[];
}

interface ActiveModelResponse {
  model: string | null;
}

interface SessionsResponse {
  sessions: Array<{
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

interface SessionDetailResponse {
  session: {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  };
  messages: Array<any>;
  metadata: Array<any>;
}

interface ErrorResponse {
  error: string;
}
```

**Líneas afectadas**: 30, 31 (x2), 52, 53 (x2), 75, 83, 84 (x2), 97, 121, 122 (x2), 143

#### B. Uso explícito de `any` (4 warnings)

**Problema**: Tipos `any` en parámetros

```typescript
// ❌ Mal
messages: Array<any>;

// ✅ Bien
interface Message {
  id: string;
  role: string;
  content: string;
  // ... otros campos
}
messages: Array<Message>;
```

**Líneas afectadas**: 89, 90, 114, 125

### 3. `packages/sdk/src/sse.ts` (1 warning)

**Problema**: `console.error` en código de librería

```typescript
// ❌ Mal
console.error('SSE parse error:', error);

// ✅ Bien - Opción 1: Lanzar error
throw new Error(`SSE parse error: ${error}`);

// ✅ Bien - Opción 2: Callback de error
if (onError) onError(error);

// ✅ Bien - Opción 3: Ignorar (agregar comentario)
// eslint-disable-next-line no-console
console.error('SSE parse error:', error);
```

**Línea afectada**: 21

## Plan de Corrección

### Prioridad Alta (Errores)

1. **Crear interfaces de respuesta** en `client.ts`
2. **Tipar todas las llamadas a `res.json()`**
3. **Remover `async` innecesarios** en tests

### Prioridad Media (Warnings)

4. **Reemplazar `any` con tipos específicos**
5. **Manejar `console.error`** en `sse.ts`

## Comandos para Verificar

```bash
# Ver errores específicos del SDK
pnpm --filter @agent/sdk lint

# Intentar auto-fix (corrige formato, no tipos)
pnpm --filter @agent/sdk lint:fix

# Verificar después de correcciones
pnpm lint
```

## Alternativa Temporal

Si necesitas que el linting pase temporalmente, puedes:

1. **Desactivar reglas estrictas en tests**:

```typescript
// En packages/sdk/eslint.config.js
{
  files: ['**/*.test.ts'],
  rules: {
    '@typescript-eslint/require-await': 'off',
  },
}
```

2. **Permitir `any` en el SDK temporalmente**:

```typescript
// En packages/sdk/eslint.config.js
{
  files: ['src/**/*.ts'],
  rules: {
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-argument': 'warn',
  },
}
```

## Próximos Pasos

1. Corregir errores del SDK (prioridad alta)
2. Verificar otros packages (server, tui)
3. Agregar pre-commit hook que bloquee commits con errores
4. Configurar CI/CD para fallar en errores de lint

## Notas

- Los errores de formato (Prettier) ya fueron corregidos automáticamente
- Los errores restantes son de type safety (TypeScript)
- Estos errores ayudan a prevenir bugs en runtime
- Vale la pena corregirlos antes de continuar con desarrollo
