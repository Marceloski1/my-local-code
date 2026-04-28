# Fase 2 — SDK + TUI shell + pantalla de Modelos

## Resumen de lo realizado

En la **Fase 2**, se implementó el cliente tipado en el frontend que consume la API del servidor y la base visual interactiva de la TUI mediante Ink y Zustand.

### Tareas Completadas:

1. **Cliente HTTP (SDK en `packages/sdk`):**
   - Se construyó el `AgentClient` para interactuar con el servidor.
   - Cuenta con funciones utilitarias y un generador asíncrono robusto (`parseSSE`) capaz de rearmar y parsear eventos en stream con `sequence numbers`.

2. **Gestión de Estado TUI (`useAppStore`):**
   - Se configuró **Zustand** para manejar transversalmente el estado de la terminal (pantalla activa, modo actual 'plan'/'build', conexión del backend y modelo elegido).

3. **Arquitectura y Layout de la TUI (Ink):**
   - Implementación de un `Header` reactivo (muestra conexión y modo).
   - Implementación de `TabBar` para navegar intuitivamente usando la tecla del `Tab` a través de los atajos y el hook `useInput`.
   - Generación de los _placeholders_ y esqueletos de las pantallas de `Chat` y `Sesiones`.

4. **Pantalla de Modelos (`ModelsScreen`):**
   - Permite listar modelos obtenidos del backend y visualizar parámetros clave (GB, número de params).
   - Maneja el riesgo de modelos sobredimensionados añadiendo avisos amarillos para aquellos con más de 8GB.
   - Integración fluida vía teclado para elegir modelos (flechas y `<Enter>`) o invocar la caja de descarga de un nuevo modelo (`P` -> `TextInput`) monitoreando bytes por SSE.

5. **Compatibilidad Visual:**
   - Script independiente creado en `scripts/test-ansi.ts` usando la librería `supports-color` para verificar las capacidades ANSI/256/16m en la shell del usuario, especialmente relevante en Windows.
