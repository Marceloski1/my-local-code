# Feature: Dynamic Session Titles

## Resumen

Implementación de generación automática de títulos para sesiones basados en el primer mensaje del usuario, eliminando el problema de todas las sesiones llamándose "Nueva conversación".

## Problema

Todas las sesiones se creaban con el título estático "Nueva conversación", lo que hacía difícil distinguir entre diferentes sesiones en la lista.

## Solución

### 1. Generación Automática de Títulos

Cuando el usuario envía el primer mensaje en una sesión, el sistema automáticamente:

1. Detecta que es el primer mensaje (history.length === 0)
2. Genera un título basado en el contenido del mensaje
3. Actualiza el título de la sesión en la base de datos

### 2. Estrategias de Generación

Se implementaron dos estrategias:

#### Estrategia Simple (Implementada)

```typescript
generateSessionTitle(userMessage: string): string
```

Lógica:

- Si el mensaje tiene ≤50 caracteres, usa el mensaje completo
- Si encuentra una oración completa (termina en . ! ?) ≤60 caracteres, usa esa oración
- Si no, trunca a 50 caracteres y agrega "..."

Ejemplos:

- Input: "Fix broken tests"
- Output: "Fix broken tests"

- Input: "Can you help me debug this authentication issue in my React app?"
- Output: "Can you help me debug this authentication issue..."

#### Estrategia con IA (Disponible pero no activa)

```typescript
generateSessionTitleWithAI(userMessage: string, model: any): Promise<string>
```

Usa el LLM para generar un título conciso (máx 6 palabras):

- Envía un prompt al modelo pidiendo un título corto
- Limpia la respuesta (quita comillas, espacios extra)
- Si falla, hace fallback a la estrategia simple

### 3. Título por Defecto Mejorado

Para sesiones creadas sin mensaje inicial, el título ahora incluye fecha y hora:

**Antes**: "Nueva conversación"
**Ahora**: "New Chat Dec 29, 3:45 PM"

Formato: `New Chat {Month} {Day}, {Hour}:{Minute} {AM/PM}`

## Archivos Modificados

### `packages/server/src/lib/session-title.ts` (Nuevo)

Funciones helper para generación de títulos:

- `generateSessionTitle()` - Estrategia simple basada en heurísticas
- `generateSessionTitleWithAI()` - Estrategia con IA (opcional)

### `packages/server/src/routes/chat.ts`

Modificado el endpoint `POST /api/sessions/:id/messages`:

```typescript
// Si es el primer mensaje, genera título
if (history.length === 0) {
  const { generateSessionTitle } = await import('../lib/session-title.js');
  updateData.title = generateSessionTitle(content);
}

await db.update(sessions).set(updateData).where(eq(sessions.id, sessionId));
```

### `packages/server/src/routes/sessions.ts`

Modificado el endpoint `POST /api/sessions`:

```typescript
// Genera título con timestamp si no se proporciona
const defaultTitle =
  title ||
  `New Chat ${new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })}`;
```

## Flujo de Uso

### Escenario 1: Usuario crea sesión y envía mensaje

1. Usuario ejecuta `/new` → Se crea sesión con título "New Chat Dec 29, 3:45 PM"
2. Usuario escribe "Fix broken tests" → Envía mensaje
3. Sistema detecta que es el primer mensaje
4. Sistema genera título: "Fix broken tests"
5. Sistema actualiza la sesión con el nuevo título
6. En la lista de sesiones aparece "Fix broken tests" en lugar de "New Chat..."

### Escenario 2: Usuario crea sesión con título personalizado

1. Usuario ejecuta `/new My Custom Title`
2. Se crea sesión con título "My Custom Title"
3. El título no se sobrescribe al enviar el primer mensaje

### Escenario 3: Sesión creada automáticamente

1. Usuario escribe mensaje sin sesión activa
2. Sistema crea sesión automáticamente con título temporal
3. Al enviar el mensaje, se genera título basado en el contenido

## Ejemplos de Títulos Generados

| Mensaje del Usuario                                                                                                 | Título Generado                                   |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| "Fix broken tests"                                                                                                  | "Fix broken tests"                                |
| "How do I implement authentication?"                                                                                | "How do I implement authentication?"              |
| "Can you help me debug this really long authentication issue in my React application that's been causing problems?" | "Can you help me debug this really long authe..." |
| "Help!"                                                                                                             | "Help!"                                           |
| "What's the best way to structure a monorepo?"                                                                      | "What's the best way to structure a monorepo?"    |

## Ventajas

1. **Identificación fácil**: Cada sesión tiene un título descriptivo
2. **Sin intervención del usuario**: Se genera automáticamente
3. **Fallback robusto**: Si algo falla, usa título con timestamp
4. **Personalizable**: Usuario puede crear sesión con título custom
5. **Escalable**: Fácil cambiar a estrategia con IA en el futuro

## Mejoras Futuras

### 1. Activar Generación con IA

Para usar la estrategia con IA:

```typescript
// En chat.ts
if (history.length === 0) {
  const { generateSessionTitleWithAI } = await import('../lib/session-title.js');
  updateData.title = await generateSessionTitleWithAI(content, model);
}
```

Ventajas:

- Títulos más concisos y descriptivos
- Mejor comprensión del contexto
- Títulos en lenguaje natural

Desventajas:

- Requiere llamada adicional al LLM (latencia)
- Consume tokens
- Puede fallar si el modelo no está disponible

### 2. Regenerar Título

Agregar endpoint para regenerar título:

```typescript
POST /api/sessions/:id/regenerate-title
```

Permite al usuario regenerar el título si no le gusta el automático.

### 3. Editar Título

Ya existe la funcionalidad de rename (Ctrl+R), pero falta implementar el endpoint:

```typescript
PATCH /api/sessions/:id
Body: { title: "New Title" }
```

### 4. Títulos Multiidioma

Detectar el idioma del mensaje y generar título en ese idioma:

```typescript
if (detectLanguage(content) === 'es') {
  defaultTitle = `Nueva Conversación ${formatDate()}`;
}
```

## Testing

Para probar la funcionalidad:

```bash
# Compilar servidor
pnpm --filter @agent/server build

# Iniciar servidor
pnpm --filter @agent/server dev

# En otra terminal, iniciar TUI
pnpm --filter @agent/tui dev
```

### Casos de prueba:

1. **Crear sesión y enviar mensaje corto**:
   - `/new` → Enviar "Fix tests"
   - Verificar que el título cambia a "Fix tests"

2. **Crear sesión y enviar mensaje largo**:
   - `/new` → Enviar mensaje de 100+ caracteres
   - Verificar que el título se trunca con "..."

3. **Crear sesión con título custom**:
   - `/new My Project`
   - Enviar mensaje
   - Verificar que el título sigue siendo "My Project"

4. **Múltiples sesiones**:
   - Crear varias sesiones con diferentes mensajes
   - Verificar que cada una tiene título único
   - Verificar que se pueden distinguir en la lista

## Notas Técnicas

- La generación de título ocurre en el endpoint de chat, no en el de sesiones
- Se usa `history.length === 0` para detectar el primer mensaje
- El título se actualiza en la misma transacción que guarda el mensaje
- La función `generateSessionTitle` es síncrona y rápida
- La función `generateSessionTitleWithAI` es asíncrona y puede fallar
- El formato de fecha usa `toLocaleString` con opciones específicas
- Los títulos se limitan a 60 caracteres máximo para evitar overflow en UI
