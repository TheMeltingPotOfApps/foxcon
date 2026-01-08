# PBX Technical Reference Guide

## Quick Start for Developers

### Prerequisites
- Asterisk 18+ with PJSIP
- Node.js 18+
- PostgreSQL database
- WebSocket-capable browser

### Installation Steps

#### 1. Backend Dependencies
```bash
cd backend
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

#### 2. Frontend Dependencies
```bash
cd frontend
npm install socket.io-client
```

#### 3. Database Migrations
```bash
# Create migration files for new entities
npm run migration:generate -- -n CreatePbxTables
npm run migration:run
```

### Key File Locations

#### Backend
- `backend/src/pbx/` - Main PBX module
- `backend/src/entities/agent-extension.entity.ts` - Agent extension entity
- `backend/src/entities/call-session.entity.ts` - Call session entity
- `backend/src/asterisk/` - Existing Asterisk integration

#### Frontend
- `frontend/app/(app)/pbx/agent/` - Agent interface
- `frontend/app/(app)/pbx/manager/` - Manager dashboard
- `frontend/components/pbx/` - PBX components

---

## API Endpoints

### Agent Endpoints

#### POST `/api/pbx/agent/login`
Login agent and initialize WebSocket connection
```typescript
{
  extension: string;
  password: string;
}
```

#### POST `/api/pbx/agent/status`
Update agent status
```typescript
{
  status: 'AVAILABLE' | 'BUSY' | 'AWAY' | 'OFFLINE';
}
```

#### POST `/api/pbx/calls/dial`
Initiate outbound call
```typescript
{
  phoneNumber: string;
  contactId?: string;
}
```

#### POST `/api/pbx/calls/:callId/answer`
Answer incoming call
```typescript
{
  callId: string;
}
```

#### POST `/api/pbx/calls/:callId/hangup`
Hangup call
```typescript
{
  callId: string;
}
```

#### POST `/api/pbx/calls/:callId/hold`
Hold call
```typescript
{
  callId: string;
}
```

#### POST `/api/pbx/calls/:callId/transfer`
Transfer call
```typescript
{
  callId: string;
  target: string; // Extension or phone number
  type: 'blind' | 'attended';
}
```

#### POST `/api/pbx/calls/:callId/mute`
Mute/unmute microphone
```typescript
{
  callId: string;
  muted: boolean;
}
```

#### POST `/api/pbx/calls/:callId/notes`
Update call notes
```typescript
{
  callId: string;
  notes: string;
  disposition?: CallDisposition;
}
```

### Manager Endpoints

#### GET `/api/pbx/manager/agents`
Get all agents with status
```typescript
Response: {
  agents: Array<{
    id: string;
    name: string;
    extension: string;
    status: AgentStatus;
    currentCall?: CallSession;
  }>;
}
```

#### GET `/api/pbx/manager/queues`
Get queue status
```typescript
Response: {
  queues: Array<{
    id: string;
    name: string;
    waiting: number;
    agents: number;
    longestWait: number;
  }>;
}
```

#### GET `/api/pbx/manager/metrics`
Get call metrics
```typescript
Query params: {
  startDate: string;
  endDate: string;
  agentId?: string;
}

Response: {
  totalCalls: number;
  answeredCalls: number;
  abandonedCalls: number;
  avgWaitTime: number;
  avgCallDuration: number;
  serviceLevel: number; // Percentage
}
```

#### GET `/api/pbx/manager/reports/agent-performance`
Agent performance report
```typescript
Query params: {
  agentId: string;
  startDate: string;
  endDate: string;
}

Response: {
  agent: User;
  callsHandled: number;
  avgCallDuration: number;
  avgWrapUpTime: number;
  availability: number; // Percentage
  callsByDisposition: Record<CallDisposition, number>;
}
```

---

## WebSocket Events

### Client → Server Events

#### `agent:login`
```typescript
{
  agentId: string;
  extension: string;
}
```

#### `agent:status:change`
```typescript
{
  status: AgentStatus;
}
```

#### `call:answer`
```typescript
{
  callId: string;
}
```

#### `call:hangup`
```typescript
{
  callId: string;
}
```

#### `call:hold`
```typescript
{
  callId: string;
  hold: boolean;
}
```

#### `call:mute`
```typescript
{
  callId: string;
  mute: boolean;
}
```

#### `call:transfer`
```typescript
{
  callId: string;
  target: string;
  type: 'blind' | 'attended';
}
```

#### `call:dial`
```typescript
{
  phoneNumber: string;
  contactId?: string;
}
```

### Server → Client Events

#### `call:incoming`
```typescript
{
  callId: string;
  callSessionId: string;
  from: string;
  to: string;
  contactId?: string;
  contact?: Contact;
}
```

#### `call:state:changed`
```typescript
{
  callId: string;
  callSessionId: string;
  status: CallSessionStatus;
  metadata?: any;
}
```

#### `call:ended`
```typescript
{
  callId: string;
  callSessionId: string;
  duration: number;
  disposition?: CallDisposition;
}
```

#### `agent:status:updated`
```typescript
{
  agentId: string;
  status: AgentStatus;
}
```

#### `queue:update`
```typescript
{
  queueId: string;
  waiting: number;
  agents: number;
  longestWait: number;
}
```

#### `presence:update`
```typescript
{
  agentId: string;
  status: AgentStatus;
  currentCall?: {
    callId: string;
    contactName?: string;
    duration: number;
  };
}
```

---

## Asterisk AMI Commands

### Queue Management

#### Add Agent to Queue
```typescript
{
  action: 'QueueAdd',
  queue: '2001',
  interface: 'PJSIP/1001',
  penalty: 0,
  paused: false,
}
```

#### Remove Agent from Queue
```typescript
{
  action: 'QueueRemove',
  queue: '2001',
  interface: 'PJSIP/1001',
}
```

#### Get Queue Status
```typescript
{
  action: 'QueueStatus',
  queue: '2001',
}
```

### Call Control

#### Originate Call
```typescript
{
  action: 'Originate',
  channel: 'PJSIP/1001',
  context: 'pbx-outbound',
  exten: '15551234567',
  priority: 1,
  callerid: '15559876543',
  timeout: 30000,
  async: true,
}
```

#### Bridge Channels
```typescript
{
  action: 'Bridge',
  channel1: 'PJSIP/channel1',
  channel2: 'PJSIP/channel2',
  tone: 'none',
}
```

#### Redirect Call
```typescript
{
  action: 'Redirect',
  channel: 'PJSIP/channel1',
  context: 'pbx-internal',
  exten: '1002',
  priority: 1,
}
```

#### Monitor Call (Recording)
```typescript
{
  action: 'Monitor',
  channel: 'PJSIP/channel1',
  file: 'call-recording-{uniqueId}',
  format: 'wav',
  mix: true,
}
```

---

## Database Queries

### Get Available Agents
```typescript
const availableAgents = await agentExtensionRepository.find({
  where: {
    tenantId,
    status: AgentStatus.AVAILABLE,
    isActive: true,
  },
  relations: ['user'],
});
```

### Get Active Call Session
```typescript
const callSession = await callSessionRepository.findOne({
  where: {
    agentId,
    status: In([CallSessionStatus.CONNECTED, CallSessionStatus.RINGING]),
  },
  relations: ['callLog', 'contact'],
});
```

### Get Queue Statistics
```typescript
const stats = await callSessionRepository
  .createQueryBuilder('session')
  .select('COUNT(*)', 'total')
  .addSelect('AVG(session.duration)', 'avgDuration')
  .where('session.createdAt >= :startDate', { startDate })
  .andWhere('session.createdAt <= :endDate', { endDate })
  .andWhere('session.tenantId = :tenantId', { tenantId })
  .getRawOne();
```

---

## WebRTC Setup

### Browser Side
```typescript
// Get user media
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
  },
});

// Create peer connection
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // Add TURN server if needed
  ],
});

// Add local tracks
stream.getTracks().forEach(track => {
  pc.addTrack(track, stream);
});

// Handle remote stream
pc.ontrack = (event) => {
  const remoteAudio = new Audio();
  remoteAudio.srcObject = event.streams[0];
  remoteAudio.play();
};

// Create offer
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
// Send offer to server via WebSocket
```

### Server Side (Asterisk)
Asterisk handles WebRTC through PJSIP. The backend needs to:
1. Receive SDP offer from browser
2. Create PJSIP endpoint if needed
3. Send SDP to Asterisk
4. Receive SDP answer from Asterisk
5. Send answer back to browser

---

## Error Handling

### Common Errors

#### Agent Not Found
```typescript
throw new NotFoundException('Agent extension not found');
```

#### Agent Already on Call
```typescript
throw new BadRequestException('Agent is already on a call');
```

#### No Available Agents
```typescript
throw new BadRequestException('No available agents in queue');
```

#### Call Not Found
```typescript
throw new NotFoundException('Call session not found');
```

#### WebSocket Connection Lost
- Implement reconnection logic
- Show notification to user
- Attempt to reconnect automatically

---

## Performance Optimization

### Database Indexes
```sql
CREATE INDEX idx_agent_extensions_tenant_status ON agent_extensions(tenant_id, status);
CREATE INDEX idx_call_sessions_agent_status ON call_sessions(agent_id, status);
CREATE INDEX idx_call_sessions_created_at ON call_sessions(created_at);
```

### Caching
- Cache agent status in Redis
- Cache queue statistics (5-second TTL)
- Cache agent extensions (1-minute TTL)

### WebSocket Optimization
- Use rooms for targeted broadcasts
- Batch multiple events when possible
- Implement connection pooling

---

## Testing

### Unit Test Example
```typescript
describe('CallRoutingService', () => {
  it('should route call to available agent', async () => {
    const agent = await createMockAgent({ status: AgentStatus.AVAILABLE });
    const call = await service.routeCall(tenantId, phoneNumber);
    expect(call.agentId).toBe(agent.id);
  });
});
```

### Integration Test Example
```typescript
describe('PBX Gateway', () => {
  it('should broadcast incoming call to agent', async () => {
    const socket = io('/pbx');
    socket.emit('agent:login', { agentId });
    
    await new Promise(resolve => {
      socket.on('call:incoming', (data) => {
        expect(data.callId).toBeDefined();
        resolve();
      });
    });
  });
});
```

---

## Troubleshooting

### Audio Issues
1. Check browser permissions
2. Verify microphone/speaker selection
3. Check Asterisk codec configuration
4. Verify WebRTC connection

### Call Routing Issues
1. Check agent status
2. Verify queue configuration
3. Check Asterisk dialplan
4. Review AMI event logs

### WebSocket Issues
1. Check connection status
2. Verify authentication
3. Check firewall rules
4. Review server logs

---

## Security Checklist

- [ ] WebSocket authentication implemented
- [ ] JWT token validation
- [ ] Role-based access control
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Rate limiting
- [ ] Call recording encryption
- [ ] Secure SIP/TLS configuration

---

## Monitoring

### Key Metrics
- Active WebSocket connections
- Calls in progress
- Queue wait times
- Agent availability percentage
- Call setup success rate
- Audio quality (MOS score)

### Logging
- All call events
- Agent status changes
- WebSocket connections/disconnections
- Errors and exceptions
- Performance metrics

---

## Future Enhancements

1. **Video Calling** - Add video support
2. **Screen Sharing** - Share screen during calls
3. **Conference Calls** - Multi-party conferences
4. **Voicemail** - Visual voicemail interface
5. **SMS Integration** - Unified communications
6. **AI Features** - Call transcription, sentiment analysis
7. **Mobile App** - Native iOS/Android apps

