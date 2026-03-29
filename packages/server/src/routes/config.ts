import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { config } from '../db/schema.js';

const app = new Hono();

// Schema for setting mode
const setModeSchema = z.object({
  mode: z.enum(['plan', 'build']),
});

/**
 * GET /api/config
 * Get current configuration
 */
app.get('/', async c => {
  const db = getDb();

  // Get all config values
  const configValues = await db.select().from(config);

  // Convert to object
  const configObj: Record<string, string> = {};
  for (const item of configValues) {
    configObj[item.key] = item.value;
  }

  // Set defaults if not present
  if (!configObj.mode) {
    configObj.mode = 'plan';
  }

  return c.json(configObj);
});

/**
 * POST /api/config/mode
 * Set the agent mode (plan or build)
 */
app.post('/mode', zValidator('json', setModeSchema), async c => {
  const { mode } = c.req.valid('json');
  const db = getDb();

  // Upsert mode in config
  await db
    .insert(config)
    .values({ key: 'mode', value: mode })
    .onConflictDoUpdate({
      target: config.key,
      set: { value: mode },
    });

  return c.json({ ok: true, mode });
});

export default app;
