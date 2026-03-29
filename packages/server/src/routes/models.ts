import { Hono } from 'hono';
import { listModels, pullModel, PullProgress } from '../ai/ollama-management.js';
import { streamSSE } from '../middleware/sse.js';
import { getDb } from '../db/connection.js';
import { config } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const modelsRoute = new Hono();

modelsRoute.get('/', async c => {
  try {
    const models = await listModels();
    return c.json({ models });
  } catch (error: any) {
    return c.json({ error: error.message }, 503);
  }
});

modelsRoute.post('/pull', zValidator('json', z.object({ name: z.string() })), c => {
  const { name } = c.req.valid('json');
  return streamSSE(c, async stream => {
    try {
      await pullModel(name, async (progress: PullProgress) => {
        await stream.sendEvent('progress', progress);
      });
      await stream.sendEvent('done', { status: 'success' });
    } catch (error: any) {
      await stream.sendEvent('error', { error: error.message });
    } finally {
      await stream.close();
    }
  });
});

modelsRoute.get('/active', async c => {
  const db = getDb();
  const activeModelRecord = await db
    .select()
    .from(config)
    .where(eq(config.key, 'activeModel'))
    .get();
  return c.json({ model: activeModelRecord ? activeModelRecord.value : null });
});

modelsRoute.post('/active', zValidator('json', z.object({ model: z.string() })), async c => {
  const body = c.req.valid('json');
  const db = getDb();

  await db
    .insert(config)
    .values({ key: 'activeModel', value: body.model })
    .onConflictDoUpdate({ target: config.key, set: { value: body.model } })
    .run();

  return c.json({ ok: true });
});

export default modelsRoute;
