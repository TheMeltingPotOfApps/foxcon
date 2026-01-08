# Twilio DID Segmentation Implementation

This document describes the implementation of segmented Twilio DIDs for use in journeys.

## Overview

Twilio phone numbers are now imported as segmented DIDs (Direct Inward Dialing numbers) that can be organized into groups and selected within journey configurations. This allows for better organization and control over which phone numbers are used for outbound calls.

## Features

✅ **Segmented DIDs** - Organize Twilio numbers into segments (e.g., "twilio-main", "twilio-backup")  
✅ **Journey Selection** - Select DIDs by segment or specific DID ID in journey nodes  
✅ **Automatic Rotation** - DIDs rotate within segments based on usage  
✅ **Twilio Trunk Integration** - Asterisk configured to use Twilio SIP trunk  
✅ **Import Script** - Automated import of Twilio numbers as DIDs  

## Database Schema

### Migration: `add-segment-to-asterisk-dids.sql`

Adds a `segment` column to the `asterisk_dids` table:

```sql
ALTER TABLE "asterisk_dids" 
ADD COLUMN IF NOT EXISTS "segment" VARCHAR(255);

CREATE INDEX IF NOT EXISTS "idx_asterisk_dids_segment" 
ON "asterisk_dids"("tenantId", "segment");
```

### Updated Entity

The `AsteriskDid` entity now includes:

```typescript
@Column({ nullable: true })
segment: string; // Segment/group name (e.g., "twilio-main", "twilio-backup")
```

## API Endpoints

### List DIDs by Segment

**GET** `/api/asterisk-dids?segment=twilio-main`

Returns all DIDs in the specified segment.

**Query Parameters:**
- `segment`: Filter by segment name
- `status`: Filter by status (optional)

### Get Available Segments

**GET** `/api/asterisk-dids/segments`

Returns list of all available segments for the tenant.

**Response:**
```json
{
  "segments": ["twilio-main", "twilio-backup", "provider-a"]
}
```

### Get Next Available DID by Segment

**GET** `/api/asterisk-dids/next-available-by-segment?segment=twilio-main`

Returns the next available DID from the specified segment (lowest usage count).

**Response:**
```json
{
  "available": true,
  "did": {
    "id": "uuid",
    "number": "+1234567890",
    "segment": "twilio-main",
    "trunk": "TWILIO",
    "usageCount": 5
  }
}
```

## Journey Node Configuration

### MAKE_CALL Node Config

Journey nodes now support DID selection by segment or specific DID:

```typescript
{
  type: "MAKE_CALL",
  config: {
    // Option 1: Select by specific DID ID
    didId: "uuid-of-specific-did",
    
    // Option 2: Select by segment (uses rotation)
    didSegment: "twilio-main",
    
    // Other config options...
    audioFile: "custom/voice_template_123",
    transferNumber: "+1234567890"
  }
}
```

### Selection Priority

1. If `didId` is specified → Use that specific DID
2. If `didSegment` is specified → Use next available DID from segment
3. Otherwise → Use default rotation (all available DIDs)

## Import Script

### Usage

```bash
cd backend
npx ts-node scripts/import-twilio-numbers-as-dids.ts [segment-name] [trunk-name]
```

**Parameters:**
- `segment-name` (optional): Segment name (default: "twilio-main")
- `trunk-name` (optional): Trunk name (default: "TWILIO")

**Examples:**

```bash
# Import all Twilio numbers as "twilio-main" segment with "TWILIO" trunk
npx ts-node scripts/import-twilio-numbers-as-dids.ts

# Import as custom segment
npx ts-node scripts/import-twilio-numbers-as-dids.ts twilio-backup TWILIO

# Import as different provider segment
npx ts-node scripts/import-twilio-numbers-as-dids.ts provider-a PROVIDER-A
```

### What It Does

1. Fetches all Twilio phone numbers from Twilio API
2. For each number:
   - Checks if DID already exists
   - If exists: Updates with segment and trunk info
   - If new: Creates new DID with segment and trunk
3. Stores metadata:
   - Twilio SID
   - Capabilities (voice, SMS, MMS)
   - Friendly name
   - Provider: "Twilio"
   - Import source: "twilio-api"

## Asterisk Configuration

### Twilio Trunk Setup

See `ASTERISK_TWILIO_TRUNK_SETUP_GUIDE.md` for complete instructions.

**Quick Setup:**

1. Copy `backend/asterisk-config/pjsip-twilio-trunk.conf` to `/etc/asterisk/pjsip.d/twilio.conf`
2. Update credentials:
   - `YOUR_TWILIO_SIP_USERNAME` → Your Twilio SIP username
   - `YOUR_TWILIO_SIP_PASSWORD` → Your Twilio SIP password
3. Reload Asterisk:
   ```bash
   asterisk -rx "pjsip reload"
   ```
4. Verify:
   ```bash
   asterisk -rx "pjsip show endpoints"
   ```

### Trunk Name

The trunk name used in the configuration is `TWILIO`. This must match:
- The trunk name in Asterisk PJSIP config
- The trunk name used when importing DIDs
- The trunk name in the `asterisk_dids` table

## Workflow

### Initial Setup

1. **Run Migration:**
   ```bash
   psql -U sms_user -d sms_platform -f backend/migrations/add-segment-to-asterisk-dids.sql
   ```

2. **Configure Asterisk:**
   - Follow `ASTERISK_TWILIO_TRUNK_SETUP_GUIDE.md`
   - Ensure Twilio trunk is configured and working

3. **Import Twilio Numbers:**
   ```bash
   cd backend
   npx ts-node scripts/import-twilio-numbers-as-dids.ts twilio-main TWILIO
   ```

4. **Verify Import:**
   ```sql
   SELECT segment, COUNT(*) as count, trunk 
   FROM asterisk_dids 
   WHERE segment = 'twilio-main' 
   GROUP BY segment, trunk;
   ```

### Using in Journeys

1. **Create/Edit Journey:**
   - Add or edit a MAKE_CALL node

2. **Configure DID Selection:**
   - **Option A:** Select specific DID by ID
   - **Option B:** Select segment (e.g., "twilio-main")
   - System will automatically rotate DIDs within the segment

3. **Test Journey:**
   - Execute journey with test contact
   - Verify call uses correct DID
   - Check Asterisk logs for trunk usage

## Segment Management

### Creating Segments

Segments are created automatically when importing DIDs:

```bash
# Create "twilio-main" segment
npx ts-node scripts/import-twilio-numbers-as-dids.ts twilio-main TWILIO

# Create "twilio-backup" segment
npx ts-node scripts/import-twilio-numbers-as-dids.ts twilio-backup TWILIO

# Create provider-specific segment
npx ts-node scripts/import-twilio-numbers-as-dids.ts provider-a PROVIDER-A
```

### Updating Segment Assignment

Update DIDs to different segments via API:

```bash
PUT /api/asterisk-dids/:id
{
  "segment": "twilio-backup"
}
```

Or via SQL:

```sql
UPDATE asterisk_dids 
SET segment = 'twilio-backup' 
WHERE number = '+1234567890';
```

### Listing Segments

```bash
GET /api/asterisk-dids/segments
```

## Best Practices

### Segment Naming

Use descriptive, consistent naming:
- `twilio-main` - Primary Twilio numbers
- `twilio-backup` - Backup Twilio numbers
- `provider-a` - Numbers from Provider A
- `region-us-east` - Region-specific numbers

### DID Rotation

- DIDs automatically rotate based on `usageCount`
- Lower usage count = selected first
- Reset usage counts periodically if needed

### Monitoring

Monitor DID usage:

```sql
SELECT 
  segment,
  COUNT(*) as total_dids,
  SUM(usageCount) as total_usage,
  AVG(usageCount) as avg_usage,
  MAX(usageCount) as max_usage
FROM asterisk_dids
WHERE segment = 'twilio-main'
GROUP BY segment;
```

## Troubleshooting

### DIDs Not Showing in Journey

1. **Check Segment Exists:**
   ```bash
   GET /api/asterisk-dids/segments
   ```

2. **Verify DIDs in Segment:**
   ```sql
   SELECT * FROM asterisk_dids WHERE segment = 'twilio-main';
   ```

3. **Check Status:**
   ```sql
   SELECT segment, status, COUNT(*) 
   FROM asterisk_dids 
   WHERE segment = 'twilio-main' 
   GROUP BY segment, status;
   ```
   Ensure DIDs have `status = 'active'` or `status = 'available'`

### Calls Failing

1. **Verify Trunk Configuration:**
   ```bash
   asterisk -rx "pjsip show endpoint TWILIO"
   ```

2. **Check DID Trunk Assignment:**
   ```sql
   SELECT number, trunk, segment 
   FROM asterisk_dids 
   WHERE segment = 'twilio-main' 
   LIMIT 5;
   ```
   Should show `trunk = 'TWILIO'`

3. **Review Asterisk Logs:**
   ```bash
   tail -f /var/log/asterisk/full | grep -i twilio
   ```

### Import Issues

1. **Check Twilio Credentials:**
   - Verify credentials in database
   - Test connection: `npx ts-node scripts/test-twilio-credentials.ts`

2. **Check Database:**
   - Ensure migration ran successfully
   - Verify `segment` column exists

3. **Review Import Logs:**
   - Check script output for errors
   - Verify numbers were imported

## Files Created/Modified

### New Files

- `backend/migrations/add-segment-to-asterisk-dids.sql` - Database migration
- `backend/scripts/import-twilio-numbers-as-dids.ts` - Import script
- `backend/asterisk-config/pjsip-twilio-trunk.conf` - Asterisk configuration
- `ASTERISK_TWILIO_TRUNK_SETUP_GUIDE.md` - Asterisk team guide
- `TWILIO_DID_SEGMENTATION_IMPLEMENTATION.md` - This document

### Modified Files

- `backend/src/entities/asterisk-did.entity.ts` - Added `segment` field
- `backend/src/asterisk/dids.service.ts` - Added segment filtering methods
- `backend/src/asterisk/dids.controller.ts` - Added segment endpoints
- `backend/src/journeys/dto/create-node.dto.ts` - Added `didSegment` field
- `backend/src/entities/journey-node.entity.ts` - Added `didSegment` field
- `backend/src/journeys/journeys.service.ts` - Added segment selection logic

## Next Steps

1. ✅ Run database migration
2. ✅ Configure Asterisk Twilio trunk (see guide)
3. ✅ Import Twilio numbers as DIDs
4. ✅ Test journey with segment selection
5. ✅ Monitor usage and adjust segments as needed

---

**Last Updated:** December 2025  
**Version:** 1.0

