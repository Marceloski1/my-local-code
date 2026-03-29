import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { sessions, messages, config } from '../db/schema.js';
import { streamSSE } from '../middleware/sse.js';
import { runAgent } from '../agent/loop.js';
import type { Message } from '@agent/shared';

const app = new Hono();

// Schema for sending a message
const sendMessageSchema = z.object({
  content: z.string().min(1),
});

// Schema for permission response
const permissionResponseSchema = z.object({
  granted: z.boolean(),
});

/**
 * POST /api/sessions/:id/messages
 * Send a message and stream the agent's response via SSE
 */
app.post('/:id/messages', zValidator('json', sendMessageSchema), async c => {
  const { id: sessionId } = c.req.param();
  const { content } = c.req.valid('json');
  const db = getDb();

  // Check if session exists
  const session = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);

  if (session.length === 0) {
    return c.json({ error: 'Session not found' }, 404);
  }

  // Get active model from config
  const configResult = await db.select().from(config).where(eq(config.key, 'activeModel')).limit(1);

  if (configResult.length === 0 || !configResult[0].value) {
    return c.json({ error: 'No active model configured' }, 400);
  }

  const activeModel = configResult[0].value;

  // Get active provider from config
  const providerResult = await db.select().from(config).where(eq(config.key, 'provider')).limit(1);
  const providerType = (providerResult.length > 0 ? providerResult[0].value : 'ollama') as
    | 'ollama'
    | 'lmstudio';

  // Create AI provider
  const { createAIProvider } = await import('../ai/provider.js');
  const provider = createAIProvider({
    type: providerType,
    baseURL: providerType === 'lmstudio' ? 'http://localhost:1234/v1' : 'http://localhost:11434/v1',
  });
  const model = provider(activeModel);

  // Get mode from config (default to 'plan')
  const modeResult = await db.select().from(config).where(eq(config.key, 'mode')).limit(1);

  const mode = (modeResult.length > 0 ? modeResult[0].value : 'plan') as 'plan' | 'build';

  // Load message history
  const messageHistory = await db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(messages.sequence);

  // Convert to Message format
  const history: Message[] = messageHistory.map(msg => ({
    id: msg.id,
    sessionId: msg.sessionId,
    role: msg.role as Message['role'],
    content: msg.content,
    toolName: msg.toolName || undefined,
    toolArgs: msg.toolArgs || undefined,
    toolResult: msg.toolResult || undefined,
    sequence: msg.sequence,
    createdAt: msg.createdAt,
  }));

  // Save user message
  const userMessage = {
    id: nanoid(),
    sessionId,
    role: 'user',
    content,
    sequence: history.length,
    createdAt: new Date().toISOString(),
  };

  await db.insert(messages).values(userMessage);

  // Update session updated_at and title if this is the first message
  const updateData: { updatedAt: string; title?: string } = {
    updatedAt: new Date().toISOString(),
  };

  // If this is the first user message, generate a title
  if (history.length === 0) {
    const { generateSessionTitle } = await import('../lib/session-title.js');
    updateData.title = generateSessionTitle(content);
  }

  await db.update(sessions).set(updateData).where(eq(sessions.id, sessionId));

  // Stream agent response
  return streamSSE(c, async stream => {
    try {
      let messageSequence = history.length + 1;
      let currentAssistantMessage = '';
      let currentMessageId: string | null = null;

      // Permission handler
      const onPermissionResponse = async (): Promise<boolean> => {
        // This will be handled by a separate endpoint
        // For now, we'll store the request and wait
        // In a real implementation, this would use a promise that resolves
        // when the user responds via POST /api/sessions/:id/permission
        return true; // Placeholder
      };

      // Run agent
      for await (const event of runAgent(
        history,
        content,
        {
          model,
          mode,
        },
        onPermissionResponse
      )) {
        // Send event to client
        await stream.sendEvent(event.type, event.data);

        // Persist events
        if (event.type === 'token') {
          currentAssistantMessage += event.data;
        } else if (event.type === 'tool_call') {
          // Save tool call message
          const toolCallMsg = {
            id: nanoid(),
            sessionId,
            role: 'tool_call',
            content: '',
            toolName: (event.data as any).toolName,
            toolArgs: JSON.stringify((event.data as any).args),
            sequence: messageSequence++,
            createdAt: new Date().toISOString(),
          };
          await db.insert(messages).values(toolCallMsg);
        } else if (event.type === 'tool_result') {
          // Save tool result message
          const toolResultMsg = {
            id: nanoid(),
            sessionId,
            role: 'tool_result',
            content: '',
            toolResult: JSON.stringify((event.data as any).result),
            sequence: messageSequence++,
            createdAt: new Date().toISOString(),
          };
          await db.insert(messages).values(toolResultMsg);
        } else if (event.type === 'done') {
          // Save final assistant message
          if (currentAssistantMessage) {
            const assistantMsg = {
              id: nanoid(),
              sessionId,
              role: 'assistant',
              content: currentAssistantMessage,
              sequence: messageSequence++,
              createdAt: new Date().toISOString(),
            };
            await db.insert(messages).values(assistantMsg);
          }
        }
      }

      await stream.close();
    } catch (error) {
      await stream.sendEvent('error', error instanceof Error ? error.message : 'Unknown error');
      await stream.close();
    }
  });
});

/**
 * POST /api/sessions/:id/permission
 * Respond to a permission request
 */
app.post('/:id/permission', zValidator('json', permissionResponseSchema), async c => {
  const { id: sessionId } = c.req.param();
  const { granted } = c.req.valid('json');

  // TODO: Implement permission handling
  // This would need to communicate with the running agent loop
  // For now, return success
  return c.json({ ok: true, granted });
});

export default app;
