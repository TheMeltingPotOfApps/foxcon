# PBX Feature Implementation Plan

## Executive Summary

This document outlines a comprehensive plan to implement a full-featured PBX (Private Branch Exchange) system within the existing SMS platform. The implementation will enable agents to handle inbound and outbound calls via a web-based interface, with real-time call management, lead data integration, and comprehensive reporting for managers and supervisors.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [Asterisk Integration](#asterisk-integration)
7. [WebRTC & Audio Handling](#webrtc--audio-handling)
8. [Real-time Communication](#real-time-communication)
9. [Agent Interface](#agent-interface)
10. [Manager/Supervisor Dashboard](#managersupervisor-dashboard)
11. [Security & Permissions](#security--permissions)
12. [Testing Strategy](#testing-strategy)
13. [Deployment Considerations](#deployment-considerations)
14. [Implementation Phases](#implementation-phases)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Agent Portal │  │ Manager Dash │  │ Supervisor   │    │
│  │              │  │              │  │ Dashboard    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│         │                  │                  │            │
│         └──────────────────┼──────────────────┘            │
│                            │                                │
│                    WebSocket Gateway                        │
│                    (Socket.io)                              │
└────────────────────────────┼────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────┐
│                    Backend (NestJS)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ PBX Service  │  │ Call Router  │  │ Reporting   │    │
│  │              │  │              │  │ Service     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│         │                  │                  │            │
│         └──────────────────┼──────────────────┘            │
│                            │                                │
│                    WebSocket Gateway                        │
│                    (Socket.io)                              │
└────────────────────────────┼────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────┐
│                    Asterisk Server                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ AMI          │  │ PJSIP        │  │ WebRTC      │    │
│  │ Interface    │  │ Trunks       │  │ Bridge      │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

1. **Agent Interface**
   - WebRTC-based softphone
   - Inbound call answering
   - Outbound call dialing
   - Lead data display during calls
   - Call controls (hold, transfer, mute, hangup)
   - Call notes and disposition

2. **Call Routing**
   - Automatic call distribution (ACD)
   - Agent availability management
   - Queue management
   - Call forwarding rules

3. **Manager/Supervisor Dashboard**
   - Real-time agent monitoring
   - Call statistics and metrics
   - Agent performance reports
   - Call recording access
   - Live call monitoring (listen/whisper/barge)

4. **Reporting**
   - Call volume reports
   - Agent performance metrics
   - Call duration analytics
   - Disposition tracking
   - Lead conversion tracking

---

## Technology Stack

### Backend Additions

- **@nestjs/websockets** - WebSocket support for real-time communication
- **socket.io** - WebSocket library with fallback support
- **@nestjs/platform-socket.io** - NestJS Socket.io adapter
- **simple-peer** or **mediasoup** - WebRTC signaling (optional, Asterisk handles WebRTC)
- **node-opus** - Audio codec support (if needed)

### Frontend Additions

- **socket.io-client** - WebSocket client
- **simple-peer** - WebRTC peer connection (if direct WebRTC needed)
- **react-use** - React hooks for audio/media handling
- **use-sound** - Sound effects for call notifications

### Asterisk Configuration

- **PJSIP** - SIP stack for WebRTC
- **res_http_websocket** - WebSocket support
- **res_rtp_asterisk** - RTP handling
- **chan_pjsip** - PJSIP channel driver

---

## Database Schema

### New Entities

#### 1. Agent Extension (`agent_extensions`)
```typescript
@Entity('agent_extensions')
export class AgentExtension extends BaseEntity {
  @Column('uuid')
  userId: string; // Links to User entity
  
  @Column('uuid')
  tenantId: string;
  
  @Column({ unique: true })
  extension: string; // e.g., "1001"
  
  @Column()
  sipUsername: string; // For PJSIP authentication
  
  @Column()
  sipPassword: string; // Encrypted
  
  @Column({ nullable: true })
  sipEndpoint: string; // PJSIP endpoint name
  
  @Column({ default: false })
  isActive: boolean;
  
  @Column({
    type: 'enum',
    enum: AgentStatus,
    default: AgentStatus.OFFLINE,
  })
  status: AgentStatus; // OFFLINE, AVAILABLE, BUSY, AWAY, ON_CALL
  
  @Column({ nullable: true })
  currentCallId: string; // Active call log ID
  
  @Column({ type: 'jsonb', nullable: true })
  settings: {
    ringTone?: string;
    autoAnswer?: boolean;
    wrapUpTime?: number; // seconds
    maxConcurrentCalls?: number;
  };
  
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
  
  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}
```

#### 2. Call Queue (`call_queues`)
```typescript
@Entity('call_queues')
export class CallQueue extends BaseEntity {
  @Column('uuid')
  tenantId: string;
  
  @Column({ unique: true })
  name: string; // e.g., "Sales", "Support"
  
  @Column()
  queueNumber: string; // Asterisk queue number
  
  @Column({ type: 'text', array: true, default: [] })
  agentIds: string[]; // User IDs assigned to queue
  
  @Column({ default: true })
  isActive: boolean;
  
  @Column({ type: 'jsonb', nullable: true })
  settings: {
    ringStrategy?: 'ringall' | 'leastrecent' | 'fewestcalls' | 'random';
    timeout?: number;
    maxWaitTime?: number;
    holdMusic?: string;
  };
  
  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}
```

#### 3. Call Session (`call_sessions`)
```typescript
@Entity('call_sessions')
export class CallSession extends BaseEntity {
  @Column('uuid')
  callLogId: string; // Links to CallLog
  
  @Column('uuid', { nullable: true })
  agentId: string; // Agent handling the call
  
  @Column('uuid', { nullable: true })
  contactId: string; // Contact/Lead associated with call
  
  @Column({
    type: 'enum',
    enum: CallSessionStatus,
    default: CallSessionStatus.INITIATED,
  })
  status: CallSessionStatus; // INITIATED, RINGING, CONNECTED, ON_HOLD, ENDED
  
  @Column({ nullable: true })
  startedAt: Date;
  
  @Column({ nullable: true })
  answeredAt: Date;
  
  @Column({ nullable: true })
  endedAt: Date;
  
  @Column({ type: 'integer', nullable: true })
  duration: number; // seconds
  
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    channelId?: string;
    bridgeId?: string;
    recordingPath?: string;
    transferHistory?: Array<{
      from: string;
      to: string;
      timestamp: Date;
    }>;
    holdDuration?: number;
    muteDuration?: number;
  };
  
  @Column({ type: 'text', nullable: true })
  notes: string;
  
  @Column({
    type: 'enum',
    enum: CallDisposition,
    nullable: true,
  })
  disposition: CallDisposition;
  
  @ManyToOne(() => CallLog)
  @JoinColumn({ name: 'callLogId' })
  callLog: CallLog;
  
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'agentId' })
  agent: User;
  
  @ManyToOne(() => Contact, { nullable: true })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;
}
```

#### 4. Agent Activity Log (`agent_activity_logs`)
```typescript
@Entity('agent_activity_logs')
export class AgentActivityLog extends BaseEntity {
  @Column('uuid')
  agentId: string;
  
  @Column('uuid')
  tenantId: string;
  
  @Column({
    type: 'enum',
    enum: AgentActivityType,
  })
  activityType: AgentActivityType; // STATUS_CHANGE, CALL_STARTED, CALL_ENDED, LOGIN, LOGOUT
  
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    previousStatus?: AgentStatus;
    newStatus?: AgentStatus;
    callId?: string;
    duration?: number;
  };
  
  @ManyToOne(() => User)
  @JoinColumn({ name: 'agentId' })
  agent: User;
}
```

#### 5. Call Recording (`call_recordings`)
```typescript
@Entity('call_recordings')
export class CallRecording extends BaseEntity {
  @Column('uuid')
  callSessionId: string;
  
  @Column('uuid')
  tenantId: string;
  
  @Column()
  filePath: string;
  
  @Column({ type: 'integer' })
  duration: number; // seconds
  
  @Column({ default: false })
  isDeleted: boolean;
  
  @ManyToOne(() => CallSession)
  @JoinColumn({ name: 'callSessionId' })
  callSession: CallSession;
}
```

### Enums

```typescript
export enum AgentStatus {
  OFFLINE = 'OFFLINE',
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  AWAY = 'AWAY',
  ON_CALL = 'ON_CALL',
  WRAP_UP = 'WRAP_UP',
}

export enum CallSessionStatus {
  INITIATED = 'INITIATED',
  RINGING = 'RINGING',
  CONNECTED = 'CONNECTED',
  ON_HOLD = 'ON_HOLD',
  TRANSFERRING = 'TRANSFERRING',
  ENDED = 'ENDED',
}

export enum AgentActivityType {
  STATUS_CHANGE = 'STATUS_CHANGE',
  CALL_STARTED = 'CALL_STARTED',
  CALL_ENDED = 'CALL_ENDED',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PAUSE = 'PAUSE',
  RESUME = 'RESUME',
}
```

---

## Backend Implementation

### Module Structure

```
backend/src/pbx/
├── pbx.module.ts
├── pbx.service.ts
├── pbx.controller.ts
├── pbx.gateway.ts (WebSocket Gateway)
├── agent/
│   ├── agent-extensions.service.ts
│   ├── agent-extensions.controller.ts
│   └── dto/
├── call-routing/
│   ├── call-routing.service.ts
│   ├── queue.service.ts
│   └── dto/
├── call-sessions/
│   ├── call-sessions.service.ts
│   ├── call-sessions.controller.ts
│   └── dto/
├── reporting/
│   ├── pbx-reporting.service.ts
│   ├── pbx-reporting.controller.ts
│   └── dto/
└── webrtc/
    ├── webrtc.service.ts
    └── sdp-handler.service.ts
```

### Key Services

#### 1. PBX Service (`pbx.service.ts`)
- Main orchestration service
- Coordinates between Asterisk, agents, and call routing
- Manages call state transitions
- Handles agent availability

#### 2. Agent Extensions Service (`agent-extensions.service.ts`)
- Manages agent SIP extensions
- Creates/updates PJSIP endpoints in Asterisk
- Handles agent status changes
- Validates agent permissions

#### 3. Call Routing Service (`call-routing.service.ts`)
- Implements ACD (Automatic Call Distribution)
- Manages call queues
- Routes calls to available agents
- Handles call forwarding rules

#### 4. Call Sessions Service (`call-sessions.service.ts`)
- Manages active call sessions
- Tracks call state
- Handles call controls (hold, transfer, mute)
- Records call metadata

#### 5. PBX Gateway (`pbx.gateway.ts`)
- WebSocket gateway for real-time communication
- Handles client connections
- Broadcasts call events
- Manages agent presence

#### 6. WebRTC Service (`webrtc.service.ts`)
- Handles WebRTC signaling
- Manages SDP offers/answers
- Coordinates with Asterisk WebRTC bridge

### WebSocket Events

#### Client → Server
- `agent:login` - Agent logs in
- `agent:logout` - Agent logs out
- `agent:status:change` - Agent changes status
- `call:answer` - Agent answers call
- `call:hangup` - Agent hangs up
- `call:hold` - Agent holds call
- `call:unhold` - Agent unholds call
- `call:mute` - Agent mutes microphone
- `call:unmute` - Agent unmutes microphone
- `call:transfer` - Agent transfers call
- `call:dial` - Agent initiates outbound call
- `call:notes:update` - Update call notes
- `call:disposition:set` - Set call disposition

#### Server → Client
- `call:incoming` - New inbound call
- `call:state:changed` - Call state changed
- `call:ended` - Call ended
- `agent:status:updated` - Agent status updated
- `queue:update` - Queue status update
- `presence:update` - Agent presence update

---

## Frontend Implementation

### Page Structure

```
frontend/app/(app)/pbx/
├── agent/
│   ├── page.tsx (Agent Dashboard)
│   ├── components/
│   │   ├── Softphone.tsx
│   │   ├── CallControls.tsx
│   │   ├── LeadPanel.tsx
│   │   ├── CallNotes.tsx
│   │   └── AgentStatus.tsx
│   └── hooks/
│       ├── use-pbx-websocket.ts
│       ├── use-call-session.ts
│       └── use-agent-status.ts
├── manager/
│   ├── page.tsx (Manager Dashboard)
│   ├── components/
│   │   ├── AgentMonitor.tsx
│   │   ├── CallMetrics.tsx
│   │   ├── RealTimeStats.tsx
│   │   └── AgentPerformance.tsx
│   └── hooks/
│       └── use-pbx-reporting.ts
└── supervisor/
    ├── page.tsx (Supervisor Dashboard)
    └── components/
        ├── LiveMonitoring.tsx
        ├── CallBarge.tsx
        └── WhisperMode.tsx
```

### Key Components

#### 1. Softphone Component
- WebRTC audio controls
- Call state display
- Incoming call notification
- Active call display
- Call timer

#### 2. Call Controls
- Answer/Hangup buttons
- Hold/Unhold toggle
- Mute/Unmute toggle
- Transfer button
- Dial pad

#### 3. Lead Panel
- Contact information display
- Lead history
- Notes and tags
- Quick actions

#### 4. Agent Status Widget
- Current status indicator
- Status change dropdown
- Availability toggle

#### 5. Manager Dashboard
- Real-time agent grid
- Call queue status
- Performance metrics
- Historical reports

### UI/UX Design Principles

1. **Clean, Modern Interface**
   - Match existing design system (Tailwind + shadcn/ui)
   - Card-based layouts with rounded corners
   - Subtle shadows and gradients
   - Consistent spacing and typography

2. **Real-time Feedback**
   - Visual indicators for call states
   - Smooth animations (Framer Motion)
   - Sound notifications for incoming calls
   - Toast notifications for actions

3. **Accessibility**
   - Keyboard shortcuts for common actions
   - Clear visual hierarchy
   - High contrast for important elements
   - Screen reader support

4. **Mobile Responsive**
   - Responsive layout for tablets
   - Touch-friendly controls
   - Optimized for smaller screens

---

## Asterisk Integration

### PJSIP Configuration

#### Agent Endpoints (`/etc/asterisk/pjsip.conf`)
```ini
[agent-1001]
type=endpoint
context=pbx-internal
disallow=all
allow=opus,ulaw,alaw
direct_media=no
rtp_symmetric=yes
force_rport=yes
rewrite_contact=yes
transport=transport-wss
auth=auth-1001
aors=aor-1001
webrtc=yes

[auth-1001]
type=auth
auth_type=userpass
password=secure_password_here
username=1001

[aor-1001]
type=aor
contact=sip:1001@pbx.example.com
```

#### WebSocket Transport (`/etc/asterisk/pjsip.conf`)
```ini
[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089
```

### Dialplan Context (`/etc/asterisk/extensions.conf`)

```ini
[pbx-internal]
; Agent extension
exten => _1XXX,1,NoOp(Agent Extension ${EXTEN})
same => n,Set(CHANNEL(language)=en)
same => n,Dial(PJSIP/${EXTEN},30)
same => n,Hangup()

[pbx-queues]
; Queue handling
exten => _2XXX,1,NoOp(Queue ${EXTEN})
same => n,Set(CHANNEL(language)=en)
same => n,Queue(${EXTEN},tT)
same => n,Hangup()

[pbx-outbound]
; Outbound calls from agents
exten => _X.,1,NoOp(Outbound call to ${EXTEN})
same => n,Set(CHANNEL(language)=en)
same => n,Dial(PJSIP/${EXTEN}@trunk-name,30)
same => n,Hangup()

[pbx-inbound]
; Inbound calls to queues
exten => s,1,NoOp(Inbound call)
same => n,Set(CHANNEL(language)=en)
same => n,Set(QUEUE=2001) ; Default queue
same => n,Queue(${QUEUE},tT)
same => n,Hangup()
```

### AMI Actions for PBX

- `QueueAdd` - Add agent to queue
- `QueueRemove` - Remove agent from queue
- `QueueStatus` - Get queue status
- `QueueSummary` - Get queue summary
- `Originate` - Initiate outbound call
- `Bridge` - Bridge two channels
- `Monitor` - Start call recording
- `StopMonitor` - Stop call recording
- `Redirect` - Transfer call
- `Setvar` - Set channel variables

---

## WebRTC & Audio Handling

### Browser Audio Setup

1. **Microphone Access**
   - Request user permission
   - Handle permission denial gracefully
   - Test microphone quality

2. **Speaker Output**
   - Use Web Audio API for better control
   - Handle audio routing (speaker/headset)
   - Volume controls

3. **Audio Quality**
   - Opus codec (preferred)
   - Fallback to G.711 (ulaw/alaw)
   - Echo cancellation
   - Noise suppression

### WebRTC Implementation

```typescript
// Simplified WebRTC setup
class WebRTCManager {
  private peerConnection: RTCPeerConnection;
  private localStream: MediaStream;
  private remoteStream: MediaStream;

  async initialize() {
    // Get user media
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // Create peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    // Add local stream tracks
    this.localStream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, this.localStream);
    });

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      // Play remote audio
      this.playRemoteAudio();
    };
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async setRemoteAnswer(answer: RTCSessionDescriptionInit) {
    await this.peerConnection.setRemoteDescription(answer);
  }

  private playRemoteAudio() {
    const audioElement = new Audio();
    audioElement.srcObject = this.remoteStream;
    audioElement.play();
  }
}
```

### Asterisk WebRTC Bridge

Asterisk handles WebRTC signaling through PJSIP. The backend will:
1. Receive SDP offer from browser
2. Send to Asterisk via AMI/ARI
3. Receive SDP answer from Asterisk
4. Send back to browser
5. Establish WebRTC connection

---

## Real-time Communication

### WebSocket Gateway Implementation

```typescript
@WebSocketGateway({
  cors: {
    origin: '*', // Configure properly for production
  },
  namespace: '/pbx',
})
export class PbxGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private agentConnections = new Map<string, Socket>();
  private callRooms = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    // Authenticate client
    // Store connection
  }

  handleDisconnect(client: Socket) {
    // Clean up connections
    // Update agent status
  }

  @SubscribeMessage('agent:login')
  handleAgentLogin(client: Socket, payload: { agentId: string }) {
    this.agentConnections.set(payload.agentId, client);
    // Broadcast agent online status
    this.server.emit('presence:update', {
      agentId: payload.agentId,
      status: 'ONLINE',
    });
  }

  @SubscribeMessage('call:incoming')
  handleIncomingCall(payload: { callId: string; agentId: string }) {
    const agentSocket = this.agentConnections.get(payload.agentId);
    if (agentSocket) {
      agentSocket.emit('call:incoming', payload);
    }
  }
}
```

### Client WebSocket Hook

```typescript
export function usePbxWebSocket(agentId: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io('/pbx', {
      auth: {
        token: getAuthToken(),
        agentId,
      },
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('agent:login', { agentId });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [agentId]);

  return { socket, isConnected };
}
```

---

## Agent Interface

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  Header: Agent Status | Notifications | Settings        │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  Lead Panel  │         Softphone Interface             │
│              │    ┌──────────────────────────────┐     │
│  Contact     │    │  Call Display                │     │
│  Info        │    │  [Contact Name]              │     │
│              │    │  [Phone Number]              │     │
│  History     │    │  [Call Timer]                │     │
│              │    └──────────────────────────────┘     │
│  Notes       │                                          │
│              │    ┌──────────────────────────────┐     │
│  Tags        │    │  Call Controls                │     │
│              │    │  [Answer] [Hangup]            │     │
│              │    │  [Hold] [Mute] [Transfer]     │     │
│              │    └──────────────────────────────┘     │
│              │                                          │
│              │    ┌──────────────────────────────┐     │
│              │    │  Dial Pad (for outbound)     │     │
│              │    └──────────────────────────────┘     │
└──────────────┴──────────────────────────────────────────┘
```

### Key Features

1. **Incoming Call Handling**
   - Visual notification (modal/popup)
   - Sound notification (configurable)
   - Auto-answer option
   - Caller ID display
   - Lead lookup by phone number

2. **Outbound Calling**
   - Dial pad interface
   - Contact selection
   - Click-to-call from lead list
   - Call history quick dial

3. **Call Controls**
   - Answer/Hangup
   - Hold/Unhold
   - Mute/Unmute
   - Transfer (blind/attended)
   - Conference (future)

4. **Lead Data Display**
   - Contact information
   - Call history
   - Notes and tags
   - Custom fields
   - Quick actions (update status, add note)

5. **Call Notes & Disposition**
   - Rich text notes
   - Disposition dropdown
   - Tag assignment
   - Follow-up scheduling

---

## Manager/Supervisor Dashboard

### Manager Dashboard Features

1. **Real-time Agent Monitoring**
   - Agent status grid
   - Current call information
   - Queue wait times
   - Agent availability

2. **Call Metrics**
   - Calls in queue
   - Average wait time
   - Calls answered/abandoned
   - Service level (SLA)

3. **Agent Performance**
   - Calls handled today
   - Average call duration
   - Wrap-up time
   - Availability percentage

4. **Historical Reports**
   - Daily/weekly/monthly views
   - Export capabilities
   - Custom date ranges

### Supervisor Dashboard Features

1. **Live Monitoring**
   - Listen to active calls
   - Whisper mode (coach agent)
   - Barge in (join call)
   - Call recording access

2. **Advanced Reporting**
   - Agent comparison
   - Team performance
   - Call quality metrics
   - Disposition analysis

3. **Queue Management**
   - Queue configuration
   - Agent assignment
   - Priority routing
   - Overflow handling

---

## Security & Permissions

### Role-Based Access Control

1. **AGENT Role**
   - Access to own agent interface
   - Make/receive calls
   - View assigned leads
   - Update call notes
   - Cannot access manager dashboard

2. **MANAGER Role**
   - All AGENT permissions
   - View team agent status
   - Access reporting dashboard
   - View call recordings
   - Cannot use supervisor features

3. **ADMIN/OWNER Role**
   - All MANAGER permissions
   - System configuration
   - Agent management
   - Full reporting access

### Security Measures

1. **WebSocket Authentication**
   - JWT token validation
   - Role-based authorization
   - Connection rate limiting

2. **Audio Security**
   - Encrypted WebRTC (DTLS/SRTP)
   - Secure SIP (TLS)
   - Call recording encryption

3. **Data Protection**
   - PCI-DSS compliance considerations
   - Call recording retention policies
   - Access logging

---

## Testing Strategy

### Unit Tests
- Service methods
- Business logic
- Data transformations

### Integration Tests
- Asterisk AMI integration
- Database operations
- WebSocket communication

### E2E Tests
- Complete call flow
- Agent login/logout
- Call routing
- Reporting generation

### Performance Tests
- Concurrent call handling
- WebSocket scalability
- Database query optimization

---

## Deployment Considerations

### Infrastructure Requirements

1. **Server Resources**
   - CPU: 4+ cores recommended
   - RAM: 8GB+ recommended
   - Network: Low latency, high bandwidth
   - Storage: For call recordings

2. **Asterisk Configuration**
   - PJSIP endpoints
   - WebSocket transport
   - Codec configuration
   - RTP settings

3. **Network Configuration**
   - Firewall rules for SIP/RTP
   - WebSocket port (8089)
   - STUN/TURN servers (if needed)

4. **SSL/TLS Certificates**
   - For WebSocket (WSS)
   - For SIP (TLS)
   - Valid certificates required

### Monitoring

1. **Metrics to Track**
   - Active calls
   - Agent availability
   - Call queue length
   - WebSocket connections
   - Asterisk health

2. **Alerting**
   - High queue wait times
   - Agent unavailability
   - Asterisk disconnections
   - High error rates

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- [ ] Database schema implementation
- [ ] Basic PBX module structure
- [ ] WebSocket gateway setup
- [ ] Agent extension management
- [ ] Basic Asterisk PJSIP configuration

### Phase 2: Core PBX Features (Weeks 3-4)
- [ ] Call routing service
- [ ] Queue management
- [ ] Agent status management
- [ ] Basic call session tracking
- [ ] AMI event handling

### Phase 3: Agent Interface (Weeks 5-6)
- [ ] Softphone component
- [ ] WebRTC integration
- [ ] Call controls
- [ ] Lead panel
- [ ] Call notes/disposition

### Phase 4: Inbound/Outbound Calls (Weeks 7-8)
- [ ] Inbound call routing
- [ ] Outbound call dialing
- [ ] Call state management
- [ ] Transfer functionality
- [ ] Hold/unhold

### Phase 5: Manager Dashboard (Weeks 9-10)
- [ ] Real-time agent monitoring
- [ ] Call metrics display
- [ ] Basic reporting
- [ ] Historical reports

### Phase 6: Supervisor Features (Weeks 11-12)
- [ ] Live call monitoring
- [ ] Whisper mode
- [ ] Barge in
- [ ] Advanced reporting

### Phase 7: Polish & Testing (Weeks 13-14)
- [ ] UI/UX refinements
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Documentation
- [ ] User training materials

---

## Success Metrics

1. **Technical Metrics**
   - Call setup time < 2 seconds
   - Audio quality MOS > 4.0
   - WebSocket latency < 100ms
   - 99.9% uptime

2. **User Experience Metrics**
   - Agent satisfaction score
   - Call handling efficiency
   - Feature adoption rate
   - Error rate < 1%

3. **Business Metrics**
   - Call volume handled
   - Average call duration
   - Lead conversion rate
   - Agent productivity

---

## Conclusion

This implementation plan provides a comprehensive roadmap for building a full-featured PBX system within the existing SMS platform. The modular approach allows for incremental development and testing, ensuring a stable and reliable system.

Key success factors:
- Strong integration with existing Asterisk infrastructure
- Real-time communication via WebSockets
- High-quality WebRTC audio
- Intuitive user interface matching existing design
- Comprehensive reporting and monitoring
- Scalable architecture

The implementation should be done in phases, with each phase building upon the previous one, allowing for early feedback and adjustments.

