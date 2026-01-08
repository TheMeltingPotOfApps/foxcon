# ElevenLabs API Key Fix

## Issue
ElevenLabs audio generation was failing even after updating the API key.

## Root Cause
The API key was being updated in the database, but:
1. The config service cache wasn't being properly refreshed
2. The ElevenLabs service wasn't clearing its internal cache when refreshing
3. No verification that the key was actually refreshed

## Fixes Applied

### 1. Enhanced Config Service (`backend/src/config/config.service.ts`)
- Added logging when config is updated
- Ensures `isActive` is set to `true` when updating
- Added `reloadConfigs()` public method for explicit cache refresh

### 2. Improved ElevenLabs Service Refresh (`backend/src/elevenlabs/elevenlabs.service.ts`)
- `refreshApiKey()` now calls `configService.loadConfigs()` to clear cache
- Added debug logging to show API key length (without exposing full key)
- Better error handling and logging

### 3. Enhanced Config Controller (`backend/src/config/config.controller.ts`)
- Added verification after refreshing API key
- Logs success/failure of refresh operation
- Better error messages

### 4. Created Diagnostic Script (`backend/scripts/test-elevenlabs-api-key.js`)
- Tests API key directly from database
- Validates key format and length
- Tests actual ElevenLabs API calls
- Shows user quota/credits

## Testing Results

✅ API key is valid and working
✅ Can fetch voices (34 voices found)
✅ Can generate audio successfully
✅ User has 40,000 characters remaining

## How to Update API Key

### Option 1: Via Settings Page
1. Go to Settings → API Keys
2. Update ElevenLabs API Key
3. Click Save
4. Check backend logs for: "✅ ElevenLabs API key refreshed successfully"

### Option 2: Via API
```bash
curl -X PUT http://localhost:5000/api/config/ELEVENLABS_API_KEY \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "sk_your_new_key_here"}'
```

### Option 3: Direct Database Update
```sql
UPDATE system_configs 
SET value = 'sk_your_new_key_here', "isActive" = true
WHERE key = 'ELEVENLABS_API_KEY';
```

Then restart backend or wait for next API call (key reloads automatically).

## Verification

Run the diagnostic script:
```bash
cd /root/SMS/backend
node scripts/test-elevenlabs-api-key.js
```

Expected output:
- ✅ Connected to database
- ✅ API key is valid!
- ✅ Audio generation successful!

## Troubleshooting

### If audio generation still fails:

1. **Check API key format:**
   - Should start with `sk_`
   - Should be 51 characters long
   - No extra spaces or newlines

2. **Check backend logs:**
   ```bash
   tail -f /tmp/backend.log | grep -i "elevenlabs\|api.*key"
   ```

3. **Verify key in database:**
   ```sql
   SELECT key, LENGTH(value) as key_length, "isActive" 
   FROM system_configs 
   WHERE key = 'ELEVENLABS_API_KEY';
   ```

4. **Test key directly:**
   ```bash
   cd /root/SMS/backend
   node scripts/test-elevenlabs-api-key.js
   ```

5. **Check ElevenLabs account:**
   - Verify key is active at https://elevenlabs.io/app/settings/api-keys
   - Check remaining credits/quota
   - Ensure subscription is active

## Common Issues

### Issue: "API key is invalid or expired"
- **Solution**: Generate a new key from ElevenLabs dashboard
- **Verify**: Run test script to confirm key works

### Issue: "Quota exceeded"
- **Solution**: Check ElevenLabs account for remaining credits
- **Upgrade**: Consider upgrading subscription if needed

### Issue: Key updated but still not working
- **Solution**: Restart backend service
- **Alternative**: Wait for next API call (key reloads automatically)
- **Verify**: Check logs for "ElevenLabs API key refreshed"

## Next Steps

1. ✅ API key is working (verified via test script)
2. ✅ Cache refresh is improved
3. ✅ Better logging added
4. ⚠️ If issues persist, check:
   - Backend logs for specific error messages
   - ElevenLabs account status
   - Network connectivity to ElevenLabs API
