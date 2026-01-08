# Asterisk Integration Setup Guide

This guide will help you set up and configure the Asterisk AMI integration for the SMS SaaS Platform.

## Prerequisites

1. **Asterisk PBX** installed and running locally
2. **PostgreSQL** database running
3. **Node.js** environment set up
4. **AMI Access** configured in Asterisk

## Step 1: Configure Asterisk AMI

### 1.1 Edit Asterisk Manager Configuration

Edit `/etc/asterisk/manager.conf` (or your Asterisk config location):

```ini
[general]
enabled = yes
port = 5038
bindaddr = 127.0.0.1

[admin]
secret = your_secure_password_here
deny = 0.0.0.0/0.0.0.0
permit = 127.0.0.1/255.255.255.255
read = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan
write = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan
```

### 1.2 Reload Asterisk Manager

```bash
asterisk -rx "manager reload"
```

### 1.3 Test AMI Connection

```bash
telnet localhost 5038
```

You should see:
```
Asterisk Call Manager/1.1
```

## Step 2: Configure Environment Variables

Add these to your `.env` file in the backend directory:

```bash
# Asterisk AMI Configuration
AMI_PORT=5038
AMI_HOST=localhost
AMI_USER=admin
AMI_PASSWORD=your_secure_password_here
```

## Step 3: Run Database Migration

### Option 1: Using the migration script

```bash
cd backend
node scripts/run-call-logs-migration.js
```

### Option 2: Manual SQL execution

```bash
psql -U sms_user -d sms_platform -f backend/migrations/create-call-logs-table.sql
```

### Option 3: Using psql directly

```bash
psql -U sms_user -d sms_platform << EOF
-- Paste contents of create-call-logs-table.sql
EOF
```

## Step 4: Configure Asterisk Dialplan

Create or update your Asterisk dialplan to include the `DynamicIVR` context.

### 4.1 Edit `/etc/asterisk/extensions.conf`

Add the following context:

```ini
[DynamicIVR]
exten => s,1,NoOp(Call initiated: ${TO_NUMBER} from ${FROM_NUMBER})
exten => s,n,Set(CALLED_NUMBER=${TO_NUMBER})
exten => s,n,Set(CALLER_NUMBER=${FROM_NUMBER})
exten => s,n,Set(TRANSFER_NUMBER=${TRANSFER_NUMBER})
exten => s,n,Set(CUSTOM_CALL_ID=${custom_call_id})
exten => s,n,Set(PRESS_KEY=${PRESS_KEY})
exten => s,n,Set(IVR_FILE=${IVR_FILE})
exten => s,n,Set(IVR_VM_FILE=${IVR_VM_FILE})
exten => s,n,Set(AMD_ENABLED=${AMD_ENABLED})

; Set default values if not provided
exten => s,n,Set(PRESS_KEY=$["${PRESS_KEY}" = ""]?1:${PRESS_KEY})
exten => s,n,Set(AMD_ENABLED=$["${AMD_ENABLED}" = ""]?true:${AMD_ENABLED})

; AMD (Answering Machine Detection) if enabled
exten => s,n,GotoIf($["${AMD_ENABLED}" = "true"]?amd_check:skip_amd)
exten => s,n(amd_check),AMD()
exten => s,n,GotoIf($["${AMDSTATUS}" = "HUMAN"]?play_ivr:voicemail)
exten => s,n(skip_amd),Goto(play_ivr)

; Play IVR if configured, then wait for key press (P1 dialer - press 1 to transfer)
exten => s,n(play_ivr),GotoIf($["${IVR_FILE}" != ""]?play_and_read:wait_for_key)
exten => s,n(play_and_read),Playback(${IVR_FILE})
exten => s,n(wait_for_key),Read(USER_INPUT,beep,1,10)
exten => s,n,GotoIf($["${USER_INPUT}" = "${PRESS_KEY}"]?transfer:hangup_no_transfer)
exten => s,n(transfer),Dial(PJSIP/${TRANSFER_NUMBER}@${TRUNK},30,g)
exten => s,n,Hangup()

; Hangup if wrong key, no key pressed, or timeout
exten => s,n(hangup_no_transfer),Hangup()

; Voicemail drop if configured
exten => s,n(voicemail),GotoIf($["${IVR_VM_FILE}" != ""]?play_vm:hangup)
exten => s,n(play_vm),Playback(${IVR_VM_FILE})
exten => s,n(hangup),Hangup()
```

### 4.2 Reload Dialplan

```bash
asterisk -rx "dialplan reload"
```

## Step 5: Verify Installation

### 5.1 Check Backend Build

```bash
cd backend
npm run build
```

Should complete without errors.

### 5.2 Start Backend Server

```bash
npm run start:dev
```

Check logs for:
```
[AmiService] AMI connected successfully
[AmiEventListenerService] AMI connected successfully
```

### 5.3 Test Make Call Endpoint

```bash
curl -X POST http://localhost:5000/api/calls/make-call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "to": "+17065551234",
    "from": "YOUR_TENANT_ID",
    "context": "DynamicIVR"
  }'
```

Expected response:
```json
{
  "success": true,
  "callId": "uuid-here",
  "asteriskUniqueId": "1234567890.123",
  "callDetails": {
    "brand": {
      "name": "Your Tenant Name"
    },
    "did": {
      "number": "+14045556789"
    },
    "to": "+17065551234",
    "from": "+14045556789",
    "transferNumber": "+14045556789",
    "trunk": "PJSIP",
    "context": "DynamicIVR"
  },
  "amiResponse": {
    "success": true,
    "uniqueId": "1234567890.123",
    "status": "originated"
  },
  "message": "Call initiated successfully"
}
```

## Step 6: Verify Call Logs

### 6.1 Check Call Logs Endpoint

```bash
curl -X GET http://localhost:5000/api/calls/logs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 6.2 Check Database

```bash
psql -U sms_user -d sms_platform -c "SELECT * FROM call_logs ORDER BY \"createdAt\" DESC LIMIT 5;"
```

## Troubleshooting

### AMI Connection Failed

**Symptoms**: Logs show "AMI disconnected" or connection errors

**Solutions**:
1. Verify Asterisk is running: `asterisk -rx "core show version"`
2. Check AMI port: `netstat -tlnp | grep 5038`
3. Verify credentials in `.env` match `manager.conf`
4. Check firewall: `telnet localhost 5038`

### Call Not Originating

**Symptoms**: Call log created but no Asterisk activity

**Solutions**:
1. Check dialplan: `asterisk -rx "dialplan show DynamicIVR"`
2. Verify trunk exists: `asterisk -rx "pjsip show endpoints"`
3. Check AMI logs: `tail -f /var/log/asterisk/full`
4. Verify phone numbers are in E.164 format

### Events Not Received

**Symptoms**: Call logs not updating with events

**Solutions**:
1. Verify AMI Event Listener is connected
2. Check event filtering in `ami-event-listener.service.ts`
3. Enable debug mode: Set `AMI_DEBUG=true` in `.env`
4. Check Asterisk event logs

### Database Errors

**Symptoms**: Migration fails or call logs not saving

**Solutions**:
1. Verify PostgreSQL is running
2. Check database connection in `.env`
3. Verify user has CREATE TABLE permissions
4. Check for existing `call_logs` table conflicts

## Advanced Configuration

### Custom Trunk Configuration

Update `calls.service.ts` to use tenant-specific trunks:

```typescript
// In calls.service.ts, replace hardcoded trunk
const trunk = tenant.trunk || 'PJSIP';
```

### IVR File Management

Implement IVR file upload and management:
1. Create `asterisk-sound.service.ts` (see documentation)
2. Upload audio files to `/var/lib/asterisk/sounds/custom/`
3. Reference files in call parameters

### Transfer Number Selection

Implement weighted distribution:
1. Create `TransferNumber` entity
2. Update `calls.service.ts` to select based on distribution percentages
3. Track usage and rotate numbers

## Monitoring

### Health Checks

The AMI Event Listener performs health checks every 60 seconds. Monitor logs for:
```
✓ System operational | Active: X calls | Total: Y | Answered: Z | Failed: W
```

### Call Statistics

Query call statistics:
```sql
SELECT 
  status,
  COUNT(*) as count,
  AVG(duration) as avg_duration
FROM call_logs
WHERE "tenantId" = 'your-tenant-id'
GROUP BY status;
```

## Support

For issues or questions:
1. Check logs: `tail -f backend/logs/*.log`
2. Review Asterisk logs: `tail -f /var/log/asterisk/full`
3. Verify AMI connection: `asterisk -rx "manager show connected"`
4. Check database: `psql -U sms_user -d sms_platform`

---

**Last Updated**: Current Date
**Version**: 1.0.0

