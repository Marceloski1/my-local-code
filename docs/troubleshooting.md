# Troubleshooting

## Error: "fetch failed" en la TUI (pantalla de Modelos)

### Síntoma

Al ejecutar `pnpm --filter @agent/tui dev`, la TUI se inicia pero muestra "Error: fetch failed" en la pantalla de Modelos.

### Causa

La TUI intenta conectarse al servidor en `http://localhost:4096`, pero el servidor no está corriendo.

### Solución

Tienes 3 opciones:

#### Opción 1: Usar el comando dev desde la raíz (Recomendado)

```bash
# Desde la raíz del proyecto
pnpm dev
```

Este comando usa Turbo para iniciar tanto el servidor como la TUI simultáneamente.

#### Opción 2: Iniciar servidor y TUI en terminales separadas

```bash
# Terminal 1: Iniciar el servidor
pnpm --filter @agent/server dev

# Terminal 2: Iniciar la TUI
pnpm --filter @agent/tui dev
```

#### Opción 3: Usar un script personalizado

Puedes crear un script que inicie ambos procesos. Agrega esto al `package.json` raíz:

```json
{
  "scripts": {
    "dev:all": "concurrently \"pnpm --filter @agent/server dev\" \"pnpm --filter @agent/tui dev\""
  }
}
```

Luego instala `concurrently`:

```bash
pnpm add -D concurrently
```

Y ejecuta:

```bash
pnpm dev:all
```

### Verificación

Para verificar que el servidor está corriendo correctamente:

```bash
curl http://localhost:4096/health
```

Deberías ver una respuesta como:

```json
{
  "status": "ok",
  "timestamp": "2026-03-25T14:30:00.000Z",
  "ollamaAvailable": false
}
```

---

## Error: "No active model configured"

### Síntoma

Al intentar enviar un mensaje en el chat, recibes el error "No active model configured".

### Causa

No has seleccionado un modelo activo en la pantalla de Modelos.

### Solución

1. Ve a la pantalla de Modelos (pestaña 1)
2. Usa las flechas para seleccionar un modelo
3. Presiona Enter para activarlo
4. Verifica que aparece una marca (★) junto al modelo seleccionado

### Verificación por API

```bash
curl http://localhost:4096/api/models/active
```

Debería retornar:

```json
{
  "model": "gemma3:1b"
}
```

---

## Error: "Ollama no está disponible"

### Síntoma

La pantalla de Modelos muestra "Error: Ollama no está disponible".

### Causa

Ollama no está corriendo o no está accesible en `http://localhost:11434`.

### Solución

1. Verifica que Ollama está instalado:

   ```bash
   ollama --version
   ```

2. Inicia Ollama:

   ```bash
   ollama serve
   ```

3. Verifica que está corriendo:

   ```bash
   curl http://localhost:11434/api/tags
   ```

4. Si no tienes modelos, descarga uno:
   ```bash
   ollama pull gemma3:1b
   # o
   ollama pull llama3:8b
   ```

---

## Error: "GatewayAuthenticationError"

### Síntoma

En los logs del servidor ves: "GatewayAuthenticationError: Unauthenticated request to AI Gateway"

### Causa

El modelo no está siendo inicializado correctamente con el provider de Ollama.

### Solución

Este error ya fue corregido en el código. Si lo sigues viendo:

1. Asegúrate de tener la última versión del código
2. Verifica que `packages/server/src/routes/chat.ts` incluye:

   ```typescript
   const { createAIProvider } = await import('../ai/provider.js');
   const provider = createAIProvider({
     type: 'ollama',
     baseURL: 'http://localhost:11434/v1',
   });
   const model = provider(activeModel);
   ```

3. Reinicia el servidor

---

## La TUI no muestra colores

### Síntoma

La TUI se ve en blanco y negro sin colores.

### Causa

Tu terminal no soporta colores ANSI o no está configurada correctamente.

### Solución

1. Verifica el soporte de colores:

   ```bash
   cd scripts
   pnpm test:ansi
   ```

2. Si estás en Windows:
   - Usa Windows Terminal (recomendado)
   - O PowerShell 7+
   - Evita cmd.exe antiguo

3. Si estás en Linux/macOS:
   - Asegúrate de que `$TERM` está configurado:
     ```bash
     echo $TERM
     # Debería ser algo como: xterm-256color
     ```

---

## Error: "Cannot find module"

### Síntoma

Al ejecutar scripts o la aplicación, ves errores de módulos no encontrados.

### Causa

Las dependencias no están instaladas o están desactualizadas.

### Solución

```bash
# Desde la raíz del proyecto
pnpm install

# Si el problema persiste, limpia y reinstala
rm -rf node_modules packages/*/node_modules
pnpm install
```

---

## El servidor no recarga automáticamente

### Síntoma

Haces cambios en el código del servidor pero no se reflejan.

### Causa

El modo watch de `tsx` no está funcionando correctamente.

### Solución

1. Detén el servidor (Ctrl+C)
2. Reinicia con:

   ```bash
   pnpm --filter @agent/server dev
   ```

3. Verifica que ves el mensaje:
   ```
   Server is running on port 4096
   ```

---

## Tests fallan con errores de tipos

### Síntoma

Al ejecutar `pnpm test`, ves errores de TypeScript.

### Causa

Algunos tests tienen errores de tipos pre-existentes que no afectan la funcionalidad.

### Solución

Estos errores son conocidos y están documentados. Para ejecutar solo los tests que funcionan:

```bash
# Tests del servidor (Fase 1)
pnpm --filter @agent/server test

# Tests del SDK (Fase 2)
pnpm --filter @agent/sdk test
```

Los tests de la TUI tienen algunos fallos conocidos que serán corregidos en futuras iteraciones.

---

## Problemas de rendimiento en la TUI

### Síntoma

La TUI se siente lenta o con lag al recibir muchos tokens.

### Causa

El throttle de tokens puede no estar funcionando correctamente.

### Solución

1. Verifica el benchmark:

   ```bash
   cd scripts
   npx tsx test-ink-perf.ts
   ```

2. Si el problema persiste, ajusta el throttle en `useChat.ts`:
   ```typescript
   // Aumenta el delay de 50ms a 100ms
   const THROTTLE_MS = 100;
   ```

---

## Base de datos corrupta

### Síntoma

Errores al leer/escribir sesiones o mensajes.

### Causa

La base de datos SQLite puede estar corrupta.

### Solución

```bash
# Elimina la base de datos
rm packages/server/data/agent.db

# Reinicia el servidor (recreará la DB)
pnpm --filter @agent/server dev
```

**Nota**: Esto eliminará todas las sesiones y mensajes guardados.

---

## Más ayuda

Si ninguna de estas soluciones funciona:

1. Revisa los logs del servidor en la terminal
2. Verifica que todos los puertos están disponibles (4096 para server, 11434 para Ollama)
3. Consulta la documentación en `/docs`
4. Revisa los issues conocidos en el repositorio
