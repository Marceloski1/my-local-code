import type { Context, Next } from 'hono';
import { AppError, formatErrorResponse } from '../lib/error-handler.js';
import { logger } from '../index.js';
import { logError } from '../lib/logger.js';

/**
 * Global error handler middleware for Hono
 */
export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    // Log the error
    if (error instanceof Error) {
      logError(logger, error, {
        path: c.req.url,
        method: c.req.method,
      });
    }

    // Handle AppError
    if (error instanceof AppError) {
      return c.json(formatErrorResponse(error), error.statusCode as any);
    }

    // Handle generic errors
    const genericError = new AppError(
      error instanceof Error ? error.message : 'Error interno del servidor',
      'INTERNAL_SERVER_ERROR',
      500,
      {
        operation: 'unknown',
      }
    );

    return c.json(formatErrorResponse(genericError), 500);
  }
}
