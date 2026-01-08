import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PbxService } from './services/pbx.service';
import { AgentExtensionsService } from './services/agent-extensions.service';
import { CallSessionsService } from './services/call-sessions.service';
import { AgentStatus } from '../entities/agent-status.enum';
import { CallSessionStatus } from '../entities/call-session-status.enum';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  tenantId?: string;
  agentId?: string;
}

@WebSocketGateway({
  namespace: '/pbx',
  cors: {
    origin: '*', // Configure properly for production
    credentials: true,
  },
})
export class PbxGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PbxGateway.name);
  private agentConnections = new Map<string, AuthenticatedSocket>();
  private agentRooms = new Map<string, Set<string>>(); // agentId -> Set of socketIds

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private pbxService: PbxService,
    private agentExtensionsService: AgentExtensionsService,
    private callSessionsService: CallSessionsService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake auth or query
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token?.toString();

      if (!token) {
        this.logger.warn('Connection rejected: No token provided');
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      client.userId = payload.sub;
      client.tenantId = payload.tenantId;

      // Find agent extension
      const agentExtension =
        await this.agentExtensionsService.findByUserId(
          client.tenantId,
          client.userId,
        );

      if (!agentExtension) {
        this.logger.warn(
          `Connection rejected: No agent extension for user ${client.userId}`,
        );
        client.disconnect();
        return;
      }

      client.agentId = agentExtension.id;

      // Store connection
      if (!this.agentRooms.has(client.agentId)) {
        this.agentRooms.set(client.agentId, new Set());
      }
      this.agentRooms.get(client.agentId)!.add(client.id);
      this.agentConnections.set(client.id, client);

      // Join tenant room
      client.join(`tenant:${client.tenantId}`);

      // Join agent room
      client.join(`agent:${client.agentId}`);

      this.logger.log(
        `Agent connected: ${client.userId} (${agentExtension.extension})`,
      );

      // Broadcast agent online status
      this.server.to(`tenant:${client.tenantId}`).emit('presence:update', {
        agentId: client.userId,
        status: agentExtension.status,
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.agentId && this.agentRooms.has(client.agentId)) {
      this.agentRooms.get(client.agentId)!.delete(client.id);
      if (this.agentRooms.get(client.agentId)!.size === 0) {
        this.agentRooms.delete(client.agentId);
      }
    }

    this.agentConnections.delete(client.id);

    if (client.userId && client.tenantId) {
      this.logger.log(`Agent disconnected: ${client.userId}`);

      // Update agent status to offline
      try {
        const agentExtension =
          await this.agentExtensionsService.findByUserId(
            client.tenantId,
            client.userId,
          );
        if (agentExtension) {
          await this.agentExtensionsService.updateStatus(
            client.tenantId,
            agentExtension.id,
            AgentStatus.OFFLINE,
          );

          // Broadcast agent offline status
          this.server.to(`tenant:${client.tenantId}`).emit('presence:update', {
            agentId: client.userId,
            status: AgentStatus.OFFLINE,
          });
        }
      } catch (error) {
        this.logger.error(`Error updating agent status: ${error.message}`);
      }
    }
  }

  @SubscribeMessage('agent:login')
  async handleAgentLogin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { extension: string },
  ) {
    if (!client.tenantId || !client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const agentExtension =
        await this.agentExtensionsService.findByExtension(
          client.tenantId,
          data.extension,
        );

      if (!agentExtension || agentExtension.userId !== client.userId) {
        return { error: 'Invalid extension' };
      }

      // Update agent status to available
      await this.agentExtensionsService.updateStatus(
        client.tenantId,
        agentExtension.id,
        AgentStatus.AVAILABLE,
      );

      // Broadcast status update
      this.server.to(`tenant:${client.tenantId}`).emit('presence:update', {
        agentId: client.userId,
        status: AgentStatus.AVAILABLE,
      });

      return { success: true, agentId: agentExtension.id };
    } catch (error) {
      this.logger.error(`Login error: ${error.message}`);
      return { error: error.message };
    }
  }

  @SubscribeMessage('agent:status:change')
  async handleStatusChange(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { status: AgentStatus },
  ) {
    if (!client.tenantId || !client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const agentExtension =
        await this.agentExtensionsService.findByUserId(
          client.tenantId,
          client.userId,
        );

      if (!agentExtension) {
        return { error: 'Agent extension not found' };
      }

      await this.agentExtensionsService.updateStatus(
        client.tenantId,
        agentExtension.id,
        data.status,
      );

      // Broadcast status update
      this.server.to(`tenant:${client.tenantId}`).emit('presence:update', {
        agentId: client.userId,
        status: data.status,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Status change error: ${error.message}`);
      return { error: error.message };
    }
  }

  @SubscribeMessage('call:answer')
  async handleAnswerCall(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string },
  ) {
    if (!client.tenantId || !client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const callSession = await this.pbxService.answerCall(
        client.tenantId,
        client.userId,
        data.callId,
      );

      // Broadcast call answered
      this.server.to(`tenant:${client.tenantId}`).emit('call:state:changed', {
        callId: callSession.callLogId,
        callSessionId: callSession.id,
        status: CallSessionStatus.CONNECTED,
      });

      return { success: true, callSession };
    } catch (error) {
      this.logger.error(`Answer call error: ${error.message}`);
      return { error: error.message };
    }
  }

  @SubscribeMessage('call:hangup')
  async handleHangupCall(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string },
  ) {
    if (!client.tenantId || !client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const callSession = await this.pbxService.hangupCall(
        client.tenantId,
        client.userId,
        data.callId,
      );

      // Broadcast call ended
      this.server.to(`tenant:${client.tenantId}`).emit('call:ended', {
        callId: callSession.callLogId,
        callSessionId: callSession.id,
        duration: callSession.duration,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Hangup call error: ${error.message}`);
      return { error: error.message };
    }
  }

  @SubscribeMessage('call:dial')
  async handleDialCall(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { phoneNumber: string; contactId?: string },
  ) {
    if (!client.tenantId || !client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const { callSession, callLog } = await this.pbxService.dialOutbound(
        client.tenantId,
        client.userId,
        data.phoneNumber,
        data.contactId,
      );

      // Notify agent of call initiation
      client.emit('call:initiated', {
        callId: callLog.id,
        callSessionId: callSession.id,
        phoneNumber: data.phoneNumber,
      });

      return { success: true, callSession, callLog };
    } catch (error) {
      this.logger.error(`Dial call error: ${error.message}`);
      return { error: error.message };
    }
  }

  // Method to notify agent of incoming call
  async notifyIncomingCall(
    tenantId: string,
    agentId: string,
    callSession: any,
    contact?: any,
  ) {
    this.server.to(`agent:${agentId}`).emit('call:incoming', {
      callId: callSession.callLogId,
      callSessionId: callSession.id,
      from: callSession.callLog?.from || '',
      to: callSession.callLog?.to || '',
      contactId: callSession.contactId,
      contact: contact || null,
    });
  }

  // Method to broadcast call state changes
  async broadcastCallStateChange(
    tenantId: string,
    callSessionId: string,
    status: string,
    metadata?: any,
  ) {
    this.server.to(`tenant:${tenantId}`).emit('call:state:changed', {
      callSessionId,
      status,
      metadata,
    });
  }
}

