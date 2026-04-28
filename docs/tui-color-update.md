# Actualización de Paleta de Colores TUI

## Resumen

Se ha actualizado la TUI para usar estrictamente la paleta de colores oficial de LocalCode, mejorando la consistencia visual y la identidad de marca.

## Cambios Realizados

### 1. Nuevo Sistema de Colores

Se creó `packages/tui/src/theme/colors.ts` con:

- Definición de la paleta oficial de LocalCode
- Constantes exportables para uso en componentes
- Mapeo de colores para Ink

### 2. Componentes Actualizados

Todos los componentes ahora usan `INK_COLORS` en lugar de colores hardcodeados:

#### Header (`components/Header.tsx`)

- Modo "plan": Amarillo dorado (#FFB300)
- Modo "build": Rojo (#E53935)
- Estado online: Verde (#66BB6A)
- Estado offline: Rojo (#E53935)
- Modelo activo: Azul (#1E88E5)
- Separadores: Gris claro (#8B8FA8)

#### TabBar (`components/TabBar.tsx`)

- Tab activo: Azul brillante (#42A5F5)
- Tab inactivo: Gris claro (#8B8FA8)

#### MessageBubble (`components/MessageBubble.tsx`)

- Usuario: Azul (#1E88E5)
- Agente: Verde (#66BB6A)

#### ToolCall (`components/ToolCall.tsx`)

- Tool call: Amarillo dorado (#FFB300)
- Resultado: Azul (#1E88E5)
- Texto secundario: Gris claro (#8B8FA8)

#### ModelWarning (`components/ModelWarning.tsx`)

- Advertencia: Amarillo dorado (#FFB300)

### 3. Pantallas Actualizadas

#### Chat (`screens/Chat.tsx`)

- Prompt: Azul (#1E88E5)
- Estado "Pensando": Amarillo dorado (#FFB300)
- Mensajes de error: Rojo (#E53935)
- Texto secundario: Gris claro (#8B8FA8)
- Bordes: Gris claro (#8B8FA8)
- Banner de desconexión: Amarillo dorado (#FFB300)

#### Models (`screens/Models.tsx`)

- Modelo seleccionado: Azul brillante (#42A5F5)
- Descarga en progreso: Azul (#1E88E5)
- Input de descarga: Verde (#66BB6A)
- Errores: Rojo (#E53935)
- Advertencias: Amarillo dorado (#FFB300)
- Texto secundario: Gris claro (#8B8FA8)

#### Sessions (`screens/Sessions.tsx`)

- Sesión seleccionada: Azul brillante (#42A5F5)
- Sesión normal: Blanco (#F0F0F0)
- Texto secundario: Gris claro (#8B8FA8)
- Advertencias: Amarillo dorado (#FFB300)
- Errores: Rojo (#E53935)

## Paleta de Colores

| Rol                    | Color           | Hex       | Uso en TUI               |
| ---------------------- | --------------- | --------- | ------------------------ |
| Acento primario        | Rojo            | `#E53935` | Errores, modo "build"    |
| Acento secundario      | Azul            | `#1E88E5` | Usuario, comandos, info  |
| Selección / activo     | Azul brillante  | `#42A5F5` | Elementos seleccionados  |
| Superficie / UI chrome | Gris oscuro     | `#2A2D36` | (Reservado para futuro)  |
| Fondo                  | Negro           | `#0D0D0D` | Fondo terminal           |
| Texto primario         | Blanco          | `#F0F0F0` | Texto principal          |
| Texto secundario       | Gris claro      | `#8B8FA8` | Texto secundario, bordes |
| Warning / thinking     | Amarillo dorado | `#FFB300` | Advertencias, "pensando" |
| Éxito / sección header | Verde           | `#66BB6A` | Éxito, agente, online    |

## Beneficios

1. **Consistencia**: Todos los componentes usan la misma paleta
2. **Mantenibilidad**: Cambios de color centralizados en un solo archivo
3. **Identidad de marca**: Colores oficiales de LocalCode
4. **Accesibilidad**: Colores con buen contraste sobre fondo negro
5. **Semántica clara**: Cada color tiene un propósito específico

## Archivos Modificados

- `packages/tui/src/theme/colors.ts` (nuevo)
- `packages/tui/src/theme/README.md` (nuevo)
- `packages/tui/src/components/Header.tsx`
- `packages/tui/src/components/TabBar.tsx`
- `packages/tui/src/components/MessageBubble.tsx`
- `packages/tui/src/components/ToolCall.tsx`
- `packages/tui/src/components/ModelWarning.tsx`
- `packages/tui/src/screens/Chat.tsx`
- `packages/tui/src/screens/Models.tsx`
- `packages/tui/src/screens/Sessions.tsx`

## Testing

✅ Compilación exitosa sin errores
✅ Sin errores de TypeScript
✅ Todos los componentes actualizados
✅ Documentación creada

## Próximos Pasos

Para probar los cambios visualmente:

```bash
# Compilar
pnpm --filter @agent/tui build

# Ejecutar
pnpm --filter @agent/tui dev
```

O desde la raíz:

```bash
pnpm dev
```
