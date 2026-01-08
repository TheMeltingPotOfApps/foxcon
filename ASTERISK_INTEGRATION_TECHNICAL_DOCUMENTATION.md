# Asterisk Integration Technical Documentation

## Table of Contents
1. [Overview](#overview)
2. [AMI Executor Service](#ami-executor-service)
3. [AMI Event Listener Service](#ami-event-listener-service)
4. [Make-Call Endpoint](#make-call-endpoint)
5. [Audio Recording Management](#audio-recording-management)
6. [Permission Management](#permission-management)
7. [Phone Number Formatting](#phone-number-formatting)
8. [Call Flow Architecture](#call-flow-architecture)

---

## Overview

This system integrates with Asterisk PBX through the Asterisk Manager Interface (AMI) to:
- Originate outbound calls
- Track call events and state changes
- Manage audio recordings (upload, convert, delete)
- Handle call routing and IVR interactions
- Monitor call completion and statistics

**Key Components:**
- `amiService.js` - AMI connection and call origination
- `amiEventListener.js` - Real-time event monitoring
- `asteriskSoundService.js` - Audio file management
- `recordingService.js` - Call recording lifecycle
- `phoneFormatter.js` - Phone number normalization

---

## AMI Executor Service

**File:** `backend/src/services/amiService.js`

### Connection Management

The AMI service establishes and maintains a persistent connection to Asterisk:

```javascript
const AsteriskManager = require('asterisk-manager');

this.ami = new AsteriskManager(
  process.env.AMI_PORT || 5038,
  process.env.AMI_HOST || 'localhost',
  process.env.AMI_USER || 'admin',
  process.env.AMI_PASSWORD || 'admin',
  true // Enable events
);
```

**Environment Variables:**
- `AMI_PORT` - AMI port (default: 5038)
- `AMI_HOST` - Asterisk server hostname (default: localhost)
- `AMI_USER` - AMI username
- `AMI_PASSWORD` - AMI password

**Connection Lifecycle:**
1. `connect()` - Establishes AMI connection
2. `keepConnected()` - Maintains persistent connection
3. Auto-reconnect on disconnect (5-second delay)
4. Redis connection check before AMI connection

### Event Listeners

The service listens for critical AMI events:

#### OriginateResponse Event
```javascript
this.ami.on('originateresponse', async (evt) => {
  const actionId = evt.actionid;
  const uniqueId = evt.uniqueid;
  const response = evt.response;
  
  if (response === 'Success' && uniqueId) {
    // Store call data in Redis
    await redisService.storeCallInit(uniqueId, {...});
    
    // Update call log with Asterisk unique ID
    this.updateCallLogWithUniqueId(uniqueId, customCallId, to);
    
    // Resolve promise with unique ID
    originateData.resolve({ uniqueId, ... });
  }
});
```

**Key Fields:**
- `actionid` - Matches the originate action ID
- `uniqueid` - Asterisk's unique call identifier
- `response` - "Success" or error reason
- `context` - Must be "DynamicIVR" for processing

#### NewChannel Event
Tracks when a new channel is created:
```javascript
this.ami.on('newchannel', async (evt) => {
  // Only process DynamicIVR context
  if (evt.context !== 'DynamicIVR') return;
  
  // Store event in Redis
  await redisService.addCallEvent(uniqueId, 'channel_created', {...});
});
```

#### NewState Event
Tracks channel state changes (especially when answered):
```javascript
this.ami.on('newstate', async (evt) => {
  if (evt.channelstate === '6') { // 6 = Up/Answered
    await redisService.addCallEvent(uniqueId, 'channel_answered', {...});
  }
});
```

#### Hangup Event
Tracks call termination:
```javascript
this.ami.on('hangup', async (evt) => {
  // Calculate duration and update pending calls
  const duration = Math.floor((Date.now() - callData.startTime) / 1000);
  callData.duration = duration;
  callData.disposition = evt.cause === '16' ? 'ANSWERED' : 'NO ANSWER';
});
```

#### UserEvent Events
Custom events from dialplan:
- `CallAnswered` - Call was answered
- `IVRStarted` - IVR playback started
- `IVRResponse` - User pressed a key
- `TransferAttempt` - Transfer initiated
- `TransferConnected` - Transfer successful
- `TransferFailed` - Transfer failed
- `CallComplete` - Call completed with stats
- `CallHangup` - Call ended

### Make Call Function

**Signature:**
```javascript
async makeCall({
  to,                    // Destination number
  from,                  // Caller ID (DID number)
  transfer_number,       // Transfer destination
  transferNumber,        // Alternative format
  trunk,                 // PJSIP trunk name
  context = 'DynamicIVR', // Dialplan context
  extension = 's',       // Extension to dial
  ivr_file = null,      // IVR audio file path
  ivr_vm_file = null,   // Voicemail audio file path
  wait_strategy = 'random', // Wait strategy
  press_key = '1',       // Key to press for transfer
  amd_enabled = 'true',  // AMD detection enabled
  transfer_prefix = '',  // Transfer prefix
  callId = null         // Custom call ID
})
```

**Process Flow:**

1. **Connection Check**
   ```javascript
   if (!this.connected) {
     await this.connect();
   }
   ```

2. **Phone Number Formatting**
   ```javascript
   const formattedTo = phoneFormatter.formatToE164(to);
   const formattedFrom = phoneFormatter.formatToE164(from);
   const formattedTransferNumber = phoneFormatter.formatToE164(transfer_number);
   ```

3. **Generate Action ID**
   ```javascript
   const actionId = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
   const customCallId = callId || actionId;
   ```

4. **Build AMI Originate Action**
   ```javascript
   const action = {
     action: 'Originate',
     actionid: actionId,
     channel: `PJSIP/${formattedTo}@${trunk}`,
     context: context,
     exten: extension,
     priority: 1,
     callerid: `"${formattedFrom}" <${formattedFrom}>`,
     timeout: 30000,
     async: true,
     variable: {
       // DynamicIVR dialplan variables
       to: formattedTo,
       from: formattedFrom,
       transfer_number: formattedTransferNumber,
       ivr_file: ivr_file || '',
       ivr_vm_file: ivr_vm_file || '',
       wait_strategy: wait_strategy || 'random',
       press_key: press_key || '1',
       amd_enabled: amd_enabled || 'true',
       transfer_prefix: transfer_prefix || '',
       custom_call_id: customCallId,
       trunk: trunk,
       // Backward compatibility
       TRANSFER_NUMBER: formattedTransferNumber,
       FROM_NUMBER: formattedFrom,
       TO_NUMBER: formattedTo,
       TRUNK: trunk
     }
   };
   ```

5. **Send Action and Wait for Response**
   ```javascript
   return new Promise((resolve, reject) => {
     // Store promise handlers
     this.pendingOriginates.set(actionId, {
       resolve,
       reject,
       customCallId,
       to: formattedTo,
       from: formattedFrom,
       transferNumber: formattedTransferNumber,
       trunk,
       timestamp: Date.now()
     });
     
     // Send action
     this.ami.action(action, (err, res) => {
       if (err) {
         this.pendingOriginates.delete(actionId);
         reject(err);
       } else {
         // Wait for OriginateResponse event
         setTimeout(() => {
           if (this.pendingOriginates.has(actionId)) {
             reject(new Error('OriginateResponse timeout'));
           }
         }, 35000);
       }
     });
   });
   ```

### Memory Management

**Cleanup Timer:**
- Runs every 5 seconds
- Cleans up stale pending originates (30-second timeout)
- Cleans up stale pending calls (60-second timeout)
- Limits map sizes to prevent memory leaks:
  - `pendingOriginates`: max 50 entries
  - `pendingCalls`: max 50 entries
  - `eventBuffer`: max 100 entries

**Event Deduplication:**
- Uses `eventBuffer` Map to track recent events
- Prevents duplicate event processing
- 15-second buffer window

---

## AMI Event Listener Service

**File:** `backend/src/services/amiEventListener.js`

### Purpose

Separate service dedicated to monitoring AMI events and updating call logs in real-time.

### Connection

Same connection pattern as AMI Service but with separate instance:
```javascript
this.ami = new AsteriskManager(
  process.env.AMI_PORT || 5038,
  process.env.AMI_HOST || 'localhost',
  process.env.AMI_USER || 'admin',
  process.env.AMI_PASSWORD || 'admin',
  true
);
```

### Event Handlers

#### NewChannel Handler
```javascript
handleNewChannel(evt) {
  const callData = {
    uniqueId: evt.uniqueid,
    channel: evt.channel,
    callerIdNum: evt.calleridnum,
    startTime: new Date(),
    state: evt.channelstate
  };
  
  this.activeCalls.set(evt.uniqueid, callData);
  this.callChannels.set(evt.channel, evt.uniqueid);
  
  // Update call log with Asterisk unique ID
  this.updateCallLogWithUniqueId(evt.uniqueid, evt.calleridnum);
}
```

#### Dial Handler
Tracks dial attempts:
```javascript
handleDial(evt) {
  const call = this.activeCalls.get(evt.uniqueid);
  if (call) {
    call.dialStatus = evt.dialstatus;
    call.destChannel = evt.destchannel;
    if (evt.dialstatus === 'ANSWER') {
      call.answerTime = new Date();
    }
  }
}
```

#### Bridge Handler
Tracks when channels are bridged (connected):
```javascript
handleBridge(evt) {
  const call1 = this.activeCalls.get(evt.uniqueid1);
  const call2 = this.activeCalls.get(evt.uniqueid2);
  
  if (call1) {
    call1.bridgeState = evt.bridgestate;
    call1.bridgeTime = new Date();
  }
}
```

#### UserEvent Handler
Processes custom dialplan events:
```javascript
handleUserEvent(evt) {
  const eventType = evt.userevent || evt.eventname;
  
  switch (eventType) {
    case 'CallStatus':
      // Handle status updates from DynamicIVR
      if (evt.status === 'answered') {
        call.callAnswered = true;
        call.answerTime = new Date();
      }
      break;
    case 'TransferConnected':
      call.transferStatus = 'completed';
      call.transferBillableSeconds = parseInt(evt.duration) || 0;
      break;
    // ... other cases
  }
  
  this.updateCallLogEvent(phoneNumber, eventType, evt, customCallId);
}
```

### Call Log Updates

**updateCallLogEvent Function:**
```javascript
async updateCallLogEvent(phoneNumber, eventType, eventData, callId = null) {
  // Find call log by custom call ID or phone number
  let recentCall = null;
  
  if (callId) {
    recentCall = await CallLog.findOne({
      where: { unique_id: callId }
    });
  }
  
  if (!recentCall) {
    recentCall = await CallLog.findOne({
      where: {
        to: phoneNumber,
        createdAt: { [Op.gte]: new Date(Date.now() - 300000) }
      },
      order: [['createdAt', 'DESC']]
    });
  }
  
  if (recentCall) {
    // Update call flow events array
    let callFlowEvents = JSON.parse(recentCall.callFlowEvents || '[]');
    callFlowEvents.push({
      type: eventType,
      timestamp: new Date(),
      data: eventData
    });
    
    // Update specific fields based on event type
    const updateData = {
      callFlowEvents: JSON.stringify(callFlowEvents),
      // ... event-specific fields
    };
    
    await recentCall.update(updateData);
  }
}
```

### Health Check Monitoring

Periodic health checks every 60 seconds:
```javascript
async performHealthCheck() {
  await new Promise((resolve, reject) => {
    this.ami.action({
      action: 'Ping'
    }, (err, res) => {
      if (err) {
        this.connected = false;
        reject(err);
      } else {
        console.log(`✓ System operational | Active: ${this.callStats.activeCalls} calls`);
        resolve(res);
      }
    });
  });
}
```

### Cleanup

Automatic cleanup every 30 seconds:
- Removes activeCalls older than 5 minutes
- Removes callChannels older than 5 minutes
- Warns if maps exceed 5000 entries

---

## Make-Call Endpoint

**File:** `backend/src/routes/callRoutes.js`  
**Endpoint:** `POST /api/calls/make-call`

### Request Body

```json
{
  "to": "+17065551234",
  "from": "brandId_or_phoneId",
  "context": "DynamicIVR" // Optional
}
```

### Process Flow

#### Step 1: Brand Resolution
```javascript
const parsedBrandId = parseInt(from, 10);
let brand = null;

if (!Number.isNaN(parsedBrandId)) {
  brand = await Brand.findByPk(parsedBrandId);
}

if (!brand) {
  brand = await Brand.findOne({ 
    where: { phoneId: from, status: 'active' }
  });
}
```

#### Step 2: DID Selection
```javascript
const availableDID = await tenCallRotation.getNextDID(brand.id);

// Query from did_mgmt_dids table
SELECT * FROM did_mgmt_dids
WHERE brandId = :brandId
  AND status IN ('active', 'available')
ORDER BY usageCount ASC, id ASC
LIMIT 1

// Update usage count
UPDATE did_mgmt_dids
SET usageCount = usageCount + 1,
    lastUsed = NOW()
WHERE id = :id
```

#### Step 3: Transfer Number Selection
```javascript
const brandTransferNumbers = await TransferNumber.findAll({
  where: { brandId: brand.id, status: 'active' },
  order: [['id', 'ASC']]
});

// Weighted random selection based on distributionPercentage
let selectedTransferNumber = null;
const random = Math.random() * 100;
let accumulated = 0;

for (const tn of brandTransferNumbers) {
  accumulated += tn.distributionPercentage;
  if (random <= accumulated) {
    selectedTransferNumber = tn;
    break;
  }
}
```

#### Step 4: Brand Settings & IVR Files
```javascript
const [brandSettings] = await BrandCallSettings.findOrCreate({
  where: { brandId: brand.id },
  defaults: {}
});

// Load IVR file if configured
let ivrFilePath = '';
if (brandSettings.ivrId) {
  const ivrFile = await IVRFile.findByPk(brandSettings.ivrId);
  if (ivrFile) {
    ivrFilePath = ivrFile.storagePath || '';
    // Remove leading slash and extension
    ivrFilePath = ivrFilePath.replace(/^\//, '').replace(/\.(wav|mp3|gsm|ulaw|alaw)$/i, '');
  }
}

// Load voicemail file if configured
let vmFilePath = '';
if (brandSettings.voicemailAudioId) {
  const vmFile = await IVRFile.findByPk(brandSettings.voicemailAudioId);
  if (vmFile) {
    vmFilePath = vmFile.storagePath || '';
    vmFilePath = vmFilePath.replace(/^\//, '').replace(/\.(wav|mp3|gsm|ulaw|alaw)$/i, '');
  }
}
```

#### Step 5: Call Parameters
```javascript
const callId = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
const callContext = context || brandSettings.context || 'DynamicIVR';

const callParams = {
  to,
  from: availableDID.number,
  transfer_number: brandSettings.amdTransferPrefix 
    ? `${brandSettings.amdTransferPrefix}${selectedTransferNumber.number}` 
    : selectedTransferNumber.number,
  transferNumber: selectedTransferNumber.number,
  trunk: selectedTransferNumber.trunk,
  context: callContext,
  extension: 's',
  callId,
  ivr_file: ivrFilePath,
  ivr_vm_file: vmFilePath,
  wait_strategy: brandSettings.amdWaitStrategy || 'random',
  press_key: brandSettings.amdPressKey || '1',
  amd_enabled: brandSettings.amdEnabled ? 'true' : 'false',
  transfer_prefix: brandSettings.amdTransferPrefix || ''
};
```

#### Step 6: Create Call Log
```javascript
const callLog = await CallLog.create({
  from: availableDID.number,
  to: to,
  transferNumber: callParams.transferNumber,
  trunk: callParams.trunk,
  context: callContext,
  brandId: brand.id,
  didId: availableDID.id,
  status: 'initiated',
  callStatus: 'initiated',
  uniqueId: callId,
  destinationNumber: to,
  callerId: availableDID.number,
  phoneNumber: to,
  didUsed: availableDID.number
});
```

#### Step 7: Execute AMI Call
```javascript
const amiResponse = await amiService.makeCall(callParams);

if (amiResponse && amiResponse.uniqueId) {
  await callLog.update({
    status: 'connected',
    uniqueId: amiResponse.uniqueId // Asterisk's actual unique ID
  });
}
```

### Response Format

```json
{
  "success": true,
  "callId": 12345,
  "asteriskUniqueId": "1234567890.123",
  "callDetails": {
    "brand": {
      "name": "Brand Name",
      "phoneId": "brand_phone_id"
    },
    "did": {
      "number": "+14045556789",
      "usageCount": 5,
      "maxUsage": 10,
      "areaCode": "404"
    },
    "to": "+17065551234",
    "from": "+14045556789",
    "transferNumber": "+17065559999",
    "trunk": "PJSIP",
    "context": "DynamicIVR"
  },
  "amiResponse": {
    "success": true,
    "uniqueId": "1234567890.123",
    "status": "originated"
  },
  "message": "Call initiated successfully (DID usage: 5/10)"
}
```

---

## Audio Recording Management

**File:** `backend/src/services/asteriskSoundService.js`

### Directory Structure

```
/var/lib/asterisk/sounds/
  └── custom/              # Custom uploaded audio files
/var/spool/asterisk/monitor/  # Call recordings
backend/uploads/sounds/      # Temporary upload storage
```

### Upload Process

#### 1. File Upload Endpoint
**Route:** `POST /api/asterisk-sounds/upload`

**Middleware:**
```javascript
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'audio/wav', 'audio/mpeg', 'audio/mp3',
      'audio/x-wav', 'audio/basic', 'audio/ogg',
      'audio/webm', 'audio/x-m4a'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});
```

#### 2. Upload Recording Function
```javascript
async uploadRecording(file, metadata = {}) {
  const { originalname, buffer, mimetype } = file;
  const fileId = crypto.randomBytes(8).toString('hex');
  const safeName = originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const baseFileName = `upload_${fileId}_${safeName}`;
  
  // Save original file
  const originalPath = path.join(this.uploadDir, baseFileName);
  await fs.writeFile(originalPath, buffer);
  
  // Convert to Asterisk-compatible formats
  const convertedFiles = await this.convertToAsteriskFormats(
    originalPath, 
    metadata.name || safeName
  );
  
  // Optionally add to FreePBX recordings
  if (metadata.addToFreePBX) {
    await this.addToFreePBXRecordings(
      metadata.name || safeName,
      metadata.description || '',
      convertedFiles.wav
    );
  }
  
  return {
    id: fileId,
    originalName: originalname,
    safeName: baseFileName,
    formats: convertedFiles,
    metadata
  };
}
```

### Audio Format Conversion

**Supported Formats:**
- WAV (8kHz, mono, 16-bit PCM)
- μ-law (ulaw)
- A-law (alaw)
- GSM
- SLN16 (16kHz signed linear)

**Conversion Process:**
```javascript
async convertToAsteriskFormats(sourcePath, baseName) {
  const cleanBaseName = baseName.replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  
  // Convert to WAV (8kHz, mono, 16-bit PCM)
  const wavPath = path.join(this.customSoundsDir, `${cleanBaseName}.wav`);
  await execAsync(`sox "${sourcePath}" -r 8000 -c 1 -b 16 "${wavPath}"`);
  
  // Convert to μ-law
  const ulawPath = path.join(this.customSoundsDir, `${cleanBaseName}.ul`);
  await execAsync(`sox "${wavPath}" -e u-law "${ulawPath}"`);
  
  // Convert to A-law
  const alawPath = path.join(this.customSoundsDir, `${cleanBaseName}.al`);
  await execAsync(`sox "${wavPath}" -e a-law "${alawPath}"`);
  
  // Convert to GSM
  const gsmPath = path.join(this.customSoundsDir, `${cleanBaseName}.gsm`);
  await execAsync(`sox "${wavPath}" -r 8000 -c 1 "${gsmPath}"`);
  
  // Convert to SLN16
  const sln16Path = path.join(this.customSoundsDir, `${cleanBaseName}.sln16`);
  await execAsync(`sox "${sourcePath}" -r 16000 -c 1 -t raw -e signed-integer -b 16 "${sln16Path}"`);
  
  return {
    wav: wavPath,
    ulaw: ulawPath,
    alaw: alawPath,
    gsm: gsmPath,
    sln16: sln16Path
  };
}
```

**Dependencies:**
- `sox` - Sound eXchange utility (must be installed)
- Command: `apt-get install sox libsox-fmt-all`

### FreePBX Integration

**Add to FreePBX Recordings:**
```javascript
async addToFreePBXRecordings(displayname, description, filepath) {
  const sequelize = require('../config/database');
  
  // Read file content for blob storage
  const fileContent = await fs.readFile(filepath);
  
  // Insert into FreePBX recordings table
  await sequelize.query(`
    INSERT INTO recordings 
    (displayname, filename, description, fcode, fcode_pass) 
    VALUES (?, ?, ?, 0, '')
  `, {
    replacements: [displayname, fileContent, description]
  });
  
  // Reload Asterisk to recognize new recording
  await this.reloadAsterisk();
  
  return true;
}
```

### Delete Recording

**Process:**
```javascript
async deleteRecording(recordingId) {
  const [type, id] = recordingId.split('_', 2);
  
  if (type === 'freepbx') {
    // Delete from FreePBX database
    await sequelize.query(`
      DELETE FROM recordings 
      WHERE id = ?
    `, { replacements: [id] });
  } else if (type === 'custom') {
    // Delete all format variants
    const baseName = id.replace(/\.[^.]+$/, '');
    const formats = ['wav', 'ul', 'al', 'gsm', 'sln16', 'mp3'];
    
    for (const format of formats) {
      const filePath = path.join(this.customSoundsDir, `${baseName}.${format}`);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        // File might not exist in this format
      }
    }
  } else if (type === 'monitor') {
    // Delete monitor recording
    const recordings = await this.getMonitorRecordings();
    const recording = recordings.find(r => r.name === id);
    if (recording) {
      await fs.unlink(recording.path);
    }
  }
  
  return true;
}
```

### Stream Audio File

**Endpoint:** `GET /api/asterisk-sounds/:id/stream`

```javascript
async streamAudioFile(recordingId, res) {
  const [type, id] = recordingId.split('_', 2);
  let filePath;
  
  if (type === 'freepbx') {
    // Get from database and write to temp file
    const [[recording]] = await sequelize.query(`
      SELECT filename FROM recordings 
      WHERE id = ?
    `, { replacements: [id] });
    
    const tempPath = path.join('/tmp', `freepbx_${id}.wav`);
    await fs.writeFile(tempPath, recording.filename);
    filePath = tempPath;
  } else if (type === 'custom') {
    // Try various formats
    const formats = ['wav', 'mp3', 'ul', 'al', 'gsm'];
    for (const format of formats) {
      const testPath = path.join(this.customSoundsDir, 
        id.includes('.') ? id : `${id}.${format}`);
      try {
        await fs.access(testPath);
        filePath = testPath;
        break;
      } catch (err) {
        // Try next format
      }
    }
  } else if (type === 'monitor') {
    const recordings = await this.getMonitorRecordings();
    const recording = recordings.find(r => r.name === id);
    if (recording) {
      filePath = recording.path;
    }
  }
  
  if (!filePath) {
    return res.status(404).json({ error: 'Recording file not found' });
  }
  
  const stat = await fs.stat(filePath);
  const mimeType = this.getMimeType(filePath);
  
  res.writeHead(200, {
    'Content-Type': mimeType,
    'Content-Length': stat.size,
    'Content-Disposition': `inline; filename="${path.basename(filePath)}"`
  });
  
  const stream = require('fs').createReadStream(filePath);
  stream.pipe(res);
  
  // Clean up temp file if FreePBX
  if (type === 'freepbx') {
    stream.on('end', () => {
      fs.unlink(filePath).catch(() => {});
    });
  }
}
```

### Get Monitor Recordings

**Recursive Directory Search:**
```javascript
async getMonitorRecordings(limit = 100) {
  const recordings = [];
  
  const walkDir = async (dir, depth = 0) => {
    if (depth > 5) return; // Prevent deep recursion
    
    const files = await fs.readdir(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isDirectory() && depth < 3) {
        await walkDir(filePath, depth + 1);
      } else if (stats.isFile() && this.isAudioFile(file)) {
        recordings.push({
          name: file,
          path: filePath,
          size: stats.size,
          format: path.extname(file).substring(1),
          createdAt: stats.birthtime
        });
        
        if (recordings.length >= limit) break;
      }
    }
  };
  
  await walkDir(this.monitorDir);
  recordings.sort((a, b) => b.createdAt - a.createdAt);
  
  return recordings.slice(0, limit);
}
```

### Reload Asterisk

**Reload Configuration:**
```javascript
async reloadAsterisk() {
  try {
    await execAsync('asterisk -rx "core reload"');
    return true;
  } catch (error) {
    // Try alternative reload command
    try {
      await execAsync('asterisk -rx "reload"');
      return true;
    } catch (err) {
      return false;
    }
  }
}
```

---

## Permission Management

### Directory Permissions

**Critical Directories:**
- `/var/lib/asterisk/sounds/custom` - Must be writable by application user
- `/var/spool/asterisk/monitor` - Must be readable by application user
- `backend/uploads/sounds` - Application-owned directory

### Permission Setup

**During Deployment:**
```bash
# Set ownership for Asterisk directories
chown -R asterisk:asterisk /var/lib/asterisk/sounds/custom
chmod 755 /var/lib/asterisk/sounds/custom

# Ensure application can read monitor directory
chmod 755 /var/spool/asterisk/monitor

# Application upload directory
chown -R appuser:appuser backend/uploads/sounds
chmod 755 backend/uploads/sounds
```

### File Operations

**When Writing Files:**
```javascript
// After conversion, ensure proper permissions
await fs.chmod(filePath, 0o644); // Readable by all, writable by owner

// If needed, change ownership
await execAsync(`chown asterisk:asterisk "${filePath}"`);
```

**When Deleting Files:**
```javascript
// Check if file exists and is accessible
try {
  await fs.access(filePath);
  await fs.unlink(filePath);
} catch (error) {
  // Handle permission errors gracefully
  if (error.code === 'EACCES') {
    // Try with sudo or different user
    await execAsync(`sudo rm "${filePath}"`);
  }
}
```

### Best Practices

1. **Run Application with Appropriate User:**
   - Application should run as non-root user
   - Use `sudo` only when necessary for Asterisk-owned files

2. **Group Permissions:**
   - Add application user to `asterisk` group
   - Set group write permissions: `chmod g+w /var/lib/asterisk/sounds/custom`

3. **Temporary Files:**
   - Use `/tmp` for temporary files
   - Clean up after use
   - Set restrictive permissions: `chmod 600 /tmp/file`

4. **Error Handling:**
   ```javascript
   try {
     await fs.writeFile(filePath, buffer);
   } catch (error) {
     if (error.code === 'EACCES') {
       // Permission denied - try with elevated privileges
       await execAsync(`sudo cp "${tempPath}" "${filePath}"`);
       await execAsync(`sudo chown asterisk:asterisk "${filePath}"`);
     } else {
       throw error;
     }
   }
   ```

---

## Phone Number Formatting

**File:** `backend/src/utils/phoneFormatter.js`

### Format to E.164

```javascript
formatToE164(phoneNumber) {
  // Remove all non-digit characters
  let cleaned = String(phoneNumber).replace(/\D/g, '');
  
  // 11 digits starting with 1: add + prefix
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return '+' + cleaned;
  }
  
  // 10 digits: add +1 prefix
  if (cleaned.length === 10) {
    return '+1' + cleaned;
  }
  
  // Invalid: throw error
  if (cleaned.length < 10) {
    throw new Error(`Invalid phone number: ${phoneNumber}`);
  }
  
  return '+' + cleaned;
}
```

### Usage in AMI Calls

All phone numbers are normalized before sending to Asterisk:
```javascript
const formattedTo = phoneFormatter.formatToE164(to);
const formattedFrom = phoneFormatter.formatToE164(from);
const formattedTransferNumber = phoneFormatter.formatToE164(transfer_number);
```

---

## Call Flow Architecture

### Complete Call Lifecycle

```
1. POST /api/calls/make-call
   ├── Resolve Brand
   ├── Select DID (with rotation)
   ├── Select Transfer Number (weighted)
   ├── Load Brand Settings & IVR Files
   ├── Create Call Log
   └── Call amiService.makeCall()
       │
2. AMI Originate Action
   ├── Generate Action ID
   ├── Format Phone Numbers
   ├── Build AMI Action
   └── Send to Asterisk
       │
3. Asterisk Processing
   ├── OriginateResponse Event → AMI Service
   ├── NewChannel Event → AMI Event Listener
   ├── DynamicIVR Dialplan Execution
   │   ├── Play IVR (if configured)
   │   ├── AMD Detection (if enabled)
   │   ├── Voicemail Drop (if configured)
   │   └── Transfer to Agent
   ├── UserEvent Events → AMI Event Listener
   └── Hangup Event → AMI Event Listener
       │
4. Event Processing
   ├── Store in Redis (if available)
   ├── Update Call Log
   └── Track Call Statistics
       │
5. Call Completion
   ├── CDR Event → AMI Event Listener
   ├── Final Call Log Update
   └── Cleanup Tracking Data
```

### Event Sequence

**Typical Event Flow:**
1. `OriginateResponse` - Call initiated
2. `NewChannel` - Channel created
3. `NewState` (state=6) - Call answered
4. `UserEvent:IVRStarted` - IVR playback started
5. `UserEvent:IVRResponse` - User pressed key
6. `UserEvent:TransferAttempt` - Transfer initiated
7. `UserEvent:TransferConnected` - Transfer successful
8. `UserEvent:CallComplete` - Call completed
9. `Hangup` - Channel terminated
10. `CDR` - Call Detail Record

### Error Handling

**Originate Failures:**
- Timeout after 35 seconds
- Reject promise with error
- Update call log status to 'failed'

**Connection Failures:**
- Auto-reconnect after 5 seconds
- Retry connection indefinitely
- Log connection status

**Event Processing Failures:**
- Continue processing other events
- Log error but don't crash
- Graceful degradation

---

## Related Services

### Recording Service

**File:** `backend/src/services/recordingService.js`

**Start Recording:**
```javascript
async startRecording(channel, callLogId) {
  const filename = `call_${callLogId}_${Date.now()}`;
  
  await amiService.action({
    action: 'MixMonitor',
    channel: channel,
    file: `${filename}.wav`,
    options: 'b'
  });
  
  const recording = await CallRecording.create({
    callLogId,
    recordingPath: `${this.recordingsPath}/${filename}.wav`,
    format: 'wav'
  });
  
  return recording;
}
```

**Stop Recording:**
```javascript
async stopRecording(channel) {
  await amiService.action({
    action: 'StopMixMonitor',
    channel: channel
  });
}
```

### Redis Service Integration

**Store Call Init:**
```javascript
await redisService.storeCallInit(uniqueId, {
  unique_id: uniqueId,
  custom_call_id: customCallId,
  to: formattedTo,
  from: formattedFrom,
  transfer_number: formattedTransferNumber,
  trunk: trunk,
  originated_at: new Date().toISOString(),
  status: 'originated'
});
```

**Add Call Event:**
```javascript
await redisService.addCallEvent(uniqueId, 'call_answered', {
  call_to: evt.callto,
  call_from: evt.callfrom,
  transfer_number: evt.transfernumber
});
```

---

## Environment Variables

**Required:**
```bash
AMI_PORT=5038
AMI_HOST=localhost
AMI_USER=admin
AMI_PASSWORD=admin_password
RECORDINGS_PATH=/var/spool/asterisk/monitor
```

**Optional:**
```bash
AMI_DEBUG=false
ENABLE_TRANSCRIPTION=false
```

---

## Dependencies

**Node.js Packages:**
- `asterisk-manager` - AMI client library
- `multer` - File upload handling
- `sequelize` - Database ORM
- `redis` - Redis client (optional)

**System Packages:**
- `sox` - Audio conversion utility
- `libsox-fmt-all` - Sox format support

**Installation:**
```bash
npm install asterisk-manager multer sequelize redis
apt-get install sox libsox-fmt-all
```

---

## Testing

### Test AMI Connection
```javascript
const amiService = require('./services/amiService');
await amiService.connect();
console.log('AMI Connected:', amiService.connected);
```

### Test Make Call
```bash
curl -X POST http://localhost:4001/api/calls/make-call \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+17065551234",
    "from": "brand_phone_id"
  }'
```

### Test Audio Upload
```bash
curl -X POST http://localhost:4001/api/asterisk-sounds/upload \
  -F "audio=@/path/to/file.wav" \
  -F "name=test_recording" \
  -F "description=Test audio file" \
  -F "addToFreePBX=false"
```

---

## Troubleshooting

### Common Issues

**1. AMI Connection Failed**
- Check AMI credentials in `.env`
- Verify Asterisk is running: `asterisk -rx "core show version"`
- Check firewall: `telnet localhost 5038`

**2. Permission Denied on Audio Files**
- Check directory ownership: `ls -la /var/lib/asterisk/sounds/custom`
- Add user to asterisk group: `usermod -a -G asterisk appuser`
- Set permissions: `chmod 755 /var/lib/asterisk/sounds/custom`

**3. Audio Conversion Failed**
- Verify sox is installed: `which sox`
- Check file format: `file audio.wav`
- Test conversion manually: `sox input.wav -r 8000 -c 1 output.wav`

**4. Call Not Originating**
- Check dialplan: `asterisk -rx "dialplan show DynamicIVR"`
- Verify trunk exists: `asterisk -rx "pjsip show endpoints"`
- Check AMI logs: `tail -f /var/log/asterisk/full`

**5. Events Not Received**
- Verify event filtering: Check `context === 'DynamicIVR'`
- Enable debug mode: `AMI_DEBUG=true`
- Check event buffer: Monitor `processedEvents` size

---

## Summary

This documentation covers all Asterisk-related integrations:

1. **AMI Executor** - Handles call origination and immediate responses
2. **AMI Event Listener** - Monitors and processes call events
3. **Make-Call Endpoint** - Complete call initiation flow
4. **Audio Management** - Upload, convert, delete audio files
5. **Permission Handling** - File system access management
6. **Phone Formatting** - Number normalization
7. **Call Flow** - End-to-end call lifecycle

All services are designed to work independently but integrate seamlessly for complete call management functionality.

