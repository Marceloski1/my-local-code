import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { nanoid } from 'nanoid';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { sessions, messages, sessionMetadata } from '../db/schema.js';

const app = new Hono();

// Schema for creating a session
const createSessionSchema = z.object({
  title: z.string().optional(),
});

// Schema for session response
const sessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * POST /api/sessions
 * Create a new session
 */
app.post('/', zValidator('json', createSessionSchema), async c => {
  const { title } = c.req.valid('json');
  const db = getDb();

  const now = new Date().toISOString();
  const session = {
    id: nanoid(),
    title: title || 'Nueva conversación',
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(sessions).values(session);

  return c.json(session, 201);
});

/**
 * GET /api/sessions
 * List all sessions ordered by updated_at DESC
 */
app.get('/', async c => {
  const db = getDb();

  const allSessions = await db.select().from(sessions).orderBy(desc(sessions.updatedAt));

  return c.json({ sessions: allSessions });
});

/**
 * GET /api/sessions/:id
 * Get session detail with messages
 */
app.get('/:id', async c => {
  const { id } = c.req.param();
  const db = getDb();

  // Get session
  const session = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);

  if (session.length === 0) {
    return c.json({ error: 'Session not found' }, 404);
  }

  // Get messages
  const sessionMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, id))
    .orderBy(messages.sequence);

  // Get metadata
  const metadata = await db.select().from(sessionMetadata).where(eq(sessionMetadata.sessionId, id));

  return c.json({
    session: session[0],
    messages: sessionMessages,
    metadata,
  });
});

/**
 * DELETE /api/sessions/:id
 * Delete a session (cascade deletes messages and metadata)
 */
app.delete('/:id', async c => {
  const { id } = c.req.param();
  const db = getDb();

  // Check if session exists
  const session = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);

  if (session.length === 0) {
    return c.json({ error: 'Session not found' }, 404);
  }

  // Delete session (cascade will delete messages and metadata)
  await db.delete(sessions).where(eq(sessions.id, id));

  return c.json({ ok: true });
});

export default app;
