# Database Table Size Analysis

## Summary

**Total Database Size:** 78 MB

## Largest Tables

### 1. journey_node_executions - 29 MB ⚠️ **LARGEST**
- **Table Size:** 19 MB
- **Index Size:** 10 MB
- **Row Count:** 67,221 rows
- **Dead Rows:** 8,147 (12.12%)
- **Status:** ⚠️ Needs vacuuming
- **Recommendations:**
  - Run `VACUUM ANALYZE` to reclaim space
  - Consider archiving old completed executions (>90 days)
  - Consider partitioning by date if growth continues

### 2. asterisk_dids - 21 MB ⚠️ **BLOATED**
- **Table Size:** 13 MB
- **Index Size:** 8.4 MB
- **Row Count:** 0 rows
- **Status:** ⚠️ **CRITICAL - Empty but bloated, needs VACUUM FULL**
- **Recommendations:**
  - Run `VACUUM FULL` immediately to reclaim space
  - This table is wasting 21 MB of space

### 3. call_logs - 6.7 MB ✅
- **Table Size:** 3.4 MB
- **Index Size:** 3.3 MB
- **Row Count:** 2,356 rows
- **Dead Rows:** 37 (1.57%)
- **Status:** ✅ Healthy
- **Recommendations:**
  - Regular vacuuming (auto-vacuum is working)
  - Consider archiving old call logs (>6 months)

### 4. tcpa_violations - 2.9 MB ⚠️ **BLOATED**
- **Table Size:** 2.3 MB
- **Index Size:** 664 KB
- **Row Count:** 0 rows
- **Status:** ⚠️ **Empty but bloated, needs VACUUM FULL**
- **Recommendations:**
  - Run `VACUUM FULL` to reclaim space

### 5. journey_contacts - 1.5 MB ✅
- **Table Size:** 864 KB
- **Index Size:** 608 KB
- **Row Count:** 2,535 rows
- **Dead Rows:** 38 (1.50%)
- **Status:** ✅ Healthy

### 6. contacts - 1.2 MB ✅
- **Table Size:** 600 KB
- **Index Size:** 560 KB
- **Row Count:** 2,863 rows
- **Dead Rows:** 193 (6.74%)
- **Status:** ⚠️ Moderate dead rows
- **Recommendations:**
  - Run `VACUUM ANALYZE`

## Tables with High Dead Row Percentage

1. **lead_ingestion_endpoints** - 700% dead rows (5 live, 35 dead)
   - Needs immediate attention
   - Run `VACUUM FULL`

2. **journeys** - 136% dead rows (36 live, 49 dead)
   - Needs vacuuming
   - Run `VACUUM ANALYZE`

3. **journey_node_executions** - 12.12% dead rows
   - Needs vacuuming
   - Run `VACUUM ANALYZE`

4. **generated_audio** - 12.79% dead rows
   - Needs vacuuming
   - Run `VACUUM ANALYZE`

5. **journey_nodes** - 13.59% dead rows
   - Needs vacuuming
   - Run `VACUUM ANALYZE`

## Immediate Actions Required

### 1. Vacuum Bloated Empty Tables
```bash
cd /root/SMS/backend
./scripts/vacuum-large-tables.sh
```

This will:
- Vacuum `journey_node_executions` (reclaim ~2-3 MB)
- VACUUM FULL `asterisk_dids` (reclaim ~21 MB)
- VACUUM FULL `tcpa_violations` (reclaim ~2.9 MB)
- Vacuum other tables with dead rows

**Expected space reclaimed:** ~26-27 MB (34% reduction)

### 2. Set Up Regular Vacuuming

PostgreSQL auto-vacuum should handle this, but you can verify:
```sql
SELECT * FROM pg_settings WHERE name LIKE 'autovacuum%';
```

### 3. Consider Data Archiving

For `journey_node_executions`:
- Archive completed executions older than 90 days
- Keep only recent executions for active journeys
- This could reduce table size by 50-70%

## Optimization Scripts

1. **Check table sizes:**
   ```bash
   cd /root/SMS/backend
   ./scripts/check-table-sizes.sh
   ```

2. **Vacuum large tables:**
   ```bash
   cd /root/SMS/backend
   ./scripts/vacuum-large-tables.sh
   ```

## Monitoring

### Check Dead Rows Regularly
```sql
SELECT 
  schemaname,
  relname AS table_name,
  n_live_tup AS live_rows,
  n_dead_tup AS dead_rows,
  ROUND((n_dead_tup::numeric / NULLIF(n_live_tup, 0)) * 100, 2) AS dead_row_percentage
FROM pg_stat_user_tables
WHERE n_dead_tup > 100
ORDER BY n_dead_tup DESC;
```

### Check Table Growth
```sql
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size,
  (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = tablename) AS rows
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC
LIMIT 10;
```

## Recommendations Summary

1. ✅ **Immediate:** Run vacuum script to reclaim ~27 MB
2. ✅ **Short-term:** Set up regular vacuuming schedule
3. ✅ **Medium-term:** Implement data archiving for `journey_node_executions`
4. ✅ **Long-term:** Consider partitioning for `journey_node_executions` if it grows beyond 100 MB

## Expected Results After Vacuuming

- **Database size:** 78 MB → ~50-52 MB (33% reduction)
- **journey_node_executions:** 29 MB → ~26 MB
- **asterisk_dids:** 21 MB → ~0 MB (empty table)
- **tcpa_violations:** 2.9 MB → ~0 MB (empty table)
- **Overall:** Much better performance and disk usage

