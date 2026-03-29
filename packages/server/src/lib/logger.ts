import pino from 'pino';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LoggerOptions {
  level: LogLevel;
  pretty: boolean;
}

/**
 * Create a configured pino logger
 */
export function createLogger(options: LoggerOptions): pino.Logger {
  const transport = options.pretty
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined;

  return pino({
    level: options.level,
    transport,
  });
}

/**
 * Create logger from environment variables
 */
export function createLoggerFromEnv(): pino.Logger {
  const level = (process.env.LOG_LEVEL as LogLevel) || 'info';
  const pretty = process.env.NODE_ENV !== 'production';

  return createLogger({ level, pretty });
}

/**
 * Log HTTP request
 */
export function logRequest(
  logger: pino.Logger,
  req: { method: string; url: string },
  statusCode: number,
  durationMs: number
): void {
  logger.debug(
    {
      method: req.method,
      path: req.url,
      statusCode,
      durationMs,
    },
    'HTTP request'
  );
}

/**
 * Log tool call
 */
export function logToolCall(
  logger: pino.Logger,
  toolName: string,
  args: unknown,
  result: unknown
): void {
  logger.debug(
    {
      toolName,
      args,
      result,
    },
    'Tool call executed'
  );
}

/**
 * Log SSE connection
 */
export function logSSEConnection(
  logger: pino.Logger,
  sessionId: string,
  action: 'open' | 'close'
): void {
  logger.debug(
    {
      sessionId,
      action,
    },
    `SSE connection ${action}`
  );
}

/**
 * Log error with context
 */
export function logError(
  logger: pino.Logger,
  error: Error,
  context?: Record<string, unknown>
): void {
  logger.error(
    {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      ...context,
    },
    'Error occurred'
  );
}
