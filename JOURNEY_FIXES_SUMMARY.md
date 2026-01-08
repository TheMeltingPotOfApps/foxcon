# Journey Display and Execution Fixes

## Issues Identified

1. **Journeys showing "0 leads enrolled"** - Frontend was checking `journey.contacts.length` but backend optimization returns empty `contacts` array
2. **Journeys not executing actions** - Need to verify scheduler is running and executions are being processed

## Fixes Applied

### 1. Frontend Hook Fix (`frontend/lib/hooks/use-journeys.ts`)

**Problem**: Frontend hooks were overriding `contactsCount` from backend by calculating from `journey.contacts?.length || 0`, which was always 0 since contacts array is empty.

**Fix**: Updated hooks to use `contactsCount` from backend response:
```typescript
// Before
contactsCount: journey.contacts?.length || 0

// After
contactsCount: (journey as any).contactsCount ?? journey.contacts?.length ?? 0
```

### 2. Frontend Display Fix (`frontend/app/(app)/journeys/[id]/page.tsx`)

**Problem**: Frontend was checking `journey.contacts && journey.contacts.length > 0` to display contacts, but contacts array is always empty for performance.

**Fix**: Updated to check `contactsCount` instead:
```typescript
// Before
{journey.contacts && journey.contacts.length > 0 ? (
  // Display contacts
) : (
  // No contacts message
)}

// After
{journey.contactsCount > 0 ? (
  // Show count message
) : (
  // No contacts message
)}
```

### 3. Backend Contact Count Fix (`backend/src/journeys/journeys.service.ts`)

**Problem**: Contact counts were including all statuses (ACTIVE, PAUSED, COMPLETED, etc.), not just ACTIVE contacts.

**Fix**: Updated count queries to only count ACTIVE contacts:
```typescript
// findOne method
const contactsCount = await this.journeyContactRepository.count({
  where: { journeyId: id, tenantId, status: JourneyContactStatus.ACTIVE },
});

// findAll method
.andWhere('jc.status = :status', { status: JourneyContactStatus.ACTIVE })
```

### 4. Frontend Contact Filter Fix

**Problem**: Frontend was trying to filter out enrolled contacts using `journey.contacts`, but that array is empty.

**Fix**: Removed the filter since backend handles duplicate prevention during enrollment:
```typescript
// Before
const enrolledContactIds = journey?.contacts?.map(...) || [];
const availableContacts = filteredContacts.filter(c => !enrolledContactIds.includes(c.id));

// After
const enrolledContactIds: string[] = []; // Backend handles duplicates
const availableContacts = filteredContacts; // Show all contacts, backend prevents duplicates
```

## Journey Execution Status

The journey scheduler service is properly configured:
- ✅ `ScheduleModule.forRoot()` is imported in `journeys.module.ts`
- ✅ `JourneySchedulerService` is registered as a provider
- ✅ `@Cron(CronExpression.EVERY_MINUTE)` decorator is on `processPendingExecutions()`
- ✅ Service processes pending executions every minute

## Testing Checklist

1. ✅ Frontend now displays correct contact count
2. ✅ Contact count only includes ACTIVE contacts
3. ✅ Frontend hooks use backend `contactsCount` value
4. ⏳ Verify journey scheduler is running (check logs)
5. ⏳ Verify executions are being created when contacts are enrolled
6. ⏳ Verify pending executions are being processed

## Next Steps

1. **Monitor Journey Scheduler**: Check backend logs for scheduler activity
   ```bash
   tail -f /tmp/backend.log | grep -i "journey\|execution\|scheduler"
   ```

2. **Check Database**: Verify journey contacts and executions exist
   - Check `journey_contacts` table for enrolled contacts
   - Check `journey_node_executions` table for pending executions

3. **Test Enrollment**: Enroll a contact and verify:
   - Contact appears in journey (count increases)
   - Execution records are created
   - Executions are processed by scheduler

4. **Check Execution Rules**: Verify execution rules aren't blocking executions
   - After-hours handling
   - Resubmission detection
   - TCPA compliance

## Files Modified

1. `frontend/lib/hooks/use-journeys.ts` - Fixed contactsCount calculation
2. `frontend/app/(app)/journeys/[id]/page.tsx` - Fixed contact display logic
3. `backend/src/journeys/journeys.service.ts` - Fixed contact count queries to only count ACTIVE contacts

