import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const isDevelopment = configService.get<string>('NODE_ENV') === 'development';
  
  // Connection pool settings - optimized for memory usage and idle system
  // Reduced pool size to prevent memory exhaustion and minimize idle connections
  const maxConnections = configService.get<number>('DB_MAX_CONNECTIONS', 30);
  const minConnections = configService.get<number>('DB_MIN_CONNECTIONS', 2); // Reduced from 5 to 2 for idle systems
  
  return {
    type: 'postgres',
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'sms_user'),
    password: configService.get<string>('DB_PASSWORD', 'sms_password'),
    database: configService.get<string>('DB_DATABASE', 'sms_platform'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize: false, // Disabled to prevent schema conflicts - use migrations instead
    logging: isDevelopment,
    ssl: configService.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
    // Add connection name to avoid conflicts
    name: 'default',
    // Retry connection settings
    retryAttempts: 10,
    retryDelay: 3000,
    autoLoadEntities: true,
    // Connection pool optimization - aggressive idle connection cleanup
    extra: {
      max: maxConnections, // Maximum number of connections
      min: minConnections, // Minimum number of connections (reduced to 2 for idle systems)
      idleTimeoutMillis: 10000, // Close idle connections after 10 seconds (reduced from 60s for faster cleanup)
      connectionTimeoutMillis: 15000, // Connection timeout
      // Statement timeout (prevent long-running queries from holding connections)
      statement_timeout: 60000, // 60 seconds - allows complex queries to complete
      // Query timeout
      query_timeout: 60000, // 60 seconds - allows complex queries to complete
      // Application name for monitoring
      application_name: 'sms-platform-backend',
      // Additional pool settings for better connection management
      acquireTimeoutMillis: 15000, // Time to wait for connection from pool
      reapIntervalMillis: 5000, // How often to check for idle connections (increased from 1s to 5s to reduce overhead)
      createTimeoutMillis: 10000, // Time to wait for new connection creation
      // Keep connections alive
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      // Force close idle connections more aggressively to prevent leaks
      evictionRunIntervalMillis: 5000, // Check for evictable connections every 5s (reduced from 10s)
      numTestsPerEvictionRun: 5, // Test more connections per eviction run (increased from 3)
      testOnBorrow: true, // Test connections before borrowing from pool
      testWhileIdle: true, // Test idle connections
      // Connection validation
      validationQuery: 'SELECT 1',
      validationQueryTimeout: 5000, // 5 second timeout for validation
    },
  };
};
