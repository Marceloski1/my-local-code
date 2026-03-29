import { Hono } from 'hono';
import * as ollama from '../ai/ollama-management.js';
import * as lmstudio from '../ai/lmstudio-management.js';
import { streamSSE } from '../middleware/sse.js';
import { getDb } from '../db/connection.js';
import { config } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const modelsRoute = new Hono();

// Get active provider (ollama or lmstudio)
async function getActiveProvider(): Promise<'ollama' | 'lmstudio'> {
  const db = getDb();
  const providerRecord = await db.select().from(config).where(eq(config.key, 'provider')).get();
  return (providerRecord?.value as 'ollama' | 'lmstudio') || 'ollama';
}

modelsRoute.get('/', async c => {
  try {
    const provider = await getActiveProvider();

    if (provider === 'lmstudio') {
      const lmModels = await lmstudio.listModels();
      // Normalize LM Studio models to match Ollama format
      const models = lmModels.map(m => ({
        name: m.id,
        size: m.size || 0,
        parameter_size: 'unknown',
        context_length: 8192,
        modified_at: new Date().toISOString(),
      }));
      return c.json({ models, provider: 'lmstudio' });
    } else {
      const models = await ollama.listModels();
      return c.json({ models, provider: 'ollama' });
    }
  } catch (error: any) {
    return c.json({ error: error.message }, 503);
  }
});

modelsRoute.post('/pull', zValidator('json', z.object({ name: z.string() })), async c => {
  const { name } = c.req.valid('json');
  const provider = await getActiveProvider();

  // Only Ollama supports pulling models
  if (provider !== 'ollama') {
    return c.json({ error: 'Model pulling is only supported for Ollama' }, 400);
  }

  return streamSSE(c, async stream => {
    try {
      await ollama.pullModel(name, async (progress: ollama.PullProgress) => {
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

// Get active provider
modelsRoute.get('/provider', async c => {
  const provider = await getActiveProvider();
  return c.json({ provider });
});

// Set active provider
modelsRoute.post(
  '/provider',
  zValidator('json', z.object({ provider: z.enum(['ollama', 'lmstudio']) })),
  async c => {
    const { provider } = c.req.valid('json');
    const db = getDb();

    await db
      .insert(config)
      .values({ key: 'provider', value: provider })
      .onConflictDoUpdate({ target: config.key, set: { value: provider } })
      .run();

    return c.json({ ok: true, provider });
  }
);

// Check provider status
modelsRoute.get('/provider/status', async c => {
  const provider = await getActiveProvider();

  try {
    if (provider === 'lmstudio') {
      const running = await lmstudio.checkServerStatus();
      return c.json({ provider, running, url: 'http://localhost:1234' });
    } else {
      const models = await ollama.listModels();
      return c.json({
        provider,
        running: true,
        url: 'http://localhost:11434',
        modelCount: models.length,
      });
    }
  } catch (error: any) {
    return c.json({ provider, running: false, error: error.message });
  }
});

export default modelsRoute;
