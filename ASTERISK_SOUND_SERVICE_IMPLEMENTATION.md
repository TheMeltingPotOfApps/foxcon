# Asterisk Sound Service Implementation

## Overview

This document describes the implementation of the Asterisk Sound Service for managing audio files, call recordings, and IVR files. The service provides functionality for uploading, converting, and managing audio files used by Asterisk PBX.

## Key Features

✅ **Audio File Upload** - Upload audio files with automatic format conversion  
✅ **Format Conversion** - Convert to Asterisk-compatible formats (WAV, μ-law, A-law, GSM, SLN16)  
✅ **Call Recording Management** - List and manage call recordings from monitor directory  
✅ **Audio Streaming** - Stream audio files for playback  
✅ **Custom Sounds Management** - List and delete custom sound files  
✅ **Asterisk Reload** - Reload Asterisk configuration after file changes  

## Important Notes

⚠️ **Read-Only FreePBX Integration**: The service is designed to NOT modify FreePBX code or database. FreePBX recordings are marked as read-only to prevent accidental modifications to the FreePBX system.

⚠️ **No Asterisk Config Modification**: The service does NOT modify Asterisk configuration files. It only interacts with audio files and uses read-only Asterisk commands.

## Architecture

### Service Layer

**File**: `backend/src/asterisk/asterisk-sound.service.ts`

- Handles all audio file operations
- Manages file conversions using `sox`
- Provides file streaming capabilities
- Manages directory structures

### Controller Layer

**File**: `backend/src/asterisk/asterisk-sound.controller.ts`

- REST API endpoints for audio management
- File upload handling with multer
- Response formatting

## API Endpoints

### Upload Audio File

**POST** `/api/asterisk-sounds/upload`

Upload an audio file and convert it to Asterisk-compatible formats.

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `audio`
- Optional fields:
  - `name`: Display name for the file
  - `description`: Description of the file
  - `addToFreePBX`: Boolean (not implemented - FreePBX is read-only)

**Response:**
```json
{
  "success": true,
  "id": "file_id_hex",
  "originalName": "original_file.wav",
  "safeName": "upload_file_id_original_file.wav",
  "formats": {
    "wav": "/var/lib/asterisk/sounds/custom/filename.wav",
    "ulaw": "/var/lib/asterisk/sounds/custom/filename.ul",
    "alaw": "/var/lib/asterisk/sounds/custom/filename.al",
    "gsm": "/var/lib/asterisk/sounds/custom/filename.gsm",
    "sln16": "/var/lib/asterisk/sounds/custom/filename.sln16"
  },
  "metadata": {
    "name": "Display Name",
    "description": "File description"
  }
}
```

### List Custom Sounds

**GET** `/api/asterisk-sounds/list`

List all custom sound files in the Asterisk sounds directory.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "filename.wav",
      "path": "/var/lib/asterisk/sounds/custom/filename.wav",
      "size": 12345,
      "format": "wav",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Get Monitor Recordings

**GET** `/api/asterisk-sounds/monitor?limit=100`

List call recordings from the Asterisk monitor directory.

**Query Parameters:**
- `limit`: Maximum number of recordings to return (default: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "recording_20240101_120000.wav",
      "path": "/var/spool/asterisk/monitor/2024/01/01/recording.wav",
      "size": 123456,
      "format": "wav",
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

### Stream Audio File

**GET** `/api/asterisk-sounds/:id/stream`

Stream an audio file for playback. Supports custom sounds and monitor recordings.

**Parameters:**
- `id`: Recording ID in format `type_id` (e.g., `custom_filename`, `monitor_recording_name`)

**Response:**
- Content-Type: Audio MIME type
- Streams the audio file directly

### Delete Recording

**DELETE** `/api/asterisk-sounds/:id`

Delete a recording file.

**Parameters:**
- `id`: Recording ID in format `type_id`

**Response:**
```json
{
  "success": true,
  "message": "Recording deleted successfully"
}
```

**Note**: FreePBX recordings cannot be deleted (read-only).

### Reload Asterisk

**POST** `/api/asterisk-sounds/reload`

Reload Asterisk configuration to recognize new sound files.

**Response:**
```json
{
  "success": true,
  "message": "Asterisk reloaded successfully"
}
```

## Directory Structure

The service uses the following directories (configurable via environment variables):

```
/var/lib/asterisk/sounds/custom/    # Custom uploaded audio files
/var/spool/asterisk/monitor/         # Call recordings
backend/uploads/sounds/              # Temporary upload storage
```

### Environment Variables

```bash
ASTERISK_SOUNDS_DIR=/var/lib/asterisk/sounds/custom
ASTERISK_MONITOR_DIR=/var/spool/asterisk/monitor
UPLOAD_SOUNDS_DIR=./uploads/sounds
```

## Audio Format Conversion

The service automatically converts uploaded audio files to multiple Asterisk-compatible formats:

1. **WAV** (8kHz, mono, 16-bit PCM) - Primary format
2. **μ-law** (.ul) - Telephony standard
3. **A-law** (.al) - European telephony standard
4. **GSM** (.gsm) - Compressed format
5. **SLN16** (.sln16) - 16kHz signed linear

### Conversion Process

1. Upload original file to temporary directory
2. Convert to WAV format (8kHz, mono, 16-bit)
3. Generate all format variants from WAV
4. Save to Asterisk sounds directory
5. Set proper file permissions (644)
6. Clean up temporary file

### Dependencies

**System Requirements:**
- `sox` - Sound eXchange utility
- `libsox-fmt-all` - Sox format support

**Installation:**
```bash
apt-get install sox libsox-fmt-all
```

## File Permissions

The service attempts to set file permissions to `644` (readable by all, writable by owner). If permission changes fail (e.g., files owned by asterisk user), warnings are logged but the operation continues.

## Error Handling

- **Invalid file type**: Returns 400 Bad Request
- **File not found**: Returns 404 Not Found
- **Conversion failure**: Returns 400 with error message
- **Permission errors**: Logs warning, continues operation
- **FreePBX operations**: Returns error (read-only)

## Security Considerations

1. **File Upload Validation**: Only allowed MIME types are accepted
2. **File Size Limit**: 50MB maximum file size
3. **Path Sanitization**: File names are sanitized to prevent directory traversal
4. **Tenant Isolation**: All endpoints require tenant authentication
5. **Read-Only FreePBX**: FreePBX database modifications are prevented

## Usage Examples

### Upload Audio File

```bash
curl -X POST http://localhost:5000/api/asterisk-sounds/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "audio=@/path/to/file.wav" \
  -F "name=Welcome Message" \
  -F "description=IVR welcome message"
```

### List Custom Sounds

```bash
curl -X GET http://localhost:5000/api/asterisk-sounds/list \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Stream Audio File

```bash
curl -X GET http://localhost:5000/api/asterisk-sounds/custom_filename/stream \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output audio.wav
```

### Delete Recording

```bash
curl -X DELETE http://localhost:5000/api/asterisk-sounds/custom_filename \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Integration with Call Service

The sound service can be integrated with the call service to use uploaded IVR files:

```typescript
// In calls.service.ts
const ivrFile = await this.asteriskSoundService.listCustomSounds();
// Select appropriate IVR file
const ivrFilePath = ivrFile.find(f => f.name === 'welcome.wav')?.name;
```

## Troubleshooting

### Sox Not Found

**Error**: `Failed to convert audio file. Ensure sox is installed`

**Solution**: Install sox
```bash
apt-get install sox libsox-fmt-all
```

### Permission Denied

**Error**: Files cannot be written to `/var/lib/asterisk/sounds/custom`

**Solution**: Set proper permissions
```bash
sudo chown -R $USER:asterisk /var/lib/asterisk/sounds/custom
sudo chmod 775 /var/lib/asterisk/sounds/custom
```

### Directory Not Found

**Error**: Monitor directory not accessible

**Solution**: Ensure directory exists and is readable
```bash
sudo chmod 755 /var/spool/asterisk/monitor
```

## Future Enhancements

- [ ] Database tracking of uploaded files
- [ ] File versioning
- [ ] Batch upload support
- [ ] Audio file preview generation
- [ ] Integration with IVR file selection in call service
- [ ] File usage tracking
- [ ] Automatic cleanup of old recordings

---

**Implementation Status**: ✅ Complete  
**Last Updated**: Current Date

