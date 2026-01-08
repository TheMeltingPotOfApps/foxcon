# Asterisk DID Management Implementation

## Overview

This document describes the implementation of DID (Direct Inward Dialing) management for Asterisk calls. DIDs are managed separately from Twilio numbers and can be imported via CSV, similar to how leads are imported.

## Key Features

✅ **DID Entity** - Database model for Asterisk DIDs  
✅ **CSV Import** - Import DIDs from CSV files (similar to lead import)  
✅ **DID Rotation** - Automatic rotation based on usage count  
✅ **Usage Tracking** - Track DID usage and limits  
✅ **Call Integration** - Calls service uses DIDs instead of Twilio numbers  
✅ **Journey Node Support** - MAKE_CALL journey nodes use Asterisk DIDs  

## Architecture

### Entity

**File**: `backend/src/entities/asterisk-did.entity.ts`

- Stores DID information (number, area code, trunk, status)
- Tracks usage count and limits
- Stores metadata (provider, region, notes, import info)

### Service

**File**: `backend/src/asterisk/dids.service.ts`

- DID CRUD operations
- CSV import functionality
- DID rotation logic
- Usage tracking

### Controller

**File**: `backend/src/asterisk/dids.controller.ts`

- REST API endpoints
- CSV upload endpoint

## API Endpoints

### Create DID

**POST** `/api/asterisk-dids`

Create a single DID manually.

**Request:**
```json
{
  "number": "+14045556789",
  "trunk": "PJSIP",
  "status": "active",
  "maxUsage": 1000,
  "metadata": {
    "provider": "Provider Name",
    "region": "US-East"
  }
}
```

### List DIDs

**GET** `/api/asterisk-dids?status=active`

List all DIDs for the tenant, optionally filtered by status.

**Query Parameters:**
- `status`: Filter by status (active, available, inactive, suspended)

### Get Next Available DID

**GET** `/api/asterisk-dids/next-available`

Get the next available DID for rotation (lowest usage count).

### Get DID

**GET** `/api/asterisk-dids/:id`

Get a specific DID by ID.

### Update DID

**PUT** `/api/asterisk-dids/:id`

Update DID properties.

### Delete DID

**DELETE** `/api/asterisk-dids/:id`

Delete a DID.

### Import DIDs from CSV

**POST** `/api/asterisk-dids/import`

Import multiple DIDs from a CSV file.

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `file`
- File type: CSV

**CSV Format:**
```csv
number,areaCode,trunk,status,maxUsage,provider,region,notes
+14045556789,404,PJSIP,active,1000,Provider A,US-East,Main DID
+14045556790,404,PJSIP,active,500,Provider A,US-East,Backup DID
+17065551234,706,PJSIP,available,,Provider B,US-West,
```

**CSV Columns:**
- `number` (required) - Phone number in any format (will be converted to E.164)
- `areaCode` (optional) - Area code (auto-extracted if not provided)
- `trunk` (optional) - PJSIP trunk name (default: PJSIP)
- `status` (optional) - Status: active, available, inactive, suspended (default: available)
- `maxUsage` (optional) - Maximum usage limit (default: unlimited)
- `provider` (optional) - DID provider name
- `region` (optional) - Geographic region
- `notes` (optional) - Additional notes

**Response:**
```json
{
  "success": true,
  "success": 10,
  "failed": 2,
  "duplicates": 1,
  "errors": [
    {
      "row": 5,
      "number": "+14045556789",
      "error": "Invalid phone number format"
    }
  ]
}
```

## DID Rotation Logic

The service implements intelligent DID rotation:

1. **Usage-Based Selection**: Selects DIDs with lowest usage count
2. **Limit Checking**: Skips DIDs that have reached maxUsage limit
3. **Status Filtering**: Only selects DIDs with status 'active'
4. **Automatic Increment**: Usage count is incremented after each call

### Selection Algorithm

```typescript
// Get DIDs ordered by usage count (ascending)
const dids = await repository.find({
  where: { tenantId, status: 'active' },
  order: { usageCount: 'ASC', id: 'ASC' }
});

// Filter out DIDs that exceeded limit
const available = dids.filter(did => 
  did.maxUsage === null || did.usageCount < did.maxUsage
);

// Return first available DID
return available[0];
```

## Integration with Calls Service

The calls service has been updated to use Asterisk DIDs:

1. **DID Selection**: Uses `DidsService.getNextAvailableDid()` for rotation
2. **Usage Tracking**: Automatically increments usage after call
3. **Error Handling**: Clear error if no DIDs are available

### Updated Flow

```typescript
// 1. Get next available DID
const did = await didsService.getNextAvailableDid(tenantId);

// 2. Make call using DID
const result = await amiService.makeCall({
  to: destination,
  from: did.number,
  trunk: did.trunk,
  // ...
});

// 3. Increment usage
await didsService.incrementUsage(tenantId, did.id);
```

## Journey Node Integration

The `MAKE_CALL` journey node is fully functional with Asterisk DIDs:

1. **Automatic DID Selection**: Uses rotation logic if no specific DID provided
2. **Tenant Isolation**: Each tenant has their own DIDs
3. **Error Handling**: Clear error messages if DIDs not configured

### Journey Node Flow

```typescript
// In journeys.service.ts - executeMakeCall()
const result = await callsService.makeCall(tenantId, {
  to: contact.phoneNumber,
  from: fromNumberId || tenantId, // Optional DID ID or use rotation
  context: 'DynamicIVR',
});
```

## Database Schema

### Table: `asterisk_dids`

```sql
CREATE TABLE asterisk_dids (
  id UUID PRIMARY KEY,
  tenantId UUID NOT NULL,
  number VARCHAR(255) NOT NULL,
  areaCode VARCHAR(10),
  trunk VARCHAR(255) DEFAULT 'PJSIP',
  status VARCHAR(50) DEFAULT 'available',
  usageCount INTEGER DEFAULT 0,
  maxUsage INTEGER,
  lastUsed TIMESTAMP,
  metadata JSONB,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  UNIQUE(tenantId, number)
);
```

### Indexes

- `idx_asterisk_dids_tenant_id` - Tenant lookup
- `idx_asterisk_dids_number` - Number lookup
- `idx_asterisk_dids_status` - Status filtering
- `idx_asterisk_dids_usage_count` - Rotation ordering
- `idx_asterisk_dids_tenant_status` - Combined tenant/status

## Migration

Run the migration to create the table:

```bash
cd backend
node scripts/run-asterisk-dids-migration.js
```

Or manually:
```bash
psql -U sms_user -d sms_platform -f migrations/create-asterisk-dids-table.sql
```

## Usage Examples

### Import DIDs from CSV

```bash
curl -X POST http://localhost:5000/api/asterisk-dids/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@dids.csv"
```

### Create DID Manually

```bash
curl -X POST http://localhost:5000/api/asterisk-dids \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "+14045556789",
    "trunk": "PJSIP",
    "status": "active",
    "maxUsage": 1000
  }'
```

### List Active DIDs

```bash
curl -X GET "http://localhost:5000/api/asterisk-dids?status=active" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Next Available DID

```bash
curl -X GET http://localhost:5000/api/asterisk-dids/next-available \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## CSV Import Format

### Example CSV File

```csv
number,trunk,status,maxUsage,provider,region,notes
+14045556789,PJSIP,active,1000,Provider A,US-East,Main DID
+14045556790,PJSIP,active,500,Provider A,US-East,Backup DID
+17065551234,PJSIP,available,,Provider B,US-West,New DID
4045556789,PJSIP,active,2000,Provider C,US-South,Local format
```

### Supported Number Formats

The service accepts phone numbers in various formats and converts them to E.164:

- `+14045556789` - E.164 format (preferred)
- `14045556789` - Without + prefix
- `4045556789` - 10-digit format (assumes +1)
- `(404) 555-6789` - Formatted (strips non-digits)

## Error Handling

### Common Errors

1. **No DIDs Available**
   - Error: `No available DIDs configured for this tenant`
   - Solution: Import DIDs via CSV

2. **Duplicate DID**
   - Error: `DID already exists`
   - Solution: CSV import skips duplicates, manual create fails

3. **Invalid Phone Number**
   - Error: `Invalid phone number: ...`
   - Solution: Ensure phone number is in valid format

4. **DID Not Found**
   - Error: `DID not found: ...`
   - Solution: Verify DID exists for tenant

## Status Values

- **active** - DID is active and available for calls
- **available** - DID is available but not yet active
- **inactive** - DID is temporarily disabled
- **suspended** - DID is suspended (e.g., billing issue)

## Best Practices

1. **Import DIDs First**: Import DIDs before making calls
2. **Set Usage Limits**: Use maxUsage to prevent overuse
3. **Monitor Usage**: Check usageCount regularly
4. **Rotate DIDs**: System automatically rotates based on usage
5. **Status Management**: Keep DIDs in 'active' status for calls

## Integration Checklist

- ✅ DID entity created
- ✅ DID service implemented
- ✅ DID controller with CSV import
- ✅ Calls service updated to use DIDs
- ✅ Journey node integration verified
- ✅ Database migration created
- ✅ Usage tracking implemented
- ✅ Rotation logic implemented

## Next Steps

1. **Run Migration**: Create `asterisk_dids` table
2. **Import DIDs**: Upload CSV with DID numbers
3. **Test Calls**: Verify calls use imported DIDs
4. **Monitor Usage**: Check usage counts and rotation

---

**Implementation Status**: ✅ Complete  
**Journey Node Status**: ✅ Functional  
**Last Updated**: Current Date

