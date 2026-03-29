import type { Server } from 'http';
import type { Database } from 'better-sqlite3';
import type pino from 'pino';

export interface ShutdownOptions {
  timeout: number; // Maximum time to wait in ms
  logger: pino.Logger;
}

export interface SSEConnection {
  id: string;
  close: () => void;
}

/**
 * Manages graceful shutdown of the server
 */
export class GracefulShutdown {
  private isShuttingDown: boolean = false;
  private activeConnections: Set<SSEConnection> = new Set();
  private pendingRequests: Set<Promise<unknown>> = new Set();

  constructor(
    private server: Server,
    private db: Database,
    private options: ShutdownOptions
  ) {}

  /**
   * Register an SSE connection
   */
  registerSSEConnection(conn: SSEConnection): void {
    this.activeConnections.add(conn);
  }

  /**
   * Unregister an SSE connection
   */
  unregisterSSEConnection(conn: SSEConnection): void {
    this.activeConnections.delete(conn);
  }

  /**
   * Track a pending request
   */
  trackRequest(promise: Promise<unknown>): void {
    this.pendingRequests.add(promise);
    promise.finally(() => {
      this.pendingRequests.delete(promise);
    });
  }

  /**
   * Perform graceful shutdown
   */
  async shutdown(signal: 'SIGINT' | 'SIGTERM'): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    this.options.logger.info({ signal }, 'Server shutting down gracefully...');

    try {
      // Step 1: Stop accepting new requests
      this.server.close();
      this.options.logger.debug('Server stopped accepting new requests');

      // Step 2: Wait for in-flight requests (with timeout)
      const requestsPromise = Promise.all(Array.from(this.pendingRequests));
      const timeoutPromise = new Promise(resolve => setTimeout(resolve, this.options.timeout));

      await Promise.race([requestsPromise, timeoutPromise]);

      if (this.pendingRequests.size > 0) {
        this.options.logger.warn(
          { pendingCount: this.pendingRequests.size },
          'Timeout waiting for requests, forcing shutdown'
        );
      } else {
        this.options.logger.debug('All in-flight requests completed');
      }

      // Step 3: Close all SSE connections
      for (const conn of this.activeConnections) {
        try {
          conn.close();
        } catch (error) {
          this.options.logger.error({ error, connId: conn.id }, 'Error closing SSE connection');
        }
      }
      this.options.logger.debug(
        { count: this.activeConnections.size },
        'Closed all SSE connections'
      );

      // Step 4: Close database connection
      this.db.close();
      this.options.logger.debug('Database connection closed');

      // Step 5: Log completion and exit
      this.options.logger.info('Server stopped');
      process.exit(0);
    } catch (error) {
      this.options.logger.error({ error }, 'Error during graceful shutdown');
      process.exit(1);
    }
  }
}
