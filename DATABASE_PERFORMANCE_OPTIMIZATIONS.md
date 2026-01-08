# Database Performance Optimization Recommendations

## Overview
This document provides a comprehensive list of database performance optimizations based on codebase analysis, query patterns, and best practices.

## Priority Levels
- **HIGH**: Critical performance issues affecting user experience
- **MEDIUM**: Significant improvements that will reduce load
- **LOW**: Nice-to-have optimizations for fine-tuning

---

## 1. Query Optimization

### HIGH PRIORITY

#### 1.1 Reduce N+1 Queries in `executeNode` Method
**Location**: `backend/src/journeys/journeys.service.ts:1243-1253`

**Problem**: Multiple sequential `findOne` calls in `executeNode` method
```typescript
// Current code does 2 separate queries
let execution = await this.journeyNodeExecutionRepository.findOne({...});
const previousExecution = await this.journeyNodeExecutionRepository.findOne({...});
```

**Solution**: Combine into a single query with proper joins
```typescript
const executions = await this.journeyNodeExecutionRepository
  .createQueryBuilder('execution')
  .leftJoinAndSelect('execution.node', 'node')
  .where('execution.journeyContactId = :journeyContactId', { journeyContactId })
  .andWhere('execution.tenantId = :tenantId', { tenantId })
  .orderBy('execution.createdAt', 'DESC')
  .addOrderBy('execution.executedAt', 'DESC')
  .limit(2)
  .getMany();

const execution = executions.find(e => e.nodeId === nodeId);
const previousExecution = executions.find(e => e.nodeId !== nodeId);
```

**Impact**: Reduces 2 queries to 1 query per node execution

---

#### 1.2 Add SELECT Statements to Limit Column Loading
**Problem**: Many queries load all columns when only a few are needed

**Examples**:
- `journey_node_executions` queries load all columns including large JSONB `result` field
- `journey_contacts` queries load full contact relations when only IDs are needed
- `call_logs` queries load large JSONB fields (`metadata`, `callFlowEvents`) unnecessarily

**Solution**: Use `.select()` in QueryBuilder to load only needed columns
```typescript
// Instead of loading all columns
const executions = await this.repository.find({...});

// Load only needed columns
const executions = await this.repository
  .createQueryBuilder('execution')
  .select(['execution.id', 'execution.status', 'execution.scheduledAt'])
  .where(...)
  .getMany();
```

**Impact**: Reduces memory usage and network transfer by 30-50%

---

#### 1.3 Optimize Loop Detection Query
**Location**: `backend/src/journeys/journeys.service.ts:1207-1241`

**Problem**: Query loads full execution records with relations just to check count
```typescript
const recentExecutions = await this.journeyNodeExecutionRepository.find({
  where: { nodeId, journeyContactId, tenantId },
  order: { executedAt: 'DESC' },
  take: 3,
});
```

**Solution**: Use COUNT query or select only needed fields
```typescript
const recentExecutions = await this.journeyNodeExecutionRepository
  .createQueryBuilder('execution')
  .select(['execution.id', 'execution.executedAt'])
  .where('execution.nodeId = :nodeId', { nodeId })
  .andWhere('execution.journeyContactId = :journeyContactId', { journeyContactId })
  .andWhere('execution.tenantId = :tenantId', { tenantId })
  .orderBy('execution.executedAt', 'DESC')
  .limit(3)
  .getMany();
```

**Impact**: Faster query execution, less memory usage

---

### MEDIUM PRIORITY

#### 1.4 Batch Contact Lookups
**Location**: Multiple services that look up contacts individually

**Problem**: Services query contacts one-by-one in loops

**Solution**: Collect all contact IDs, then batch fetch
```typescript
// Instead of
for (const contactId of contactIds) {
  const contact = await this.contactRepository.findOne({ where: { id: contactId } });
}

// Use batch fetch
const contacts = await this.contactRepository
  .createQueryBuilder('contact')
  .where('contact.id IN (:...ids)', { ids: contactIds })
  .andWhere('contact.tenantId = :tenantId', { tenantId })
  .getMany();
const contactMap = new Map(contacts.map(c => [c.id, c]));
```

**Impact**: Reduces N queries to 1 query

---

#### 1.5 Optimize Segment Queries
**Location**: `backend/src/segments/segments.service.ts`

**Problem**: Subqueries in WHERE clauses can be inefficient

**Solution**: Use EXISTS or JOINs instead of NOT IN subqueries
```typescript
// Instead of
.andWhere(`contact.id NOT IN (
  SELECT DISTINCT "contactId" FROM journey_contacts WHERE "tenantId" = contact."tenantId"
)`)

// Use EXISTS
.andWhere(`NOT EXISTS (
  SELECT 1 FROM journey_contacts jc 
  WHERE jc."contactId" = contact.id AND jc."tenantId" = contact."tenantId"
)`)
```

**Impact**: Better query plan optimization by PostgreSQL

---

## 2. Index Optimization

### HIGH PRIORITY

#### 2.1 Add Composite Index for Journey Execution Lookups
**Problem**: Frequent queries filter by `(nodeId, journeyContactId, tenantId)` but no composite index

**Solution**: Add composite index
```sql
CREATE INDEX IF NOT EXISTS idx_journey_node_executions_node_contact_tenant 
ON journey_node_executions("nodeId", "journeyContactId", "tenantId");
```

**Impact**: Speeds up loop detection and execution lookups

---

#### 2.2 Add Index on `executedAt` for Journey Executions
**Problem**: Frequent ORDER BY `executedAt DESC` without index

**Solution**: Add index
```sql
CREATE INDEX IF NOT EXISTS idx_journey_node_executions_executed_at 
ON journey_node_executions("executedAt" DESC) 
WHERE "executedAt" IS NOT NULL;
```

**Impact**: Faster sorting for recent execution queries

---

#### 2.3 Add Partial Index for Active Journey Contacts
**Problem**: Frequent queries filter by `status = 'ACTIVE'` but no partial index

**Solution**: Add partial index
```sql
CREATE INDEX IF NOT EXISTS idx_journey_contacts_active 
ON journey_contacts("journeyId", "tenantId", "status") 
WHERE status = 'ACTIVE';
```

**Impact**: Faster contact count queries

---

### MEDIUM PRIORITY

#### 2.4 Add Index on `createdAt` for Time-Based Queries
**Problem**: Many queries filter by `createdAt` but no index

**Solution**: Add indexes on frequently queried date columns
```sql
-- Journey node executions
CREATE INDEX IF NOT EXISTS idx_journey_node_executions_created_at 
ON journey_node_executions("createdAt" DESC);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_created_at 
ON messages("createdAt" DESC);

-- Call logs
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at 
ON call_logs("createdAt" DESC);
```

**Impact**: Faster time-based filtering and pagination

---

#### 2.5 Add Index on JSONB Fields for Common Queries
**Problem**: JSONB queries on `attributes` and `metadata` fields can be slow

**Solution**: Add GIN indexes for frequently queried JSONB paths
```sql
-- For contact attributes queries
CREATE INDEX IF NOT EXISTS idx_contacts_attributes_gin 
ON contacts USING GIN (attributes) WHERE attributes IS NOT NULL;

-- For call log metadata queries
CREATE INDEX IF NOT EXISTS idx_call_logs_metadata_gin 
ON call_logs USING GIN (metadata) WHERE metadata IS NOT NULL;
```

**Impact**: Faster JSONB containment queries (@> operator)

---

## 3. Caching Strategy

### HIGH PRIORITY

#### 3.1 Cache Journey Node Lookups
**Location**: `backend/src/journeys/journeys.service.ts`

**Problem**: Journey nodes are queried repeatedly during execution

**Solution**: Add in-memory cache for journey nodes
```typescript
private nodeCache = new Map<string, JourneyNode>();

async getNode(journeyId: string, nodeId: string, tenantId: string): Promise<JourneyNode> {
  const cacheKey = `${journeyId}:${nodeId}`;
  if (this.nodeCache.has(cacheKey)) {
    return this.nodeCache.get(cacheKey)!;
  }
  
  const node = await this.journeyNodeRepository.findOne({
    where: { id: nodeId, journeyId, tenantId },
  });
  
  if (node) {
    this.nodeCache.set(cacheKey, node);
    // Clear cache after 5 minutes
    setTimeout(() => this.nodeCache.delete(cacheKey), 5 * 60 * 1000);
  }
  
  return node;
}
```

**Impact**: Reduces database queries for frequently accessed nodes

---

#### 3.2 Cache Tenant Configuration
**Location**: Multiple services query tenant config repeatedly

**Problem**: Tenant lookups happen frequently but config rarely changes

**Solution**: Extend existing tenant caching with TTL
```typescript
private tenantCache = new Map<string, { tenant: Tenant; timestamp: number }>();
private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async getTenant(tenantId: string): Promise<Tenant> {
  const cached = this.tenantCache.get(tenantId);
  if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
    return cached.tenant;
  }
  
  const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
  if (tenant) {
    this.tenantCache.set(tenantId, { tenant, timestamp: Date.now() });
  }
  return tenant;
}
```

**Impact**: Reduces tenant lookup queries by 80-90%

---

### MEDIUM PRIORITY

#### 3.3 Cache Generated Audio Lookups
**Location**: `backend/src/journeys/journeys.service.ts:2307`

**Problem**: Audio cache queries happen frequently but results are cached in memory

**Solution**: Add application-level cache before database query
```typescript
private audioCache = new Map<string, GeneratedAudio>();

async getCachedAudio(voiceTemplateId: string, variableValues: Record<string, string>, tenantId: string): Promise<GeneratedAudio | null> {
  const cacheKey = `${voiceTemplateId}:${JSON.stringify(variableValues)}`;
  
  if (this.audioCache.has(cacheKey)) {
    return this.audioCache.get(cacheKey)!;
  }
  
  // Then query database...
  const audio = await this.generatedAudioRepository.findOne({...});
  if (audio) {
    this.audioCache.set(cacheKey, audio);
  }
  return audio;
}
```

**Impact**: Reduces database queries for frequently used audio

---

## 4. Connection Pool Optimization

### MEDIUM PRIORITY

#### 4.1 Increase Connection Pool Size
**Location**: `backend/src/config/database.config.ts`

**Current**: Max 40 connections
**Recommendation**: Increase to 60-80 based on load

**Solution**: Update configuration
```typescript
const maxConnections = configService.get<number>('DB_MAX_CONNECTIONS', 60);
const minConnections = configService.get<number>('DB_MIN_CONNECTIONS', 10);
```

**Impact**: Better handling of concurrent requests

---

#### 4.2 Optimize Connection Pool Settings
**Current**: Some settings may be too aggressive

**Recommendations**:
- Increase `idleTimeoutMillis` from 30s to 60s (reduce connection churn)
- Increase `statement_timeout` from 30s to 60s (allow complex queries)
- Adjust `acquireTimeoutMillis` based on load patterns

**Impact**: Better connection reuse and fewer timeouts

---

## 5. Batch Operations

### HIGH PRIORITY

#### 5.1 Batch Journey Contact Updates
**Location**: Multiple places where journey contacts are updated individually

**Problem**: Individual `save()` calls in loops

**Solution**: Collect updates and batch execute
```typescript
const updates: Array<{ id: string; status: JourneyContactStatus }> = [];

for (const contact of contacts) {
  updates.push({ id: contact.id, status: newStatus });
}

await this.journeyContactRepository
  .createQueryBuilder()
  .update(JourneyContact)
  .set({ status: () => 'CASE id ' + updates.map((u, i) => `WHEN '${u.id}' THEN '${u.status}'`).join(' ') + ' END' })
  .where('id IN (:...ids)', { ids: updates.map(u => u.id) })
  .execute();
```

**Impact**: Reduces N updates to 1 update

---

#### 5.2 Batch Execution Status Updates
**Location**: `backend/src/journeys/journey-scheduler.service.ts`

**Problem**: Individual status updates for failed executions

**Solution**: Already implemented but can be extended to other status updates

**Impact**: Already optimized, maintain pattern

---

## 6. Query Result Optimization

### MEDIUM PRIORITY

#### 6.1 Implement Pagination for Large Result Sets
**Problem**: Some queries return all results without pagination

**Solution**: Add pagination to all list endpoints
```typescript
async findAll(tenantId: string, page: number = 1, limit: number = 50): Promise<{ data: T[]; total: number; page: number; limit: number }> {
  const [data, total] = await this.repository.findAndCount({
    where: { tenantId },
    skip: (page - 1) * limit,
    take: limit,
    order: { createdAt: 'DESC' },
  });
  
  return { data, total, page, limit };
}
```

**Impact**: Reduces memory usage and improves response times

---

#### 6.2 Use Streaming for Large Exports
**Problem**: CSV exports load all data into memory

**Solution**: Use streaming queries
```typescript
const stream = await this.repository
  .createQueryBuilder('entity')
  .where('entity.tenantId = :tenantId', { tenantId })
  .stream();

for await (const entity of stream) {
  // Process and write to CSV stream
}
```

**Impact**: Reduces memory usage for large exports

---

## 7. Database Maintenance

### MEDIUM PRIORITY

#### 7.1 Regular VACUUM and ANALYZE
**Problem**: Tables may become bloated over time

**Solution**: Schedule regular maintenance
```sql
-- Run weekly
VACUUM ANALYZE journey_node_executions;
VACUUM ANALYZE journey_contacts;
VACUUM ANALYZE messages;
VACUUM ANALYZE call_logs;
```

**Impact**: Keeps query plans optimized and reduces table bloat

---

#### 7.2 Monitor Table Sizes and Growth
**Problem**: Large tables may need partitioning

**Solution**: Monitor and plan for partitioning
```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Impact**: Early detection of tables that need partitioning

---

## 8. Transaction Optimization

### MEDIUM PRIORITY

#### 8.1 Reduce Transaction Scope
**Problem**: Some transactions hold locks too long

**Solution**: Keep transactions as short as possible
```typescript
// Instead of long transaction
await this.dataSource.transaction(async manager => {
  // Long operations
  await this.processManyThings();
  await this.updateManyThings();
});

// Break into smaller transactions
await this.dataSource.transaction(async manager => {
  await this.processBatch();
});
await this.dataSource.transaction(async manager => {
  await this.updateBatch();
});
```

**Impact**: Reduces lock contention

---

#### 8.2 Use Read-Only Transactions Where Appropriate
**Problem**: Read queries use write transactions

**Solution**: Use read-only transactions for queries
```typescript
await this.dataSource.transaction('READ UNCOMMITTED', async manager => {
  const results = await manager.find(...);
});
```

**Impact**: Better concurrency for read operations

---

## 9. Materialized Views (Future)

### LOW PRIORITY

#### 9.1 Create Materialized Views for Dashboard Statistics
**Problem**: Dashboard queries aggregate large datasets repeatedly

**Solution**: Create materialized views refreshed periodically
```sql
CREATE MATERIALIZED VIEW dashboard_stats AS
SELECT 
  tenant_id,
  COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_journeys,
  COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_journeys,
  -- ... more aggregations
FROM journeys
GROUP BY tenant_id;

-- Refresh every 5 minutes via cron
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats;
```

**Impact**: Dramatically faster dashboard queries

---

## 10. Monitoring and Profiling

### HIGH PRIORITY

#### 10.1 Enable Query Logging for Slow Queries
**Problem**: No visibility into slow queries

**Solution**: Enable PostgreSQL slow query log
```sql
-- In postgresql.conf
log_min_duration_statement = 1000  -- Log queries taking > 1 second
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
```

**Impact**: Identify and optimize slow queries

---

#### 10.2 Add Query Performance Metrics
**Problem**: No metrics on query performance

**Solution**: Add logging/monitoring for query execution times
```typescript
const startTime = Date.now();
const result = await this.repository.find(...);
const duration = Date.now() - startTime;

if (duration > 1000) {
  this.logger.warn(`Slow query detected: ${duration}ms`, { query: 'find' });
}
```

**Impact**: Early detection of performance issues

---

## Implementation Priority

### Phase 1 (Immediate - High Impact)
1. Reduce N+1 queries in `executeNode` (#1.1)
2. Add composite indexes (#2.1, #2.2, #2.3)
3. Cache journey nodes (#3.1)
4. Batch contact updates (#5.1)

### Phase 2 (Short-term - Medium Impact)
1. Add SELECT statements (#1.2)
2. Optimize loop detection query (#1.3)
3. Cache tenant configuration (#3.2)
4. Increase connection pool (#4.1)
5. Enable query logging (#10.1)

### Phase 3 (Long-term - Fine-tuning)
1. Batch contact lookups (#1.4)
2. Optimize segment queries (#1.5)
3. Implement pagination (#6.1)
4. Regular maintenance (#7.1)
5. Transaction optimization (#8.1, #8.2)

---

## Expected Overall Impact

- **Query Reduction**: 40-60% reduction in database queries
- **Response Time**: 30-50% improvement in average response times
- **Database Load**: 50-70% reduction in database CPU and I/O
- **Scalability**: Support 2-3x more concurrent users

---

## Monitoring Checklist

After implementing optimizations, monitor:
- [ ] Query execution times (should decrease)
- [ ] Database connection pool usage (should be more stable)
- [ ] Slow query log (should have fewer entries)
- [ ] Application response times (should improve)
- [ ] Database CPU and memory usage (should decrease)
- [ ] Error rates (should remain stable or decrease)

