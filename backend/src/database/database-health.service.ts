import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@Injectable()
export class DatabaseHealthService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseHealthService.name);
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectConnection()
    private connection: Connection,
  ) {}

  onModuleInit() {
    // Start health check every 30 seconds
    this.startHealthCheck();
  }

  private startHealthCheck() {
    this.healthCheckInterval = setInterval(async () => {
      await this.checkConnectionHealth();
    }, 30000); // Check every 30 seconds
  }

  private async checkConnectionHealth() {
    try {
      // Get pool statistics
      const pool = (this.connection.driver as any).master;
      
      if (pool) {
        const totalConnections = pool.totalCount || 0;
        const idleConnections = pool.idleCount || 0;
        const waitingRequests = pool.waitingCount || 0;
        const activeConnections = totalConnections - idleConnections;

        // Get min connections from config (default 2)
        const minConnections = 2; // Should match DB_MIN_CONNECTIONS default
        const maxConnections = 30; // Should match DB_MAX_CONNECTIONS default
        
        // Warn if pool is getting full (warn at 75% capacity)
        if (totalConnections > maxConnections * 0.75) {
          this.logger.warn(`Database connection pool getting full: ${totalConnections}/${maxConnections} active, ${idleConnections} idle, ${waitingRequests} waiting`);
        }

        // Warn if there are too many idle connections when system should be idle
        // If we have more than 2x the minimum connections and most are idle, log a warning
        if (totalConnections > minConnections * 2 && idleConnections > minConnections * 1.5 && activeConnections < 2) {
          this.logger.warn(`Too many idle database connections: ${totalConnections} total (${idleConnections} idle, ${activeConnections} active). Expected ~${minConnections} connections when idle. Connections should close after idle timeout.`);
        }

        // Check for connection leaks (too many active connections)
        if (activeConnections > maxConnections * 0.75) {
          this.logger.error(`High number of active database connections: ${activeConnections}/${maxConnections}. Possible connection leak detected.`);
        }

        // Log if there are waiting requests
        if (waitingRequests > 0) {
          this.logger.warn(`Database connection pool has ${waitingRequests} waiting requests. Consider increasing pool size or optimizing queries.`);
        }
      }

      // Check PostgreSQL active connections
      const result = await this.connection.query(`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_queries,
          count(*) FILTER (WHERE state = 'idle') as idle_connections,
          count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);

      if (result && result[0]) {
        const stats = result[0];
        const total = parseInt(stats.total_connections) || 0;
        const active = parseInt(stats.active_queries) || 0;
        const idle = parseInt(stats.idle_connections) || 0;
        const idleInTransaction = parseInt(stats.idle_in_transaction) || 0;

        // Warn if too many connections (warn at 75% of expected max)
        const maxConnections = 30; // Should match DB_MAX_CONNECTIONS default
        const minConnections = 2; // Should match DB_MIN_CONNECTIONS default
        
        if (total > maxConnections * 0.75) {
          this.logger.warn(`PostgreSQL connection stats: Total=${total}, Active=${active}, Idle=${idle}, IdleInTransaction=${idleInTransaction}`);
        }

        // Warn if too many idle connections when system should be idle
        if (total > minConnections * 2 && idle > minConnections * 1.5 && active < 2) {
          this.logger.warn(`PostgreSQL has too many idle connections: Total=${total}, Idle=${idle}, Active=${active}. Expected ~${minConnections} connections when idle.`);
        }

        // Alert on idle in transaction (potential connection leak)
        if (idleInTransaction > 0) {
          this.logger.error(`Found ${idleInTransaction} connections idle in transaction. This may indicate connection leaks or uncommitted transactions.`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to check database health: ${error.message}`);
    }
  }

  async getConnectionStats() {
    try {
      const pool = (this.connection.driver as any).master;
      const result = await this.connection.query(`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_queries,
          count(*) FILTER (WHERE state = 'idle') as idle_connections,
          count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
          count(*) FILTER (WHERE state = 'idle in transaction (aborted)') as aborted_transactions
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);

      return {
        pool: pool ? {
          total: pool.totalCount || 0,
          idle: pool.idleCount || 0,
          active: (pool.totalCount || 0) - (pool.idleCount || 0),
          waiting: pool.waitingCount || 0,
        } : null,
        postgresql: result && result[0] ? result[0] : null,
      };
    } catch (error) {
      this.logger.error(`Failed to get connection stats: ${error.message}`);
      return null;
    }
  }

  onModuleDestroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}
