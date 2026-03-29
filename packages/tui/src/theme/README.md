# Paleta de Colores de LocalCode

Este directorio contiene la definición de la paleta de colores oficial de LocalCode para la TUI.

## Paleta de Colores

| Rol                    | Color           | Hex       | Uso                                       |
| ---------------------- | --------------- | --------- | ----------------------------------------- |
| Acento primario        | Rojo            | `#E53935` | Errores, modo "build", elementos críticos |
| Acento secundario      | Azul            | `#1E88E5` | Usuario, comandos, información            |
| Selección / activo     | Azul brillante  | `#42A5F5` | Elementos seleccionados, tabs activos     |
| Superficie / UI chrome | Gris oscuro     | `#2A2D36` | Fondos de superficie                      |
| Fondo                  | Negro           | `#0D0D0D` | Fondo principal                           |
| Texto primario         | Blanco          | `#F0F0F0` | Texto principal                           |
| Texto secundario       | Gris claro      | `#8B8FA8` | Texto secundario, bordes                  |
| Warning / thinking     | Amarillo dorado | `#FFB300` | Advertencias, estado "pensando"           |
| Éxito / sección header | Verde           | `#66BB6A` | Éxito, agente, headers                    |

## Uso

Importa los colores desde `colors.ts`:

```typescript
import { INK_COLORS } from '../theme/colors.js';

// Usar en componentes Ink
<Text color={INK_COLORS.primary}>Texto en rojo</Text>
<Text color={INK_COLORS.success}>Texto en verde</Text>
<Box borderColor={INK_COLORS.border}>...</Box>
```

## Mapeo de Colores

- `primary` → Rojo (#E53935) - Para errores y elementos críticos
- `secondary` → Azul (#1E88E5) - Para información y usuario
- `active` → Azul brillante (#42A5F5) - Para selección
- `text` → Blanco (#F0F0F0) - Texto principal
- `textSecondary` → Gris claro (#8B8FA8) - Texto secundario
- `warning` → Amarillo dorado (#FFB300) - Advertencias
- `success` → Verde (#66BB6A) - Éxito
- `error` → Rojo (#E53935) - Errores
- `border` → Gris claro (#8B8FA8) - Bordes

## Reglas

1. **Usar SOLO estos colores** - No usar colores básicos de Ink como "red", "blue", "green", etc.
2. **Consistencia** - Usar el mismo color para el mismo propósito en toda la aplicación
3. **Accesibilidad** - Los colores están diseñados para tener buen contraste sobre fondo negro
4. **Semántica** - Respetar el significado de cada color (ej: rojo para errores, verde para éxito)
