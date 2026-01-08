# Transfer Metrics Validation

## Overview
This document validates that the system properly captures, joins, and displays transfer count and success metrics.

## Data Flow

### 1. Transfer Event Capture
**Location**: `backend/src/asterisk/ami-event-listener.service.ts`

**Events Captured**:
- `TransferAttempt` - When a transfer is initiated
- `TransferConnected` - When transfer succeeds (status: 'completed')
- `TransferFailed` - When transfer fails (status: 'failed')
- `TransferBusy` - When transfer number is busy
- `TransferNoAnswer` - When transfer number doesn't answer

**Storage**: Transfer status is stored in `call_logs.metadata.transferStatus`

### 2. Call Log Updates
**Location**: `backend/src/asterisk/ami-event-listener.service.ts::updateCallLogEvent()`

**Transfer Status Storage**:
```typescript
case 'TransferConnected':
  updateData.metadata = {
    ...callLog.metadata,
    transferStatus: 'completed',
    transferBillableSeconds: eventData.duration || 0,
  };
  break;

case 'TransferFailed':
  updateData.metadata = {
    ...callLog.metadata,
    transferStatus: 'failed',
  };
  break;
```

### 3. Journey Execution Integration
**Location**: `backend/src/journeys/journeys.service.ts`

**Transfer Status Usage**:
- Line 1472: Checks `recentAnsweredCall.metadata?.transferStatus === 'completed'` for follow-up timing
- Line 1969: Uses transfer status in condition evaluation: `relevantCall?.metadata?.transferStatus === 'completed'`

### 4. Dashboard Metrics Calculation
**Location**: `backend/src/dashboard/dashboard.service.ts`

**Metrics Calculated**:
1. **transfersAttempted**: Counts calls with `transferNumber IS NOT NULL`
   ```typescript
   const transfersAttempted = await this.callLogRepository
     .createQueryBuilder('call_log')
     .where('call_log.tenantId = :tenantId', { tenantId })
     .andWhere('call_log.transferNumber IS NOT NULL')
     .andWhere("call_log.transferNumber != ''")
     .getCount();
   ```

2. **transfersCompleted**: Counts calls with `metadata.transferStatus = 'completed'`
   ```typescript
   const transfersCompleted = await this.callLogRepository
     .createQueryBuilder('call_log')
     .where('call_log.tenantId = :tenantId', { tenantId })
     .andWhere("call_log.metadata->>'transferStatus' = 'completed'")
     .getCount();
   ```

3. **transferSuccessRate**: Calculated as `(transfersCompleted / transfersAttempted) * 100`

### 5. Dashboard Display
**Location**: `frontend/app/(app)/dashboard/page.tsx`

**UI Component**: New "Transfers Completed" card showing:
- Total transfers completed
- Transfers attempted count
- Success rate percentage

## Data Joins Validation

### Call Logs ↔ Journey Executions
**Join Key**: `call_logs.to` = `journey_contacts.contact.phoneNumber` + `call_logs.createdAt` (temporal)

**Validation Points**:
1. ✅ Transfer status stored in `call_logs.metadata.transferStatus`
2. ✅ Journey execution checks transfer status for follow-up timing
3. ✅ Journey conditions can evaluate transfer status
4. ✅ Dashboard aggregates transfer metrics from call logs

### Execution Results ↔ Call Logs
**Join Key**: Execution result stores `callId` or uses phone number + timestamp lookup

**Validation Points**:
1. ✅ Execution results can reference call logs via phone number
2. ✅ Transfer status accessible through call log metadata
3. ✅ Dashboard queries call logs directly (no join needed for aggregate metrics)

## SQL Queries for Validation

### Check Transfer Data Capture
```sql
-- Count calls with transfer attempts
SELECT COUNT(*) as transfer_attempts
FROM call_logs
WHERE "transferNumber" IS NOT NULL 
  AND "transferNumber" != '';

-- Count successful transfers
SELECT COUNT(*) as successful_transfers
FROM call_logs
WHERE metadata->>'transferStatus' = 'completed';

-- Count failed transfers
SELECT COUNT(*) as failed_transfers
FROM call_logs
WHERE metadata->>'transferStatus' = 'failed';

-- View sample transfer data
SELECT 
  id,
  "to",
  "transferNumber",
  metadata->>'transferStatus' as transfer_status,
  metadata->>'transferBillableSeconds' as transfer_duration,
  "createdAt"
FROM call_logs
WHERE "transferNumber" IS NOT NULL
ORDER BY "createdAt" DESC
LIMIT 10;
```

### Validate Dashboard Metrics
```sql
-- Verify dashboard query matches actual data
SELECT 
  COUNT(*) FILTER (WHERE "transferNumber" IS NOT NULL AND "transferNumber" != '') as transfers_attempted,
  COUNT(*) FILTER (WHERE metadata->>'transferStatus' = 'completed') as transfers_completed,
  CASE 
    WHEN COUNT(*) FILTER (WHERE "transferNumber" IS NOT NULL AND "transferNumber" != '') > 0
    THEN ROUND(
      (COUNT(*) FILTER (WHERE metadata->>'transferStatus' = 'completed')::numeric / 
       COUNT(*) FILTER (WHERE "transferNumber" IS NOT NULL AND "transferNumber" != '')) * 100
    )
    ELSE 0
  END as transfer_success_rate
FROM call_logs
WHERE "tenantId" = 'YOUR_TENANT_ID';
```

## Testing Checklist

- [ ] Transfer events are captured from Asterisk AMI
- [ ] Transfer status is stored in call_logs.metadata
- [ ] Dashboard service calculates transfer metrics correctly
- [ ] Dashboard UI displays transfer metrics
- [ ] Journey executions can access transfer status
- [ ] Transfer conditions work in journey routing
- [ ] Transfer metrics update in real-time (30s refresh)

## Known Issues / Limitations

1. **Transfer Attempt Detection**: Currently relies on `transferNumber` field being set. If transfers happen without this field, they won't be counted as attempts.

2. **Temporal Joins**: Journey execution lookups use phone number + time window, which may miss transfers if timing is off.

3. **Multiple Transfers**: If a call has multiple transfer attempts, only the final status is stored.

## Recommendations

1. **Add Transfer Event Logging**: Consider adding a separate `transfer_events` table to track all transfer attempts with timestamps.

2. **Link Executions to Call Logs**: Add `callLogId` to execution results for direct joins instead of phone number lookups.

3. **Real-time Updates**: Consider WebSocket updates for transfer metrics instead of polling every 30 seconds.

