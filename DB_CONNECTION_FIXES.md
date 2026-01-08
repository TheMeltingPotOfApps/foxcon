# Database Connection Pool Configuration

## Overview
The database connection pool is configured to support multiple services:
- **Backend API**: Main application server
- **Frontend**: API calls from web interface
- **Asterisk/FreePBX**: Call processing and event handling

## Current Configuration

### Connection Pool Settings

**File**: `backend/src/config/database.config.ts`

**Settings:**
- **Max connections**: 40 (supports backend + frontend + Asterisk)
- **Min connections**: 5 (maintains pool for quick access)
- **Idle timeout**: 30 seconds (closes idle connections quickly)
- **Connection timeout**: 10 seconds
- **Query timeout**: 30 seconds
- **Statement timeout**: 30 seconds (prevents long-running queries from holding connections)

**Benefits:**
- Sufficient connections for all services
- Fast connection cleanup to prevent leaks
- Connection validation to ensure health
- Aggressive idle connection cleanup

### 2. Improved Connection Pool Settings

**New Settings:**
- `evictionRunIntervalMillis`: 10000 (10 seconds) - Check for evictable connections more frequently
- `numTestsPerEvictionRun`: 3 - Test multiple connections per eviction run
- `testOnBorrow`: true - Test connections before borrowing from pool
- `testWhileIdle`: true - Test idle connections
- `validationQuery`: 'SELECT 1' - Validate connections before use
- `validationQueryTimeout`: 5000 - 5 second timeout for validation

**Benefits:**
- Detects and removes bad connections faster
- Prevents using stale connections
- Better connection health monitoring

### 3. Database Health Monitoring Service

**File**: `backend/src/database/database-health.service.ts`

**Features:**
- Automatic health checks every 30 seconds
- Monitors connection pool statistics
- Tracks PostgreSQL active connections
- Detects connection leaks
- Alerts on idle in transaction connections
- Logs warnings when pool is getting full

**Benefits:**
- Early detection of connection issues
- Better visibility into connection usage
- Helps identify connection leaks

### 4. Database Connection Management Scripts

**Scripts Created:**

1. **`backend/scripts/check-db-connections.sh`**
   - Shows current connection status
   - Lists active, idle, and idle-in-transaction connections
   - Shows connection details and queries
   - Displays PostgreSQL max_connections setting

2. **`backend/scripts/kill-idle-connections.sh`**
   - Kills connections idle in transaction for more than 5 minutes
   - Prevents connection leaks from accumulating
   - Can be run manually or via cron

**Usage:**
```bash
# Check connection status
cd /root/SMS/backend
./scripts/check-db-connections.sh

# Kill idle connections (use with caution)
./scripts/kill-idle-connections.sh
```

## Configuration

### Environment Variables

You can override pool settings via `.env`:

```env
DB_MAX_CONNECTIONS=40
DB_MIN_CONNECTIONS=5
```

**Note**: If you need more connections (e.g., for high-traffic scenarios), you can increase `DB_MAX_CONNECTIONS`, but ensure PostgreSQL `max_connections` is set appropriately (recommended: at least 2x your application pool size).

### Recommended PostgreSQL Settings

Ensure PostgreSQL `max_connections` is set appropriately:

```sql
-- Check current setting
SHOW max_connections;

-- Recommended: Set to at least 100-150
-- This allows for:
-- - 40 connections from backend application pool
-- - Additional connections for migrations, scripts, monitoring
-- - Headroom for peak usage (frontend + Asterisk + backend)
-- - Rule of thumb: PostgreSQL max_connections should be 2-3x application pool size
```

To optimize PostgreSQL settings, run:
```bash
cd /root/SMS/backend
sudo ./scripts/optimize-postgresql-pool.sh
```

## Monitoring

### Check Connection Pool Status

```bash
# Via script
./scripts/check-db-connections.sh

# Via SQL
psql -h localhost -U sms_user -d sms_platform -c "
SELECT 
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active_queries,
  count(*) FILTER (WHERE state = 'idle') as idle_connections,
  count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
FROM pg_stat_activity 
WHERE datname = 'sms_platform';
"
```

### Check for Connection Leaks

Look for connections in "idle in transaction" state:
```sql
SELECT 
  pid,
  usename,
  application_name,
  state,
  state_change,
  now() - state_change as idle_duration,
  LEFT(query, 100) as query_preview
FROM pg_stat_activity 
WHERE datname = 'sms_platform' 
  AND state = 'idle in transaction'
ORDER BY state_change;
```

### Application Logs

The DatabaseHealthService logs warnings when:
- Connection pool is getting full (>15 connections)
- High number of active connections (>15)
- Connections waiting for pool
- Idle in transaction connections detected

## Troubleshooting

### Error: "too many connections"

1. **Check current connections:**
   ```bash
   ./scripts/check-db-connections.sh
   ```

2. **Kill idle connections:**
   ```bash
   ./scripts/kill-idle-connections.sh
   ```

3. **Check PostgreSQL max_connections:**
   ```sql
   SHOW max_connections;
   ```

4. **If needed, increase PostgreSQL max_connections:**
   ```sql
   ALTER SYSTEM SET max_connections = 100;
   SELECT pg_reload_conf();
   ```

### High Number of Active Connections

1. **Check for long-running queries:**
   ```sql
   SELECT pid, now() - query_start as duration, query
   FROM pg_stat_activity
   WHERE state = 'active'
   ORDER BY query_start;
   ```

2. **Check for connection leaks:**
   - Look for "idle in transaction" connections
   - Check application logs for errors
   - Review code for unclosed transactions

3. **Check PostgreSQL max_connections** (ensure it's high enough):
   ```sql
   SHOW max_connections;
   -- Should be at least 100-150 for 40 connection pool
   ```

### Connection Pool Exhaustion

1. **Check waiting requests:**
   - Look for "waiting" in pool statistics
   - Check application logs for connection timeout errors

2. **Optimize queries:**
   - Reduce query timeouts
   - Optimize slow queries
   - Add database indexes

3. **Consider connection pooling middleware:**
   - pgBouncer for better connection management
   - Separate read/write pools

## Best Practices

1. **Always close connections:**
   - Use TypeORM repositories (automatically managed)
   - Avoid raw query runners without proper cleanup
   - Use transactions with proper commit/rollback

2. **Monitor connection usage:**
   - Set up alerts for high connection counts
   - Review connection statistics regularly
   - Check for connection leaks

3. **Optimize queries:**
   - Keep queries fast (<1 second ideally)
   - Use indexes appropriately
   - Avoid N+1 query problems
   - Use batch operations when possible

4. **Set appropriate timeouts:**
   - Query timeout: 30 seconds
   - Statement timeout: 30 seconds
   - Connection timeout: 10 seconds

## Files Modified

1. `backend/src/config/database.config.ts` - Reduced pool sizes and improved settings
2. `backend/src/database/database-health.service.ts` - New health monitoring service
3. `backend/src/database/database.module.ts` - Added health service
4. `backend/scripts/check-db-connections.sh` - New monitoring script
5. `backend/scripts/kill-idle-connections.sh` - New cleanup script

## Impact

**Configuration:**
- Max connections: 40 (supports frontend + Asterisk + backend)
- Min connections: 5 (maintains pool)
- Idle timeout: 30 seconds (fast cleanup)
- Better connection management
- Automatic health monitoring
- Connection leak detection

**Connection Allocation:**
- Backend API: ~15-20 connections
- Frontend API calls: ~10-15 connections
- Asterisk/FreePBX: ~5-10 connections
- Headroom: ~5-10 connections for peak usage

## Next Steps

1. **Monitor connection usage** for a few days
2. **Review logs** for connection warnings
3. **Optimize slow queries** if identified
4. **Consider pgBouncer** if connection issues persist
5. **Set up alerts** for high connection counts
