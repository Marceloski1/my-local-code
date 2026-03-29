# Feature: Sessions Management

## Resumen

Implementación del comando `/sessions` para gestionar sesiones de chat con agrupación por fecha y funcionalidad completa de navegación, selección y eliminación.

## Cambios Implementados

### 1. Comando `/sessions`

Agregado nuevo comando `/sessions` que:

- Carga las sesiones desde el servidor
- Abre el modal de selección de sesiones
- Permite navegar, buscar y gestionar sesiones

**Uso**:

```
/ → /sessions → Enter
```

### 2. Carga Dinámica de Sesiones

- Reemplazado mock data con carga real desde el servidor
- Función `loadSessions()` que obtiene sesiones via API
- Estado `loadingSessions` para manejar el loading
- Las sesiones se cargan al abrir el modal

### 3. Agrupación por Fecha

Las sesiones se agrupan automáticamente en:

- **Today**: Sesiones de hoy
- **Yesterday**: Sesiones de ayer
- **This Week**: Sesiones de esta semana
- **This Month**: Sesiones de este mes
- **Older**: Sesiones más antiguas

### 4. Formato de Hora

Cada sesión muestra la hora de última actualización en formato `HH:MM` (ej: `12:07`)

### 5. Navegación Mejorada

- ↑↓ para navegar entre sesiones
- Enter para seleccionar y cambiar a esa sesión
- Ctrl+D para eliminar sesión
- Ctrl+R para renombrar (pendiente implementación)
- Esc para cerrar el modal

### 6. Actualización Automática

Después de eliminar una sesión:

- Se recarga la lista de sesiones
- Se actualiza el índice seleccionado
- Si la sesión eliminada era la activa, se limpia la sesión activa

## Archivos Modificados

### `packages/tui/src/App.tsx`

**Agregado**:

- Estado `sessions` para almacenar sesiones
- Estado `loadingSessions` para loading state
- Función `loadSessions()` para cargar sesiones desde API
- Comando `/sessions` en `handleSubmit()`
- Actualización de `handleSessionDelete()` para recargar sesiones

**Cambios**:

```typescript
// Antes: Mock data
const [sessions] = useState([...]);

// Ahora: Estado dinámico
const [sessions, setSessions] = useState<Array<{...}>>([]);
const [loadingSessions, setLoadingSessions] = useState(false);

const loadSessions = async () => {
  setLoadingSessions(true);
  try {
    const list = await client.listSessions();
    setSessions(list);
  } catch (e) {
    console.error('Failed to load sessions:', e);
  } finally {
    setLoadingSessions(false);
  }
};
```

### `packages/tui/src/components/CommandMenu.tsx`

**Agregado**:

- Comando `/sessions` a la lista de comandos disponibles

```typescript
{ name: '/sessions', description: 'Manage sessions' }
```

### `packages/tui/src/components/SessionSelector.tsx`

**Agregado**:

- Función `groupSessionsByDate()` para agrupar sesiones
- Función `formatTime()` para formatear hora
- Lógica de agrupación en el render
- Mostrar headers de grupo (Today, Yesterday, etc.)
- Mostrar hora al lado de cada sesión

**Mejoras**:

- Navegación funciona correctamente con sesiones agrupadas
- Índice seleccionado se ajusta después de eliminar
- Mejor organización visual con grupos

## Estructura Visual

```
┌─ Sessions ──────────────────────────────────── esc ─┐
│                                                      │
│ Search                                               │
│ [_____________________________________________]      │
│                                                      │
│ Today                                                │
│   Quien eres? Conversation Topic Summary    12:07   │
│   Another session title                      11:30   │
│                                                      │
│ Yesterday                                            │
│   Previous conversation                      18:45   │
│                                                      │
│ delete ctrl+d    rename ctrl+r                       │
└──────────────────────────────────────────────────────┘
```

## Flujo de Uso

### Ver sesiones:

1. Usuario escribe `/sessions` o navega en el menú de comandos
2. Sistema carga sesiones desde el servidor
3. Se muestra el modal con sesiones agrupadas por fecha
4. Usuario puede buscar, navegar y seleccionar

### Cambiar de sesión:

1. Usuario navega con ↑↓ hasta la sesión deseada
2. Presiona Enter
3. La sesión se activa y el modal se cierra
4. El chat muestra los mensajes de esa sesión

### Eliminar sesión:

1. Usuario navega hasta la sesión a eliminar
2. Presiona Ctrl+D
3. La sesión se elimina del servidor
4. La lista se recarga automáticamente
5. Si era la sesión activa, se limpia

## Funcionalidades Pendientes

1. **Rename (Ctrl+R)**:
   - Mostrar input para editar el título
   - Actualizar en el servidor
   - Recargar lista

2. **Loading State**:
   - Mostrar spinner mientras carga sesiones
   - Mensaje de "Loading sessions..."

3. **Error Handling**:
   - Mostrar mensaje si falla la carga
   - Retry button

4. **Paginación**:
   - Limitar sesiones mostradas
   - Load more button

5. **Búsqueda Mejorada**:
   - Fuzzy search
   - Buscar en contenido de mensajes

## Testing

Para probar la funcionalidad:

```bash
# Compilar
pnpm --filter @agent/tui build

# Ejecutar
pnpm --filter @agent/tui dev
```

### Casos de prueba:

1. **Abrir modal de sesiones**:
   - Escribir `/sessions`
   - Presionar Enter
   - Verificar que se muestra el modal

2. **Navegar sesiones**:
   - Usar ↑↓ para navegar
   - Verificar que la selección se mueve correctamente
   - Verificar que funciona con sesiones agrupadas

3. **Cambiar sesión**:
   - Seleccionar una sesión
   - Presionar Enter
   - Verificar que el chat cambia a esa sesión

4. **Eliminar sesión**:
   - Seleccionar una sesión
   - Presionar Ctrl+D
   - Verificar que se elimina
   - Verificar que la lista se actualiza

5. **Buscar sesiones**:
   - Escribir en el campo de búsqueda
   - Verificar que filtra correctamente
   - Verificar que la agrupación se mantiene

## Notas Técnicas

- Las sesiones se ordenan por `updatedAt` descendente
- La agrupación por fecha usa la fecha local del cliente
- El formato de hora es 24 horas (HH:MM)
- La navegación con teclado usa un array plano de sesiones
- Los grupos vacíos no se muestran
