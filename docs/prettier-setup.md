# Configuración de Prettier

## Descripción

Prettier es un formateador de código automático que mantiene un estilo consistente en todo el proyecto. Está integrado con ESLint para evitar conflictos.

## Configuración

### Archivo `.prettierrc`

```json
{
  "semi": true, // Punto y coma al final
  "trailingComma": "es5", // Comas finales donde ES5 lo permite
  "singleQuote": true, // Comillas simples en lugar de dobles
  "printWidth": 100, // Ancho máximo de línea
  "tabWidth": 2, // 2 espacios por indentación
  "useTabs": false, // Usar espacios, no tabs
  "arrowParens": "avoid", // Evitar paréntesis en arrow functions con un parámetro
  "endOfLine": "lf", // Line endings Unix (LF)
  "bracketSpacing": true, // Espacios en objetos: { foo: bar }
  "bracketSameLine": false, // > en nueva línea en JSX
  "proseWrap": "preserve" // No formatear markdown
}
```

### Archivos Ignorados (`.prettierignore`)

- `node_modules/`
- `dist/`
- `build/`
- `.turbo/`
- `coverage/`
- `drizzle/`
- `data/`
- `*.db`
- `*.log`
- `pnpm-lock.yaml`
- `package-lock.json`

## Comandos

### Formatear todo el proyecto

```bash
pnpm format
```

### Verificar formato sin modificar

```bash
pnpm format:check
```

### Formatear un package específico

```bash
pnpm --filter @agent/sdk format
pnpm --filter @agent/server format
pnpm --filter @agent/tui format
```

### Formatear archivos específicos

```bash
# Un archivo
prettier --write src/index.ts

# Múltiples archivos
prettier --write "src/**/*.ts"

# Solo verificar
prettier --check "src/**/*.ts"
```

## Integración con VSCode

La configuración en `.vscode/settings.json` habilita:

1. **Format on Save**: El código se formatea automáticamente al guardar
2. **Prettier como formateador por defecto**: Para TS, TSX, JS, JSON, MD
3. **Integración con ESLint**: Prettier se ejecuta después de ESLint

### Extensión Requerida

Instala la extensión de VSCode:

- **Prettier - Code formatter** (`esbenp.prettier-vscode`)

## Integración con ESLint

Prettier está integrado con ESLint mediante:

1. **eslint-config-prettier**: Desactiva reglas de ESLint que conflictúan con Prettier
2. **eslint-plugin-prettier**: Ejecuta Prettier como regla de ESLint

Esto significa que:

- `pnpm lint` también verifica el formato de Prettier
- `pnpm lint:fix` también formatea con Prettier
- No hay conflictos entre ESLint y Prettier

## Workflow Recomendado

### Durante el desarrollo

1. Escribe código normalmente
2. Al guardar, VSCode formatea automáticamente con Prettier
3. ESLint muestra errores en tiempo real

### Antes de commit

El hook de pre-commit ejecuta automáticamente:

```bash
pnpm format  # Formatea todo
pnpm lint    # Verifica errores
```

### En CI/CD

```bash
pnpm format:check  # Verifica que el código está formateado
pnpm lint          # Verifica errores de ESLint
pnpm typecheck     # Verifica tipos TypeScript
pnpm test          # Ejecuta tests
```

## Ejemplos de Formato

### Antes de Prettier

```typescript
const foo = { bar: 1, baz: 2 };
function test(x, y) {
  return x + y;
}
const arrow = a => a * 2;
```

### Después de Prettier

```typescript
const foo = { bar: 1, baz: 2 };
function test(x, y) {
  return x + y;
}
const arrow = a => a * 2;
```

## Configuración por Tipo de Archivo

### TypeScript/JavaScript

- Comillas simples
- Punto y coma
- 2 espacios de indentación
- Ancho máximo 100 caracteres

### JSON

- Comillas dobles (estándar JSON)
- 2 espacios de indentación

### Markdown

- Preserva el formato original
- No modifica el wrapping de líneas

## Desactivar Prettier Temporalmente

### En un archivo completo

```typescript
// prettier-ignore-file
```

### En un bloque de código

```typescript
// prettier-ignore
const matrix = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1]
];
```

### En una línea

```typescript
const ugly = { a:1,b:2,c:3 }; // prettier-ignore
```

## Solución de Problemas

### Prettier no formatea al guardar

1. Verifica que la extensión está instalada
2. Verifica que `editor.formatOnSave` está en `true`
3. Verifica que `editor.defaultFormatter` es `esbenp.prettier-vscode`
4. Reinicia VSCode

### Conflictos entre ESLint y Prettier

Si ves errores de ESLint sobre formato:

1. Verifica que `eslint-config-prettier` está instalado
2. Verifica que está al final de `eslint.config.js`
3. Ejecuta `pnpm format` para formatear todo

### Prettier ignora algunos archivos

Verifica que el archivo no está en `.prettierignore` o `.gitignore`

## Comandos Útiles

```bash
# Formatear y ver qué archivos cambiaron
pnpm format

# Solo verificar sin modificar
pnpm format:check

# Formatear archivos específicos
prettier --write "packages/sdk/src/**/*.ts"

# Ver qué archivos necesitan formato
prettier --check "**/*.ts"

# Formatear con configuración específica
prettier --write --single-quote false src/index.ts
```

## Mejores Prácticas

1. **Siempre formatea antes de commit**: El hook lo hace automáticamente
2. **No modifiques `.prettierrc` sin consenso**: Afecta a todo el equipo
3. **Usa `prettier-ignore` con moderación**: Solo cuando realmente necesites formato específico
4. **Confía en Prettier**: No pierdas tiempo formateando manualmente
5. **Integra en CI/CD**: Verifica formato en el pipeline

## Referencias

- [Prettier Docs](https://prettier.io/docs/en/)
- [Prettier Options](https://prettier.io/docs/en/options.html)
- [Prettier + ESLint](https://prettier.io/docs/en/integrating-with-linters.html)
- [VSCode Extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
