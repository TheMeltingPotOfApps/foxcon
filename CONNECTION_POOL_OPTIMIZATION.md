# Connection Pool Optimization Summary

## Changes Made

### Application-Level Pool Settings (TypeORM)

**File**: `backend/src/config/database.config.ts`

**Previous Settings:**
- Max connections: 20
- Min connections: 5
- Idle timeout: 30 seconds
- Connection timeout: 10 seconds
- Query timeout: 30 seconds

**New Settings:**
- **Max connections: 50** (2.5x increase)
- **Min connections: 10** (2x increase)
- **Idle timeout: 60 seconds** (2x increase)
- **Connection timeout: 15 seconds** (1.5x increase)
- **Query timeout: 60 seconds** (2x increase)
- **Retry attempts: 15** (increased from 10)
- **Retry delay: 2 seconds** (reduced from 3s for faster recovery)

**Additional Optimizations:**
- `acquireTimeoutMillis`: 30s - Time to wait for connection from pool
- `reapIntervalMillis`: 1s - How often to check for idle connections
- `createTimeoutMillis`: 30s - Time to wait for new connection creation
- `keepAlive`: true - Keep connections alive
- `keepAliveInitialDelayMillis`: 10s - Initial delay for keep-alive

### PostgreSQL Server-Level Optimization

**Script**: `backend/scripts/optimize-postgresql-pool.sh`

This script optimizes PostgreSQL server settings:
- Increases `max_connections` (default: 100 → recommended: 150-200)
- Optimizes `shared_buffers` based on RAM
- Calculates optimal `work_mem` based on max_connections
- Sets connection timeouts
- Configures statement timeouts

**To run PostgreSQL optimization:**
```bash
cd /root/SMS/backend
sudo ./scripts/optimize-postgresql-pool.sh
```

## Benefits

1. **Higher Throughput**: 50 concurrent connections vs 20 (2.5x capacity)
2. **Better Availability**: More connections available during peak load
3. **Faster Recovery**: Reduced retry delay means faster reconnection
4. **Longer Query Support**: 60s timeout allows complex queries to complete
5. **Connection Reuse**: Keep-alive prevents unnecessary connection churn

## Monitoring

### Check Current Connections
```sql
SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'sms_platform';
```

### Check Pool Usage
```sql
SELECT 
  datname,
  count(*) as connections,
  max_conn as max_connections
FROM pg_stat_database 
JOIN pg_database ON pg_stat_database.datid = pg_database.oid
WHERE datname = 'sms_platform';
```

### Monitor Connection Pool in Application
Check backend logs for connection pool messages:
```bash
tail -f /tmp/backend.log | grep -i "connection\|pool"
```

## Environment Variables

You can override pool settings via `.env`:

```env
DB_MAX_CONNECTIONS=50
DB_MIN_CONNECTIONS=10
```

## Recommended Next Steps

1. **Monitor Performance**: Watch connection usage and query performance
2. **Optimize PostgreSQL**: Run `optimize-postgresql-pool.sh` if not done
3. **Consider pgBouncer**: For even better connection management with Asterisk
4. **Separate Databases**: Migrate to separate database instance (see `DATABASE_MIGRATION_GUIDE.md`)

## Troubleshooting

**Error: "too many connections"**
- Increase PostgreSQL `max_connections`
- Run `optimize-postgresql-pool.sh`
- Consider reducing application pool size

**Slow queries**
- Check query timeouts (now 60s)
- Review slow query log
- Optimize queries with indexes

**Connection leaks**
- Monitor active connections
- Check for unclosed connections in code
- Review connection pool metrics

