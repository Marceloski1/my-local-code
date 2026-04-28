# TUI Redesign - LocalCode Style

## Resumen

Rediseño completo de la TUI para seguir el estilo visual de OpenCode/LocalCode con una interfaz más limpia y moderna.

## Cambios Principales

### 1. Pantalla Única de Chat

**Antes**: 3 pantallas separadas (Models, Chat, Sessions) con tabs
**Ahora**: Una sola pantalla de chat con acceso a funciones mediante comandos

### 2. Logo Grande

Nuevo componente `Logo.tsx` que muestra:

- "LOCAL" en rojo (#E53935)
- "CODE" en azul (#1E88E5)
- Estilo ASCII art grande y prominente en la parte superior

### 3. Sistema de Comandos con "/"

Cuando el usuario escribe "/" en el input, se muestra un menú de comandos:

```
/agents     - Switch agent
/connect    - Connect provider
/editor     - Open editor
/exit       - Exit the app
/help       - Help
/init       - create/update AGENTS.md
/mcps       - Toggle MCPs
/models     - Switch model
/new        - New session
/review     - review changes [commit|branch|pr]
```

### 4. Modales Contextuales

#### Model Selector

- Búsqueda de modelos
- Lista de modelos disponibles
- Indicador de modelo activo (●)
- Navegación con flechas
- Selección con Enter
- Cerrar con Esc

#### Session Selector

- Búsqueda de sesiones
- Lista de sesiones
- Indicador de sesión activa (●)
- Delete con Ctrl+D
- Rename con Ctrl+R
- Cerrar con Esc

### 5. Input Box Mejorado

- Borde morado/violeta (#9B59B6)
- Muestra el modo actual (Plan/Build)
- Muestra el modelo activo
- Placeholder: "Ask anything... \"Fix broken tests\""

### 6. Barra de Estado

Muestra en la parte inferior:

- Directorio actual
- Branch de git (⎇ main)
- Estado de MCP (1 MCP /status)
- Versión (1.2.25)

### 7. Hints

En la esquina inferior derecha:

- "tab agents" - Cambiar entre modos
- "ctrl+p commands" - Abrir menú de comandos

## Componentes Nuevos

### `Logo.tsx`

Logo ASCII art grande con "LOCAL" en rojo y "CODE" en azul

### `StatusBar.tsx`

Barra de estado inferior con información del sistema

### `CommandMenu.tsx`

Menú de comandos que aparece al escribir "/"

### `ModelSelector.tsx`

Modal para seleccionar modelos con búsqueda

### `SessionSelector.tsx`

Modal para gestionar sesiones con búsqueda

## Flujo de Interacción

### Inicio

1. Usuario ve el logo grande de LocalCode
2. Área de chat vacía con mensaje "Ask anything..."
3. Input box con placeholder
4. Hints en la esquina

### Escribir Mensaje

1. Usuario escribe en el input
2. Presiona Enter para enviar
3. Mensaje aparece en el chat
4. Respuesta del agente se muestra en tiempo real

### Usar Comandos

1. Usuario escribe "/"
2. Aparece menú de comandos
3. Usuario navega con flechas o sigue escribiendo para filtrar
4. Enter para ejecutar comando
5. Esc para cancelar

### Cambiar Modelo

1. Usuario escribe "/models" o presiona Ctrl+P y selecciona
2. Aparece modal de selección de modelos
3. Usuario busca o navega con flechas
4. Enter para seleccionar
5. Esc para cancelar

### Cambiar Modo

1. Usuario presiona Tab
2. Modo cambia entre "Plan" y "Build"
3. Color del indicador cambia (amarillo/rojo)

## Atajos de Teclado

| Atajo  | Acción                                        |
| ------ | --------------------------------------------- |
| Tab    | Cambiar entre Plan/Build                      |
| Ctrl+P | Abrir menú de comandos                        |
| Esc    | Cerrar modal actual                           |
| Enter  | Enviar mensaje / Seleccionar opción           |
| ↑↓     | Navegar en listas                             |
| Ctrl+D | Eliminar sesión (en modal de sesiones)        |
| Ctrl+R | Renombrar sesión (en modal de sesiones)       |
| Ctrl+A | Ver todos los providers (en modal de modelos) |

## Paleta de Colores Usada

| Elemento         | Color          | Hex     |
| ---------------- | -------------- | ------- |
| Logo "LOCAL"     | Rojo           | #E53935 |
| Logo "CODE"      | Azul           | #1E88E5 |
| Input border     | Morado         | #9B59B6 |
| Modo "Plan"      | Amarillo       | #FFB300 |
| Modo "Build"     | Rojo           | #E53935 |
| Selección activa | Azul brillante | #42A5F5 |
| Texto secundario | Gris claro     | #8B8FA8 |
| Éxito/Online     | Verde          | #66BB6A |
| Bordes           | Gris claro     | #8B8FA8 |

## Estructura de Archivos

```
packages/tui/src/
├── components/
│   ├── Logo.tsx              (nuevo)
│   ├── StatusBar.tsx         (nuevo)
│   ├── CommandMenu.tsx       (nuevo)
│   ├── ModelSelector.tsx     (nuevo)
│   ├── SessionSelector.tsx   (nuevo)
│   ├── MessageBubble.tsx     (actualizado)
│   ├── ToolCall.tsx          (actualizado)
│   ├── Header.tsx            (deprecado)
│   └── TabBar.tsx            (deprecado)
├── screens/
│   ├── Chat.tsx              (deprecado)
│   ├── Models.tsx            (deprecado)
│   └── Sessions.tsx          (deprecado)
├── theme/
│   ├── colors.ts
│   └── README.md
├── App.tsx                   (completamente reescrito)
└── ...
```

## Próximos Pasos

### Funcionalidades Pendientes

1. **Comandos adicionales**:
   - /agents - Cambiar agente
   - /connect - Conectar provider
   - /editor - Abrir editor
   - /help - Mostrar ayuda
   - /init - Crear/actualizar AGENTS.md
   - /mcps - Toggle MCPs
   - /review - Revisar cambios

2. **Mejoras en modales**:
   - Implementar rename de sesiones
   - Agregar paginación en listas largas
   - Mejorar búsqueda con fuzzy matching

3. **Información de git**:
   - Detectar branch actual automáticamente
   - Mostrar estado de cambios
   - Integrar con /review

4. **Estado de MCP**:
   - Mostrar MCPs activos
   - Toggle individual de MCPs
   - Estado de conexión

5. **Persistencia**:
   - Guardar último modelo usado
   - Guardar última sesión activa
   - Guardar preferencia de modo

## Testing

Para probar la nueva TUI:

```bash
# Compilar
pnpm --filter @agent/tui build

# Ejecutar
pnpm --filter @agent/tui dev

# O desde la raíz
pnpm dev
```

## Notas de Implementación

- Ink no soporta posicionamiento absoluto, los modales se muestran inline
- El logo usa caracteres ASCII art para mejor compatibilidad
- Los colores hex son soportados nativamente por Ink
- La navegación con teclado es manejada por useInput de Ink
- Los modales se muestran condicionalmente basados en el estado

## Referencias

- Diseño inspirado en OpenCode
- Paleta de colores de LocalCode
- Comandos similares a CLI modernas (Vercel, Railway, etc.)
