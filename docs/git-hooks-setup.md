# Git Hooks Setup - Husky + Commitlint + CSpell

## Resumen

Sistema completo de validación de commits con hooks de git mejorados que incluyen:

- Formateo automático con Prettier
- Type checking con TypeScript
- Linting con ESLint (con auto-fix)
- Spell checking con CSpell
- Validación de mensajes de commit con Commitlint
- Validación de idioma (solo inglés)

## Archivos de Configuración

### 1. `.husky/pre-commit`

Hook que se ejecuta antes de cada commit. Realiza las siguientes validaciones:

```bash
✅ Formateo de código (Prettier)
✅ Type checking (TypeScript)
✅ Linting (ESLint con auto-fix)
⚠️  Spell checking (warning, no bloquea)
✅ Re-staging de archivos formateados
```

**Características:**

- Mensajes con colores y emojis para mejor UX
- Auto-fix de errores de linting cuando es posible
- Spell check no bloquea el commit (solo advierte)
- Feedback claro de cada paso

### 2. `.husky/commit-msg`

Hook que valida el mensaje de commit. Realiza las siguientes validaciones:

```bash
✅ Validación de idioma (solo inglés)
✅ Spell checking del mensaje
✅ Formato Conventional Commits
```

**Validaciones:**

- **Idioma**: Rechaza caracteres no ingleses (á, é, í, ó, ú, ñ, ¿, ¡, etc.)
- **Spelling**: Valida ortografía usando diccionario técnico
- **Formato**: Valida estructura `<type>(<scope>): <subject>`

### 3. `cspell.config.json`

Configuración de CSpell con diccionario técnico personalizado.

**Incluye términos de:**

- Nombres de proyecto (LocalCode, Ollama)
- Herramientas (pnpm, turbo, vitest, drizzle)
- Tecnologías (typescript, react, node)
- Modelos de IA (llama, mistral, qwen, deepseek)
- Términos técnicos comunes

**Ignora:**

- node_modules, dist, build
- Archivos de lock
- Hashes de git
- URLs
- Tokens largos

## Scripts de Package.json

```json
{
  "spell-check": "Verifica ortografía en todo el código",
  "spell-check:commit": "Verifica ortografía en mensajes de commit",
  "lint:fix": "Ejecuta linting con auto-fix",
  "typecheck": "Verifica tipos de TypeScript",
  "format": "Formatea código con Prettier",
  "commit": "Asistente interactivo para commits (Commitizen)"
}
```

## Uso

### Commit Normal

```bash
git add .
git commit -m "feat(tui): add new feature"
```

El hook pre-commit se ejecutará automáticamente:

1. Formateará el código
2. Verificará tipos
3. Ejecutará linting
4. Verificará ortografía
5. Re-agregará archivos modificados

El hook commit-msg validará:

1. Que el mensaje esté en inglés
2. Que no tenga errores de ortografía
3. Que siga el formato Conventional Commits

### Commit Interactivo (Recomendado)

```bash
pnpm commit
```

Usa Commitizen para guiarte en la creación del commit con el formato correcto.

### Saltear Hooks (Solo en Emergencias)

```bash
git commit --no-verify -m "mensaje"
```

⚠️ **No recomendado**: Solo usar en casos excepcionales.

## Tipos de Commit (Conventional Commits)

| Tipo       | Descripción              | Ejemplo                            |
| ---------- | ------------------------ | ---------------------------------- |
| `feat`     | Nueva funcionalidad      | `feat(tui): add color theme`       |
| `fix`      | Corrección de bug        | `fix(server): resolve memory leak` |
| `docs`     | Cambios en documentación | `docs: update README`              |
| `style`    | Cambios de formato       | `style: fix indentation`           |
| `refactor` | Refactorización          | `refactor(sdk): simplify client`   |
| `perf`     | Mejora de performance    | `perf(db): optimize queries`       |
| `test`     | Agregar/modificar tests  | `test(sdk): add unit tests`        |
| `chore`    | Tareas de mantenimiento  | `chore: update dependencies`       |
| `ci`       | Cambios en CI/CD         | `ci: add github actions`           |
| `build`    | Cambios en build         | `build: update webpack config`     |
| `revert`   | Revertir commit anterior | `revert: feat(tui): add theme`     |

### Scopes Comunes

- `tui` - Terminal UI
- `server` - Backend server
- `sdk` - SDK cliente
- `shared` - Código compartido
- `db` - Base de datos
- `agent` - Lógica del agente
- `tools` - Herramientas del agente
- `deps` - Dependencias

## Agregar Palabras al Diccionario

Si CSpell marca una palabra técnica válida como error:

1. Abre `cspell.config.json`
2. Agrega la palabra al array `words`
3. Ordena alfabéticamente (opcional pero recomendado)

```json
{
  "words": ["mynewtechterm", "anothertechword"]
}
```

## Mensajes de Error Comunes

### "Commit message must be in English only"

**Causa**: El mensaje contiene caracteres no ingleses (á, é, ñ, etc.)

**Solución**: Reescribe el mensaje en inglés

```bash
# ❌ Mal
git commit -m "feat: añadir función"

# ✅ Bien
git commit -m "feat: add function"
```

### "Spelling errors found in commit message"

**Causa**: Palabra no reconocida en el diccionario

**Solución**:

1. Corrige el error de ortografía, o
2. Agrega la palabra técnica a `cspell.config.json`

### "Commit message format is invalid"

**Causa**: No sigue el formato Conventional Commits

**Solución**: Usa el formato correcto

```bash
# ❌ Mal
git commit -m "added new feature"

# ✅ Bien
git commit -m "feat: add new feature"
git commit -m "feat(tui): add new feature"
```

### "Type checking failed"

**Causa**: Errores de TypeScript en el código

**Solución**: Corrige los errores de tipos antes de commitear

```bash
pnpm typecheck  # Ver errores
```

### "Linting failed"

**Causa**: Errores de ESLint que no se pueden auto-fixear

**Solución**: Corrige los errores manualmente

```bash
pnpm lint       # Ver errores
pnpm lint:fix   # Intentar auto-fix
```

## Beneficios

1. **Calidad de código**: Formateo y linting automático
2. **Seguridad de tipos**: Type checking antes de cada commit
3. **Historial limpio**: Mensajes de commit consistentes y descriptivos
4. **Documentación**: Commits siguen estándar que permite generar changelogs
5. **Colaboración**: Todos los desarrolladores siguen las mismas reglas
6. **Prevención de errores**: Detecta problemas antes de que lleguen al repo

## Desactivar Temporalmente

Si necesitas desactivar los hooks temporalmente (no recomendado):

```bash
# Desactivar
mv .husky .husky.bak

# Reactivar
mv .husky.bak .husky
```

## Troubleshooting

### Los hooks no se ejecutan

```bash
# Reinstalar husky
pnpm prepare
```

### Permisos en Linux/Mac

```bash
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
```

### CSpell muy lento

Agrega más patrones a `ignorePaths` en `cspell.config.json` para excluir directorios grandes.

## Referencias

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Commitlint](https://commitlint.js.org/)
- [Husky](https://typicode.github.io/husky/)
- [CSpell](https://cspell.org/)
- [Commitizen](https://github.com/commitizen/cz-cli)
