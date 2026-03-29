import { Context } from 'hono';
import { logger } from '../index.js';
import { logSSEConnection } from '../lib/logger.js';

export interface SSEEvent {
  sequence: number;
  type: string;
  data: any;
}

export const streamSSE = (c: Context, cb: (stream: any) => Promise<void>, sessionId?: string) => {
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');

  // Log SSE connection opened
  if (sessionId) {
    logSSEConnection(logger, sessionId, 'open');
  }

  return c.body(
    new ReadableStream({
      async start(controller) {
        let sequence = 0;
        const sseStream = {
          sendEvent: async (type: string, data: any) => {
            const payload = JSON.stringify({ sequence: sequence++, type, data });
            controller.enqueue(new TextEncoder().encode(`data: ${payload}\n\n`));
          },
          close: async () => {
            // Log SSE connection closed
            if (sessionId) {
              logSSEConnection(logger, sessionId, 'close');
            }
            controller.close();
          },
        };
        try {
          await cb(sseStream);
        } catch (e) {
          // Log SSE connection closed on error
          if (sessionId) {
            logSSEConnection(logger, sessionId, 'close');
          }
          controller.error(e);
        }
      },
    })
  );
};
