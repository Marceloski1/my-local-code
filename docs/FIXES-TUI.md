# Correcciones de la TUI

## Errores Corregidos

### 1. No se podía navegar con flechas en el menú de comandos

**Problema**: Al escribir "/" y mostrar el menú de comandos, las teclas de flecha arriba/abajo no funcionaban para navegar por la lista.

**Causa**: El `useInput` global no estaba manejando la navegación cuando el modal de comandos estaba abierto.

**Solución**:

- Agregué manejo específico para el modal de comandos en `useInput`
- Las flechas arriba/abajo ahora actualizan `commandSelectedIndex`
- El índice se limita entre 0 y el número de comandos filtrados
- La navegación solo funciona cuando `modalType === 'commands'`

**Código agregado**:

```typescript
if (modalType === 'commands') {
  if (key.upArrow) {
    setCommandSelectedIndex(prev => Math.max(0, prev - 1));
    return;
  }

  if (key.downArrow) {
    const filteredCommands = COMMANDS.filter(cmd =>
      cmd.toLowerCase().includes(filter.toLowerCase())
    );
    setCommandSelectedIndex(prev => Math.min(filteredCommands.length - 1, prev + 1));
    return;
  }
}
```

### 2. No se ejecutaba el comando al presionar Enter

**Problema**: Al seleccionar un comando con las flechas y presionar Enter, no se ejecutaba el comando ni se abría el modal correspondiente.

**Causa**: No había lógica para ejecutar el comando seleccionado cuando se presionaba Enter en el menú de comandos.

**Solución**:

- Agregué manejo de la tecla Enter cuando el modal de comandos está abierto
- Al presionar Enter, se obtiene el comando seleccionado de la lista filtrada
- Se cierra el modal y se ejecuta el comando llamando a `handleSubmit`

**Código agregado**:

```typescript
if (modalType === 'commands') {
  if (key.return) {
    const COMMANDS = [
      '/agents',
      '/connect',
      '/editor',
      '/exit',
      '/help',
      '/init',
      '/mcps',
      '/models',
      '/new',
      '/review',
    ];
    const filter = input.substring(1);
    const filteredCommands = COMMANDS.filter(cmd =>
      cmd.toLowerCase().includes(filter.toLowerCase())
    );

    if (filteredCommands.length > 0) {
      const selectedCommand = filteredCommands[commandSelectedIndex];
      setInput(selectedCommand);
      setModalType('none');
      handleSubmit(selectedCommand);
    }
    return;
  }
}
```

### 3. Reset del índice al cambiar el filtro

**Mejora adicional**: Cuando el usuario escribe y cambia el filtro, el índice seleccionado se resetea a 0 para evitar que quede fuera de rango.

**Código modificado**:

```typescript
const handleInputChange = (value: string) => {
  setInput(value);

  if (value.startsWith('/') && value.length > 0) {
    setModalType('commands');
    setCommandSelectedIndex(0); // Reset selection when filter changes
  } else if (modalType === 'commands') {
    setModalType('none');
  }
};
```

## Flujo de Uso Corregido

### Navegación en el menú de comandos:

1. Usuario escribe "/" → Se muestra el menú de comandos
2. Usuario presiona ↓ → Se selecciona el siguiente comando (visual con ▶ y fondo)
3. Usuario presiona ↑ → Se selecciona el comando anterior
4. Usuario presiona Enter → Se ejecuta el comando seleccionado
5. Usuario presiona Esc → Se cierra el menú sin ejecutar

### Ejemplo: Seleccionar modelo

1. Usuario escribe "/"
2. Menú se muestra con todos los comandos
3. Usuario presiona ↓ hasta llegar a "/models" (o escribe "/mod" para filtrar)
4. Usuario presiona Enter
5. Se cierra el menú de comandos
6. Se abre el modal de selección de modelos

### Ejemplo: Crear nueva sesión

1. Usuario escribe "/"
2. Usuario presiona ↓ hasta "/new"
3. Usuario presiona Enter
4. Se crea una nueva sesión automáticamente
5. El input se limpia y está listo para escribir

## Archivos Modificados

- `packages/tui/src/App.tsx`:
  - Agregado manejo de navegación con flechas en el menú de comandos
  - Agregado ejecución de comandos con Enter
  - Mejorado el manejo de modales
  - Reset del índice al cambiar el filtro

## Testing

Para probar las correcciones:

```bash
# Compilar
pnpm --filter @agent/tui build

# Ejecutar
pnpm --filter @agent/tui dev
```

### Casos de prueba:

1. **Navegación básica**:
   - Escribir "/"
   - Presionar ↓ varias veces
   - Verificar que el indicador ▶ se mueve
   - Verificar que el fondo cambia de color

2. **Ejecución de comando**:
   - Escribir "/"
   - Navegar a "/models" con ↓
   - Presionar Enter
   - Verificar que se abre el modal de modelos

3. **Filtrado**:
   - Escribir "/mod"
   - Verificar que solo se muestran comandos que contienen "mod"
   - Presionar Enter
   - Verificar que se ejecuta "/models"

4. **Cancelación**:
   - Escribir "/"
   - Presionar Esc
   - Verificar que el menú se cierra
   - Verificar que el input se limpia

## Notas

- La lista de comandos está duplicada en el código (una vez en `CommandMenu.tsx` y otra en `App.tsx`). Esto debería refactorizarse para evitar inconsistencias.
- El filtrado es case-insensitive y busca en el nombre del comando.
- El índice seleccionado se mantiene dentro de los límites de la lista filtrada.
