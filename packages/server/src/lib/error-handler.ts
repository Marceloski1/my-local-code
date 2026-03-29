import type { ErrorContext, ErrorResponse } from '@agent/shared';

/**
 * Base class for application errors
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public context?: ErrorContext,
    public suggestion?: string
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error when Ollama is not available
 */
export class OllamaNotAvailableError extends AppError {
  constructor(context?: ErrorContext) {
    super(
      'Ollama no está disponible en http://localhost:11434',
      'OLLAMA_NOT_AVAILABLE',
      503,
      context,
      "Inicia Ollama con 'ollama serve'"
    );
    this.name = 'OllamaNotAvailableError';
  }
}

/**
 * Error when a model is not found
 */
export class ModelNotFoundError extends AppError {
  constructor(modelName: string, context?: ErrorContext) {
    super(
      `Modelo ${modelName} no encontrado. Descárgalo primero`,
      'MODEL_NOT_FOUND',
      404,
      context,
      `Descarga el modelo con 'ollama pull ${modelName}'`
    );
    this.name = 'ModelNotFoundError';
  }
}

/**
 * Error during tool execution
 */
export class ToolExecutionError extends AppError {
  constructor(toolName: string, message: string, context?: ErrorContext) {
    super(`Error ejecutando tool ${toolName}: ${message}`, 'TOOL_EXECUTION_ERROR', 500, context);
    this.name = 'ToolExecutionError';
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(`Error de base de datos: ${message}`, 'DATABASE_ERROR', 500, context);
    this.name = 'DatabaseError';
  }
}

/**
 * Execute health check on Ollama
 */
export async function executeHealthCheck(): Promise<{ alive: boolean; reason?: string }> {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      return { alive: true };
    }

    return {
      alive: false,
      reason: 'Ollama respondió pero con error',
    };
  } catch (error) {
    return {
      alive: false,
      reason: 'Ollama no responde',
    };
  }
}

/**
 * Handle Ollama errors and execute health check if needed
 */
export async function handleOllamaError(error: unknown, context: ErrorContext): Promise<AppError> {
  // If it's already an AppError, return it
  if (error instanceof AppError) {
    return error;
  }

  // Check if it's a connection error
  if (error instanceof Error) {
    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
      return new OllamaNotAvailableError(context);
    }

    // If it's an HTTP 500 error, execute health check
    if (error.message.includes('500')) {
      const healthCheck = await executeHealthCheck();

      if (!healthCheck.alive) {
        return new OllamaNotAvailableError({
          ...context,
          operation: 'health_check_after_500',
        });
      }

      // Ollama is alive but model failed - likely too large
      return new AppError(
        'El modelo puede ser demasiado grande para tu hardware',
        'MODEL_TOO_LARGE',
        500,
        context,
        'Intenta con un modelo más pequeño o aumenta la memoria disponible'
      );
    }

    // If it's a 404, it's a model not found
    if (error.message.includes('404') && context.modelName) {
      return new ModelNotFoundError(context.modelName, context);
    }
  }

  // Generic error
  return new AppError(
    error instanceof Error ? error.message : 'Error desconocido',
    'UNKNOWN_ERROR',
    500,
    context
  );
}

/**
 * Format AppError to ErrorResponse
 */
export function formatErrorResponse(error: AppError): ErrorResponse {
  return {
    error: error.code,
    message: error.message,
    context: error.context,
    suggestion: error.suggestion,
  };
}
