# Call System Validation Report

## Overview
This document provides validation results for the call execution system, including phone number formatting, call execution, and metrics generation.

## Phone Number Formatting

### Current Implementation
- **`to` number**: Uses `formatWithoutPlusOne()` → Format: `17065551234` (no +, leading 1)
- **`from` number**: Uses `formatToE164()` → Format: `+17065551234` (with + prefix)
- **`transfer_number`**: Uses `formatWithoutPlusOne()` → Format: `17065551234` (no +, leading 1)

### Validation Points
✅ **AMI Service** (`ami.service.ts`):
- Line 201: `formattedTo` uses `formatWithoutPlusOne()` ✓
- Line 202: `formattedFrom` uses `formatToE164()` ✓
- Line 208: `formattedTransferNumber` uses `formatWithoutPlusOne()` ✓

✅ **Phone Formatter** (`phone-formatter.ts`):
- `formatWithoutPlusOne()`: Always outputs with leading "1", no "+" sign
- `formatToE164()`: Outputs with "+1" prefix for US numbers

## Call Execution Flow

### 1. Call Initiation
**Location**: `backend/src/asterisk/calls.service.ts::makeCall()`

**Flow**:
1. Resolve tenant and DID
2. Select transfer number (defaults to DID number if not provided)
3. Create call log entry
4. Execute AMI call via `amiService.makeCall()`

**Data Captured**:
- `to`, `from`, `transferNumber`
- `callId` (custom call ID)
- `uniqueId` (Asterisk unique ID - updated after AMI response)
- `status` (INITIATED → CONNECTED → ANSWERED/FAILED/COMPLETED)
- `metadata` (IVR files, DID info, etc.)

### 2. AMI Call Execution
**Location**: `backend/src/asterisk/ami.service.ts::makeCall()`

**Actions**:
- Formats phone numbers according to specification
- Builds AMI Originate action
- Sends action to Asterisk AMI
- Waits for OriginateResponse event
- Returns response with uniqueId

**Variables Passed to Asterisk**:
- `TO_NUMBER`: `17065551234` (no +)
- `FROM_NUMBER`: `+17065551234` (with +)
- `TRANSFER_NUMBER`: `17065551234` (no +)

### 3. Event Tracking
**Location**: `backend/src/asterisk/ami-event-listener.service.ts`

**Events Captured**:
- `NewChannel`: Call channel created
- `Dial`: Dial attempt
- `Bridge`: Channels bridged (connected)
- `Hangup`: Call ended
- `UserEvent`: Custom events (IVRResponse, TransferAttempt, TransferConnected, etc.)

**Call Log Updates**:
- Updates `uniqueId` when NewChannel event received
- Updates `status` and `disposition` based on events
- Adds events to `callFlowEvents` array
- Updates `metadata.transferStatus` for transfer events
- Calculates `duration` and `billableSeconds`

## Metrics Generation

### Dashboard Metrics
**Location**: `backend/src/dashboard/dashboard.service.ts::getStats()`

**Metrics Calculated**:
1. **callsPlaced**: Total call logs created
2. **callsAnswered**: Calls with `disposition = ANSWERED` or `status IN (ANSWERED, COMPLETED)`
3. **callAnswerRate**: `(callsAnswered / callsPlaced) * 100`
4. **transfersAttempted**: Calls with `transferNumber IS NOT NULL AND transferNumber != ''`
5. **transfersCompleted**: Calls with `metadata.transferStatus = 'completed'`
6. **transferRate**: `(transfersCompleted / callsAnswered) * 100`
7. **totalCallDuration**: Sum of `duration` for answered calls
8. **averageCallDuration**: `totalCallDuration / callsAnswered`

### Data Quality Checks

#### Call Log Completeness
- ✅ `uniqueId`: Should be populated after AMI OriginateResponse
- ✅ `callFlowEvents`: Should contain events from AMI Event Listener
- ✅ `metadata`: Should contain call configuration and results
- ✅ `status`: Should progress through: INITIATED → CONNECTED → ANSWERED/FAILED/COMPLETED
- ✅ `disposition`: Should be set based on call outcome

#### Transfer Metrics
- ✅ `transferNumber`: Should be formatted as `17065551234` (no +)
- ✅ `metadata.transferStatus`: Should be set to 'completed', 'failed', 'busy', or 'no_answer'
- ✅ `metadata.transferBillableSeconds`: Should be set for completed transfers

## Validation Script

**Location**: `backend/scripts/validate-call-system.ts`

**Checks Performed**:
1. ✅ AMI Connection Status
2. ✅ Phone Number Formatting (recent calls)
3. ✅ Recent Call Logs (completeness, status distribution)
4. ✅ Call Metrics Generation
5. ✅ Call Flow Events (event types, completeness)
6. ✅ Transfer Metrics (completion rates, status distribution)

**Usage**:
```bash
cd /root/SMS
npx ts-node backend/scripts/validate-call-system.ts
```

## Logging

### Debug Logs
**Location**: `/root/SMS/.cursor/debug.log`

Journey execution logs are written here for debugging purposes.

### Application Logs
**Location**: Console output (Winston logger)

Logs include:
- AMI connection status
- Call origination attempts
- Event processing
- Errors and warnings

### Enhanced Logging
**Location**: `ami.service.ts` (line 210-218)

Added debug logging for phone number formatting:
```typescript
this.logger.debug(`[Call Execution] Phone number formatting:`, {
  originalTo: params.to,
  formattedTo,
  originalFrom: params.from,
  formattedFrom,
  originalTransfer: rawTransferNumber,
  formattedTransfer: formattedTransferNumber,
  callId: params.callId,
});
```

## Known Issues & Recommendations

### Potential Issues
1. **Phone Number Format Consistency**: Ensure all call executors use the same formatting
2. **Event Timing**: Some events may arrive out of order - system handles this with fallback lookups
3. **Call Log Matching**: Uses multiple strategies (uniqueId, phone number, timestamp) to match events

### Recommendations
1. ✅ Run validation script regularly to monitor system health
2. ✅ Check logs for formatting issues
3. ✅ Monitor metrics for anomalies (low answer rates, missing events)
4. ✅ Verify AMI connection status before making calls
5. ✅ Review call flow events to ensure proper event capture

## Testing Checklist

- [ ] AMI service connects successfully
- [ ] Phone numbers formatted correctly (to: no +, from: with +, transfer: no +)
- [ ] Call logs created with correct data
- [ ] AMI events captured and stored
- [ ] Call status updates correctly
- [ ] Transfer events tracked
- [ ] Metrics calculate correctly
- [ ] Dashboard displays accurate data

