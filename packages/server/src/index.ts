import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { getDb } from './db/connection.js';
import modelsRoute from './routes/models.js';
import sessionsRoute from './routes/sessions.js';
import chatRoute from './routes/chat.js';
import configRoute from './routes/config.js';
import { cors } from 'hono/cors';
import { createLoggerFromEnv } from './lib/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { GracefulShutdown } from './lib/shutdown.js';

// Create logger
export const logger = createLoggerFromEnv();

export const app = new Hono();

// Global error handler
app.onError(async (err, c) => {
  const result = await errorHandler(c, async () => {
    throw err;
  });
  return result as any;
});

app.use('*', cors());

app.get('/health', c => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ollamaAvailable: false, // Updated later
  });
});

app.route('/api/models', modelsRoute);
app.route('/api/sessions', sessionsRoute);
app.route('/api/sessions', chatRoute);
app.route('/api/config', configRoute);

// Solo iniciamos el server si es el entry point
if (process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  const port = 4096;

  // Log server startup
  logger.info(
    {
      nodeVersion: process.version,
      port,
      logLevel: logger.level,
      env: process.env.NODE_ENV || 'development',
    },
    'Server starting'
  );

  const server = serve({
    fetch: app.fetch,
    port,
  });

  logger.info({ port }, 'Server is running');

  // Setup graceful shutdown
  const db = getDb();
  const shutdown = new GracefulShutdown(server as any, db as any, {
    timeout: 10000, // 10 seconds
    logger,
  });

  // Register shutdown handlers
  process.on('SIGINT', () => {
    shutdown.shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    shutdown.shutdown('SIGTERM');
  });
}
