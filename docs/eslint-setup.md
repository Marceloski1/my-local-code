# Configuración de ESLint

## Descripción

Este proyecto usa ESLint con TypeScript y React para mantener la calidad del código en todo el monorepo.

## Estructura

```
.
├── eslint.config.js              # Configuración raíz (flat config)
├── .eslintignore                 # Archivos ignorados
├── packages/
│   ├── sdk/eslint.config.js      # Config específica del SDK
│   ├── server/eslint.config.js   # Config específica del servidor
│   └── tui/eslint.config.js      # Config específica de la TUI
└── .vscode/settings.json         # Integración con VSCode
```

## Plugins y Configuraciones

### Instalados

- `eslint` - Linter principal
- `@eslint/js` - Reglas base de JavaScript
- `typescript-eslint` - Soporte para TypeScript
- `eslint-plugin-react` - Reglas para React
- `eslint-plugin-react-hooks` - Reglas para React Hooks
- `eslint-plugin-prettier` - Ejecuta Prettier como regla de ESLint
- `eslint-config-prettier` - Desactiva reglas que conflictúan con Prettier

### Integración con Prettier

ESLint está integrado con Prettier para evitar conflictos:

- Prettier maneja el formato del código (espacios, comillas, etc.)
- ESLint maneja la calidad del código (bugs, patrones, etc.)
- `pnpm lint` también verifica el formato de Prettier
- `pnpm lint:fix` también formatea con Prettier

Para más información sobre Prettier, consulta [prettier-setup.md](prettier-setup.md).

### Reglas Principales

#### TypeScript

- `@typescript-eslint/no-unused-vars`: warn (permite `_` prefix)
- `@typescript-eslint/no-explicit-any`: warn
- `@typescript-eslint/no-floating-promises`: error
- `@typescript-eslint/no-misused-promises`: error

#### React (solo archivos .tsx)

- Reglas recomendadas de React
- Reglas de React Hooks
- `react/prop-types`: off (usamos TypeScript)
- `react/react-in-jsx-scope`: off (nuevo JSX transform)

#### Archivos de Test

- Reglas más relajadas para `any` y unsafe operations
- Permitido en `**/*.test.ts`, `**/*.test.tsx`, `**/__tests__/**`

#### Scripts

- `no-console`: off
- `@typescript-eslint/no-explicit-any`: off

## Comandos

### Ejecutar ESLint en todo el monorepo

```bash
pnpm lint
```

### Ejecutar ESLint con auto-fix

```bash
pnpm lint:fix
```

### Ejecutar ESLint en un package específico

```bash
pnpm --filter @agent/sdk lint
pnpm --filter @agent/server lint
pnpm --filter @agent/tui lint
```

### Ejecutar ESLint con auto-fix en un package

```bash
pnpm --filter @agent/sdk lint:fix
pnpm --filter @agent/server lint:fix
pnpm --filter @agent/tui lint:fix
```

## Integración con VSCode

La configuración en `.vscode/settings.json` habilita:

1. **Auto-fix al guardar**: Los errores de ESLint se corrigen automáticamente
2. **Validación en tiempo real**: ESLint se ejecuta mientras escribes
3. **Working directories**: ESLint detecta automáticamente el contexto del monorepo

## Configuraciones Específicas por Package

### SDK (`packages/sdk`)

- `no-console`: warn (evitar console.log en librerías)

### Server (`packages/server`)

- `no-console`: off (console permitido en servidor)

### TUI (`packages/tui`)

- `no-console`: off (console permitido para debugging)
- `react/no-unescaped-entities`: off (permite comillas en texto)

## Archivos Ignorados

- `node_modules/`
- `dist/`
- `build/`
- `.turbo/`
- `coverage/`
- `drizzle/`
- `data/`
- `*.config.js`
- `*.config.ts`

## Errores Comunes y Soluciones

### 1. `@typescript-eslint/no-unsafe-assignment`

**Problema**: Asignación de valor `any` sin tipo específico

**Solución**:

```typescript
// ❌ Mal
const data = await res.json();

// ✅ Bien
const data: MyType = await res.json();
// o
const data = (await res.json()) as MyType;
```

### 2. `@typescript-eslint/no-floating-promises`

**Problema**: Promise sin await o .catch()

**Solución**:

```typescript
// ❌ Mal
someAsyncFunction();

// ✅ Bien
await someAsyncFunction();
// o
void someAsyncFunction();
// o
someAsyncFunction().catch(console.error);
```

### 3. `@typescript-eslint/no-explicit-any`

**Problema**: Uso de tipo `any`

**Solución**:

```typescript
// ❌ Mal
function process(data: any) {}

// ✅ Bien
function process(data: unknown) {}
// o
function process<T>(data: T) {}
```

### 4. `@typescript-eslint/require-await`

**Problema**: Función async sin await

**Solución**:

```typescript
// ❌ Mal
async json() { return { data: 'test' }; }

// ✅ Bien
json() { return { data: 'test' }; }
// o si realmente necesitas async
async json() { return await Promise.resolve({ data: 'test' }); }
```

## Desactivar Reglas Temporalmente

### En una línea específica

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = someValue;
```

### En un bloque

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
const data1: any = value1;
const data2: any = value2;
/* eslint-enable @typescript-eslint/no-explicit-any */
```

### En todo el archivo

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
// ... resto del archivo
```

## CI/CD Integration

Para integrar ESLint en CI/CD, agregar en el pipeline:

```yaml
- name: Lint
  run: pnpm lint
```

Esto fallará el build si hay errores de ESLint.

## Próximos Pasos

1. Corregir errores existentes en el código
2. Agregar pre-commit hook con Husky para ejecutar ESLint
3. Configurar reglas más estrictas gradualmente
4. Agregar plugins adicionales según necesidad (import, etc.)

## Referencias

- [ESLint Docs](https://eslint.org/docs/latest/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [ESLint Plugin React](https://github.com/jsx-eslint/eslint-plugin-react)
- [Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files)
