import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { ModuleRef } from '@nestjs/core';
import { CallLog, CallStatus, CallDisposition } from '../entities/call-log.entity';
import { Contact, LeadStatus } from '../entities/contact.entity';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const AsteriskManager = require('asterisk-manager');

interface ActiveCall {
  uniqueId: string;
  channel: string;
  callerIdNum: string;
  startTime: Date;
  state: string;
  dialStatus?: string;
  destChannel?: string;
  answerTime?: Date;
  bridgeState?: string;
  bridgeTime?: Date;
  callAnswered?: boolean;
  transferStatus?: string;
  transferBillableSeconds?: number;
}

@Injectable()
export class AmiEventListenerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AmiEventListenerService.name);
  private ami: any;
  private connected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private activeCalls = new Map<string, ActiveCall>();
  private callChannels = new Map<string, string>(); // channel -> uniqueId mapping
  private callStats = {
    activeCalls: 0,
    totalCalls: 0,
    answeredCalls: 0,
    failedCalls: 0,
  };

  constructor(
    private configService: ConfigService,
    @InjectRepository(CallLog)
    private callLogRepository: Repository<CallLog>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    private moduleRef: ModuleRef,
  ) {}

  async onModuleInit() {
    await this.connect();
    this.startCleanupTimer();
    this.startHealthCheck();
  }

  async onModuleDestroy() {
    this.stopCleanupTimer();
    this.stopHealthCheck();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.ami) {
      this.ami.disconnect();
    }
  }

  private async connect(): Promise<void> {
    const port = parseInt(this.configService.get<string>('AMI_PORT') || '5038', 10);
    const host = this.configService.get<string>('AMI_HOST') || 'localhost';
    const username = this.configService.get<string>('AMI_USER') || 'admin';
    const password = this.configService.get<string>('AMI_PASSWORD') || 'admin';

    this.logger.log(`[EventListener] Connecting to AMI at ${host}:${port}...`);

    try {
      this.ami = new AsteriskManager(port, host, username, password, true);

      this.ami.on('connect', () => {
        this.connected = true;
        this.logger.log('[EventListener] AMI connected successfully');
      });

      this.ami.on('disconnect', () => {
        this.connected = false;
        this.logger.warn('[EventListener] AMI disconnected, attempting reconnect in 5 seconds...');
        this.scheduleReconnect();
      });

      this.ami.on('error', (err: Error) => {
        this.logger.error(`[EventListener] AMI error: ${err.message}`, err.stack);
      });

      // Register event handlers
      this.ami.on('newchannel', (evt: any) => this.handleNewChannel(evt));
      this.ami.on('newstate', (evt: any) => this.handleNewState(evt));
      this.ami.on('dial', (evt: any) => this.handleDial(evt));
      this.ami.on('bridge', (evt: any) => this.handleBridge(evt));
      this.ami.on('userevent', (evt: any) => this.handleUserEvent(evt));
      this.ami.on('hangup', (evt: any) => this.handleHangup(evt));

      // Connect to AMI
      this.ami.keepConnected();

      // Wait a bit for connection to establish
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      this.logger.error(`[EventListener] Failed to connect to AMI: ${error.message}`, error.stack);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 5000);
  }

  private async handleNewChannel(evt: any): Promise<void> {
    // Only process DynamicIVR context
    if (evt.context !== 'DynamicIVR') {
      return;
    }

    const uniqueId = evt.uniqueid;
    const channel = evt.channel;

    if (!uniqueId || !channel) {
      return;
    }

    const callData: ActiveCall = {
      uniqueId,
      channel,
      callerIdNum: evt.calleridnum || '',
      startTime: new Date(),
      state: evt.channelstate || '0',
    };

    this.activeCalls.set(uniqueId, callData);
    this.callChannels.set(channel, uniqueId);
    this.callStats.activeCalls++;

    this.logger.debug(`[EventListener] New channel created: ${channel} (uniqueId: ${uniqueId})`);

    // Update call log with Asterisk unique ID
    await this.updateCallLogWithUniqueId(uniqueId, evt.calleridnum);
  }

  private async handleNewState(evt: any): Promise<void> {
    const uniqueId = evt.uniqueid;
    const channelState = evt.channelstate;

    if (!uniqueId || !this.activeCalls.has(uniqueId)) {
      return;
    }

    const call = this.activeCalls.get(uniqueId)!;
    call.state = channelState;

    // State 6 = Up/Answered
    if (channelState === '6' && !call.callAnswered) {
      call.callAnswered = true;
      call.answerTime = new Date();
      this.callStats.answeredCalls++;

      this.logger.log(`[EventListener] Call answered: ${uniqueId}`);

      await this.updateCallLogEvent(
        call.callerIdNum,
        'channel_answered',
        {
          uniqueId,
          channel: call.channel,
          answerTime: call.answerTime,
        },
        uniqueId,
      );
      
      // Note: Contact status is NOT updated to CONTACT_MADE when call is answered.
      // It is only updated when:
      // 1. Contact replies to a text message
      // 2. Call is transferred (handled in TransferConnected/TransferResult events)
    }
  }

  private async handleDial(evt: any): Promise<void> {
    const uniqueId = evt.uniqueid;
    if (!uniqueId || !this.activeCalls.has(uniqueId)) {
      return;
    }

    const call = this.activeCalls.get(uniqueId)!;
    call.dialStatus = evt.dialstatus;
    call.destChannel = evt.destchannel;

    if (evt.dialstatus === 'ANSWER') {
      call.answerTime = new Date();
      call.callAnswered = true;
      this.callStats.answeredCalls++;
      
      // Update call log status to ANSWERED
      await this.updateCallLogEvent(
        call.callerIdNum,
        'dial_answered',
        {
          uniqueId,
          dialStatus: evt.dialstatus,
          answerTime: call.answerTime,
        },
        uniqueId,
      );
      
      // Also update contact status immediately when call is answered
      // Note: Contact status is NOT updated to CONTACT_MADE when call is answered.
      // It is only updated when:
      // 1. Contact replies to a text message
      // 2. Call is transferred (handled in TransferConnected/TransferResult events)
    } else if (['BUSY', 'NOANSWER', 'CANCEL', 'CHANUNAVAIL', 'CONGESTION'].includes(evt.dialstatus)) {
      // Handle failed dial attempts
      let disposition: CallDisposition;
      let status: CallStatus;
      
      switch (evt.dialstatus) {
        case 'BUSY':
          disposition = CallDisposition.BUSY;
          status = CallStatus.FAILED;
          break;
        case 'NOANSWER':
          disposition = CallDisposition.NO_ANSWER;
          status = CallStatus.NO_ANSWER;
          break;
        case 'CANCEL':
          disposition = CallDisposition.CANCELLED;
          status = CallStatus.FAILED; // CANCELLED is a disposition, not a status
          break;
        default:
          disposition = CallDisposition.FAILED;
          status = CallStatus.FAILED;
      }
      
      this.logger.debug(`[EventListener] Dial failed: ${uniqueId} - ${evt.dialstatus} (${disposition})`);
      
      // Update call log with failure status
      await this.updateCallLogEvent(
        call.callerIdNum,
        'dial_failed',
        {
          uniqueId,
          dialStatus: evt.dialstatus,
          disposition,
          status,
        },
        uniqueId,
      );
    }

    this.logger.debug(`[EventListener] Dial event: ${uniqueId} - ${evt.dialstatus}`);
  }

  private async handleBridge(evt: any): Promise<void> {
    const uniqueId1 = evt.uniqueid1;
    const uniqueId2 = evt.uniqueid2;

    const call1 = uniqueId1 ? this.activeCalls.get(uniqueId1) : null;
    const call2 = uniqueId2 ? this.activeCalls.get(uniqueId2) : null;

    if (call1) {
      call1.bridgeState = evt.bridgestate;
      call1.bridgeTime = new Date();
    }

    if (call2) {
      call2.bridgeState = evt.bridgestate;
      call2.bridgeTime = new Date();
    }

    this.logger.debug(`[EventListener] Bridge event: ${uniqueId1} <-> ${uniqueId2}`);
  }

  private async handleUserEvent(evt: any): Promise<void> {
    const eventType = evt.userevent || evt.eventname;
    const uniqueId = evt.uniqueid;
    // Extract CallID from UserEvent - Asterisk sends it as CallID, callid, or call_id
    // The dialplan sends CallID: ${CUSTOM_CALL_ID} which is the custom call ID we use to marry events
    const customCallId = evt.callid || evt.call_id || evt.CallID || evt.custom_call_id || uniqueId;

    if (!eventType || !uniqueId) {
      return;
    }

    const call = this.activeCalls.get(uniqueId);
    
    // Get phone number from call data or event
    const phoneNumber = call?.callerIdNum || evt.calleridnum || evt.callerid || evt.destination;

    this.logger.debug(`[EventListener] UserEvent: ${eventType} for ${uniqueId}, CallID: ${customCallId}`);

    // Process specific event types for active calls
    if (call) {
      switch (eventType) {
        case 'CallStatus':
          if (evt.status === 'answered') {
            call.callAnswered = true;
            call.answerTime = new Date();
            this.callStats.answeredCalls++;
          }
          break;

        case 'TransferConnected':
          call.transferStatus = 'completed';
          call.transferBillableSeconds = parseInt(evt.duration || '0', 10);
          // Update contact status to CONTACT_MADE when call is transferred
          await this.updateContactStatusOnTransfer(customCallId || uniqueId);
          break;

        case 'TransferResult':
          // TransferResult with Status='ANSWER' means transfer succeeded
          // Check both lowercase and uppercase Status fields (Asterisk may send either)
          const transferResultStatus = evt.status || evt.Status || evt.STATUS;
          if (transferResultStatus === 'ANSWER' || transferResultStatus === 'Answer') {
            call.transferStatus = 'completed';
            call.transferBillableSeconds = parseInt(evt.duration || evt.Duration || '0', 10);
            // Update contact status to CONTACT_MADE when transfer is completed
            await this.updateContactStatusOnTransfer(customCallId || uniqueId);
            this.logger.log(`[EventListener] TransferResult: Transfer completed for uniqueId ${uniqueId}, CallID: ${customCallId}, Status: ${transferResultStatus}`);
          } else {
            call.transferStatus = 'failed';
            this.logger.debug(`[EventListener] TransferResult: Transfer failed for uniqueId ${uniqueId}, Status: ${transferResultStatus}`);
          }
          break;

        case 'TransferFailed':
          call.transferStatus = 'failed';
          break;
      }
    }

    // Always update call log with event, even if call not in activeCalls
    // This ensures transfer events are captured even if they arrive late
    if (phoneNumber || customCallId) {
      await this.updateCallLogEvent(
        phoneNumber || '',
        eventType,
        evt,
        customCallId,
      );
    }
  }

  private async handleHangup(evt: any): Promise<void> {
    const uniqueId = evt.uniqueid;
    const channel = evt.channel;
    const cause = evt.cause || evt.hangupcause || 'unknown';

    if (!uniqueId) {
      this.logger.warn(`[EventListener] Hangup event received without uniqueId: ${JSON.stringify(evt)}`);
      return;
    }

    let call = this.activeCalls.get(uniqueId);
    if (!call) {
      // Try to find call log by uniqueId even if not in activeCalls
      this.logger.debug(`[EventListener] Hangup event for ${uniqueId} but call not in activeCalls map. Attempting to update call log directly.`);
      const callLog = await this.callLogRepository.findOne({ where: { uniqueId } });
      if (callLog) {
        // Reconstruct call data from call log
        call = {
          uniqueId,
          channel: channel || '',
          callerIdNum: callLog.from || '',
          startTime: callLog.createdAt,
          state: callLog.status || '0',
          callAnswered: callLog.status === CallStatus.ANSWERED || callLog.disposition === CallDisposition.ANSWERED,
          answerTime: callLog.metadata?.answerTime ? new Date(callLog.metadata.answerTime) : undefined,
        };
        // Calculate duration from call log creation time
        const duration = Math.floor((Date.now() - callLog.createdAt.getTime()) / 1000);
        // Use cause code and existing status to determine disposition
        const wasAnswered = call.callAnswered || 
                           callLog.status === CallStatus.ANSWERED || 
                           callLog.status === CallStatus.COMPLETED ||
                           callLog.disposition === CallDisposition.ANSWERED ||
                           (cause === '16' && duration > 0) || 
                           duration > 3;
        const disposition = wasAnswered ? CallDisposition.ANSWERED : CallDisposition.NO_ANSWER;
        this.logger.log(`[EventListener] Updating call log from hangup (not in activeCalls): ${uniqueId} (duration: ${duration}s, cause: ${cause}, wasAnswered: ${wasAnswered}, disposition: ${disposition})`);
        await this.updateCallLogOnHangup(uniqueId, duration, disposition, evt, call);
      } else {
        // Try to find by phone number in hangup data
        const phoneNumber = evt.calleridnum || evt.callerid || evt.destination;
        if (phoneNumber) {
          const recentCallLog = await this.callLogRepository.findOne({
            where: {
              to: phoneNumber,
              createdAt: MoreThanOrEqual(new Date(Date.now() - 600000)), // Last 10 minutes
            },
            order: { createdAt: 'DESC' },
          });
          if (recentCallLog) {
            this.logger.log(`[EventListener] Found call log by phone number for hangup: ${recentCallLog.id}, updating with uniqueId: ${uniqueId}`);
            const duration = Math.floor((Date.now() - recentCallLog.createdAt.getTime()) / 1000);
            const wasAnswered = recentCallLog.status === CallStatus.ANSWERED || 
                               recentCallLog.disposition === CallDisposition.ANSWERED ||
                               (cause === '16' && duration > 0) ||
                               duration > 3;
            const disposition = wasAnswered ? CallDisposition.ANSWERED : CallDisposition.NO_ANSWER;
            await this.updateCallLogOnHangup(uniqueId, duration, disposition, evt);
          } else {
            this.logger.warn(`[EventListener] Could not find call log for hangup event: uniqueId=${uniqueId}, channel=${channel}, phoneNumber=${phoneNumber}`);
          }
        } else {
          this.logger.warn(`[EventListener] Could not find call log for hangup event: uniqueId=${uniqueId}, channel=${channel}, no phone number in event`);
        }
      }
      return;
    }

    // Calculate duration
    const duration = Math.floor((Date.now() - call.startTime.getTime()) / 1000);
    
    // Better detection of answered calls:
    // 1. Check if call was marked as answered during the call
    // 2. Check if duration > 0 (call connected)
    // 3. Check hangup cause code (16 = normal clearing, usually means answered)
    // 4. Check if there was an answerTime recorded
    // 5. Check cause codes: 16 = normal clearing, 0 = unknown but might be answered
    const wasAnswered = call.callAnswered || 
                       (duration > 0 && (cause === '16' || cause === '0')) || 
                       (call.answerTime !== undefined) ||
                       (duration > 3); // If call lasted more than 3 seconds, likely answered
    
    const disposition = wasAnswered ? CallDisposition.ANSWERED : CallDisposition.NO_ANSWER;

    this.logger.log(`[EventListener] Call hangup: ${uniqueId} (duration: ${duration}s, callAnswered: ${call.callAnswered}, answerTime: ${call.answerTime}, cause: ${cause}, wasAnswered: ${wasAnswered}, disposition: ${disposition})`);

    // Update call log
    await this.updateCallLogOnHangup(uniqueId, duration, disposition, evt, call);

    // Clean up
    this.activeCalls.delete(uniqueId);
    if (channel) {
      this.callChannels.delete(channel);
    }
    this.callStats.activeCalls = Math.max(0, this.callStats.activeCalls - 1);

    if (disposition === CallDisposition.NO_ANSWER) {
      this.callStats.failedCalls++;
    }
  }

  private async updateCallLogWithUniqueId(uniqueId: string, callerIdNum?: string): Promise<void> {
    try {
      // Find call log by unique ID (could be custom call ID initially)
      let callLog = await this.callLogRepository.findOne({
        where: { uniqueId },
      });

      // If not found, try to find by caller ID number in recent calls
      if (!callLog && callerIdNum) {
        callLog = await this.callLogRepository.findOne({
          where: {
            from: callerIdNum,
            createdAt: MoreThanOrEqual(new Date(Date.now() - 300000)), // Last 5 minutes
          },
          order: { createdAt: 'DESC' },
        });
      }

      if (callLog && callLog.uniqueId !== uniqueId) {
        await this.callLogRepository.update(callLog.id, {
          uniqueId,
          status: CallStatus.CONNECTED,
          callStatus: CallStatus.CONNECTED,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to update call log with unique ID: ${error.message}`, error.stack);
    }
  }

  private async updateCallLogEvent(
    phoneNumber: string,
    eventType: string,
    eventData: any,
    callId: string,
  ): Promise<void> {
    try {
      // Find call log by custom call ID (CallID from UserEvent) or uniqueId
      // First try to find by uniqueId (which should be the custom call ID initially)
      let callLog = await this.callLogRepository.findOne({
        where: { uniqueId: callId },
      });

      // If not found, try to find by CallID stored in metadata.customCallId using JSONB query
      // Also try to filter by tenantId if available in metadata
      if (!callLog && callId && callId !== eventData.uniqueid) {
        const queryBuilder = this.callLogRepository
          .createQueryBuilder('call_log')
          .where("call_log.metadata->>'customCallId' = :callId", { callId })
          .andWhere('call_log.createdAt >= :dateFilter', { 
            dateFilter: new Date(Date.now() - 600000) 
          });
        
        // If tenantId is available in metadata from a previous lookup, use it
        // This helps ensure we match the correct call log
        if (eventData.tenantId) {
          queryBuilder.andWhere('call_log.tenantId = :tenantId', { tenantId: eventData.tenantId });
        }
        
        callLog = await queryBuilder
          .orderBy('call_log.createdAt', 'DESC')
          .getOne();
      }

      // If still not found, try to find by phone number
      if (!callLog && phoneNumber) {
        callLog = await this.callLogRepository.findOne({
          where: {
            to: phoneNumber,
            createdAt: MoreThanOrEqual(new Date(Date.now() - 600000)), // Last 10 minutes
          },
          order: { createdAt: 'DESC' },
        });
      }

      // If still not found and this is a transfer event, try to find by transferNumber
      // This helps marry transfer leg events back to the original call
      if (!callLog && eventType.includes('Transfer') && eventData.transfernumber) {
        callLog = await this.callLogRepository.findOne({
          where: {
            transferNumber: eventData.transfernumber || eventData.TransferNumber,
            createdAt: MoreThanOrEqual(new Date(Date.now() - 600000)), // Last 10 minutes
          },
          order: { createdAt: 'DESC' },
        });
      }

      if (!callLog) {
        // Log warning for transfer events as they're critical
        if (eventType.includes('Transfer')) {
          this.logger.warn(
            `[EventListener] Could not find call log for transfer event: ${eventType}, ` +
            `uniqueId: ${eventData.uniqueid}, CallID: ${callId}, phoneNumber: ${phoneNumber}, ` +
            `transferNumber: ${eventData.transfernumber || eventData.TransferNumber || 'N/A'}`
          );
        } else {
          this.logger.debug(
            `[EventListener] Could not find call log for event: ${eventType}, ` +
            `uniqueId: ${eventData.uniqueid}, CallID: ${callId}, phoneNumber: ${phoneNumber}`
          );
        }
        return;
      }

      // Ensure customCallId is preserved in metadata for future lookups
      if (callLog.metadata && !callLog.metadata.customCallId && callId && callId !== callLog.uniqueId) {
        callLog.metadata.customCallId = callId;
      }

      // Parse existing call flow events
      let callFlowEvents = callLog.callFlowEvents || [];

      // Limit callFlowEvents array size to prevent DB overload (keep last 100 events)
      const MAX_CALL_FLOW_EVENTS = 100;
      if (callFlowEvents.length >= MAX_CALL_FLOW_EVENTS) {
        // Keep only the most recent events
        callFlowEvents = callFlowEvents.slice(-MAX_CALL_FLOW_EVENTS + 1);
        this.logger.debug(`[EventListener] Truncated callFlowEvents to ${MAX_CALL_FLOW_EVENTS} events for call log ${callLog.id}`);
      }

      // Add new event
      callFlowEvents.push({
        type: eventType,
        timestamp: new Date(),
        data: eventData,
      });

      // Prepare update data
      const updateData: any = {
        callFlowEvents,
      };

      // Update specific fields based on event type
      switch (eventType) {
        case 'channel_answered':
        case 'dial_answered':
        case 'CallStatus':
          if (eventData.status === 'answered' || eventType === 'channel_answered' || eventType === 'dial_answered') {
            updateData.status = CallStatus.ANSWERED;
            updateData.callStatus = CallStatus.ANSWERED;
            updateData.disposition = CallDisposition.ANSWERED; // Set disposition immediately
            if (eventData.answerTime) {
              updateData.metadata = {
                ...callLog.metadata,
                answerTime: new Date(eventData.answerTime),
              };
            } else {
              updateData.metadata = {
                ...callLog.metadata,
                answerTime: new Date(),
              };
            }
          }
          break;

        case 'dial_failed':
          // Update status based on dial failure
          if (eventData.status) {
            updateData.status = eventData.status;
            updateData.callStatus = eventData.status;
          }
          if (eventData.disposition) {
            updateData.disposition = eventData.disposition;
          }
          break;

        case 'TransferConnected':
          updateData.metadata = {
            ...callLog.metadata,
            customCallId: callId || callLog.metadata?.customCallId, // Preserve CallID for future lookups
            transferStatus: 'completed',
            transferBillableSeconds: parseInt(eventData.duration || eventData.Duration || '0', 10) || 0,
          };
          // Update contact status to CONTACT_MADE when transfer is connected
          await this.updateContactStatusOnTransfer(callLog.uniqueId || callLog.id);
          this.logger.log(`[EventListener] Transfer connected for call log ${callLog.id} (uniqueId: ${callLog.uniqueId}, CallID: ${callId})`);
          break;

        case 'TransferResult':
          // TransferResult with Status='ANSWER' means transfer succeeded
          // Check both lowercase and uppercase Status fields (Asterisk may send either)
          const transferStatus = eventData.status || eventData.Status || eventData.STATUS;
          if (transferStatus === 'ANSWER' || transferStatus === 'Answer') {
            updateData.metadata = {
              ...callLog.metadata,
              customCallId: callId || callLog.metadata?.customCallId, // Preserve CallID for future lookups
              transferStatus: 'completed',
              transferBillableSeconds: parseInt(eventData.duration || eventData.Duration || '0', 10) || 0,
            };
            // Update contact status to CONTACT_MADE when transfer is completed
            await this.updateContactStatusOnTransfer(callLog.uniqueId || callLog.id);
            this.logger.log(`[EventListener] Transfer completed for call log ${callLog.id} (uniqueId: ${callLog.uniqueId}, CallID: ${callId}, Status: ${transferStatus})`);
          } else {
            // Other statuses indicate failure
            updateData.metadata = {
              ...callLog.metadata,
              customCallId: callId || callLog.metadata?.customCallId, // Preserve CallID for future lookups
              transferStatus: 'failed',
            };
            this.logger.debug(`[EventListener] Transfer failed for call log ${callLog.id} - Status: ${transferStatus}`);
          }
          break;

        case 'TransferFailed':
          updateData.metadata = {
            ...callLog.metadata,
            transferStatus: 'failed',
          };
          break;

        case 'TransferBusy':
          updateData.metadata = {
            ...callLog.metadata,
            transferStatus: 'busy',
          };
          break;

        case 'TransferNoAnswer':
          updateData.metadata = {
            ...callLog.metadata,
            transferStatus: 'no_answer',
          };
          break;
      }

      await this.callLogRepository.update(callLog.id, updateData);
    } catch (error) {
      this.logger.error(`Failed to update call log event: ${error.message}`, error.stack);
    }
  }

  private async updateCallLogOnHangup(
    uniqueId: string,
    duration: number,
    disposition: CallDisposition,
    hangupData: any,
    callData?: ActiveCall,
    finalStatus?: CallStatus,
  ): Promise<void> {
    try {
      // Extract phone numbers early for use throughout the function
      // phoneNumber is the caller ID (DID number)
      const phoneNumber = callData?.callerIdNum || hangupData.calleridnum || hangupData.callerid;
      // destinationNumber is the called number - extract from channel name or destination field
      // Channel format: PJSIP/MC-0001f043 or PJSIP/phoneNumber@MC
      let destinationNumber = hangupData.destchannel || hangupData.destination || hangupData.channel;
      // Extract phone number from channel if it's in format PJSIP/phoneNumber@MC
      if (destinationNumber && destinationNumber.includes('@')) {
        const match = destinationNumber.match(/PJSIP\/([^@]+)@/);
        if (match && match[1] && !match[1].startsWith('MC-')) {
          destinationNumber = match[1];
        }
      }

      let callLog = await this.callLogRepository.findOne({
        where: { uniqueId },
      });

      // If not found by uniqueId, try multiple fallback strategies
      if (!callLog) {
        // Import PhoneFormatter for normalization
        const { PhoneFormatter } = await import('../utils/phone-formatter');
        
        // Strategy 1: Try to find by destination number (to field) - remove status filter
        // Many calls may have already been updated to CONNECTED status, so we check all statuses
        if (destinationNumber) {
          try {
            const normalizedDest = PhoneFormatter.formatToE164(destinationNumber);
            callLog = await this.callLogRepository.findOne({
              where: {
                to: normalizedDest,
                createdAt: MoreThanOrEqual(new Date(Date.now() - 600000)), // Last 10 minutes
                // Remove status filter - check all statuses
              },
              order: { createdAt: 'DESC' },
            });
          } catch {
            // Fallback to raw destinationNumber if normalization fails
            callLog = await this.callLogRepository.findOne({
              where: {
                to: destinationNumber,
                createdAt: MoreThanOrEqual(new Date(Date.now() - 600000)),
              },
              order: { createdAt: 'DESC' },
            });
          }
        }
        
        // Strategy 2: Try by caller ID (DID) - this is less reliable but might help
        if (!callLog && phoneNumber) {
          try {
            const normalizedFrom = PhoneFormatter.formatToE164(phoneNumber);
            callLog = await this.callLogRepository.findOne({
              where: {
                from: normalizedFrom,
                createdAt: MoreThanOrEqual(new Date(Date.now() - 600000)), // Last 10 minutes
                // Remove status filter - check all statuses
              },
              order: { createdAt: 'DESC' },
            });
          } catch {
            // Fallback to raw phoneNumber if normalization fails
            callLog = await this.callLogRepository.findOne({
              where: {
                from: phoneNumber,
                createdAt: MoreThanOrEqual(new Date(Date.now() - 600000)),
              },
              order: { createdAt: 'DESC' },
            });
          }
        }
      }

      // If still not found, log warning and return
      if (!callLog) {
        this.logger.warn(`[EventListener] Could not find call log for hangup event: uniqueId=${uniqueId}, channel=${hangupData.channel}, phoneNumber=${phoneNumber || destinationNumber}`);
        return;
      }

      let callFlowEvents = callLog.callFlowEvents || [];
      
      // Limit callFlowEvents array size to prevent DB overload (keep last 100 events)
      const MAX_CALL_FLOW_EVENTS = 100;
      if (callFlowEvents.length >= MAX_CALL_FLOW_EVENTS) {
        // Keep only the most recent events
        callFlowEvents = callFlowEvents.slice(-MAX_CALL_FLOW_EVENTS + 1);
        this.logger.debug(`[EventListener] Truncated callFlowEvents to ${MAX_CALL_FLOW_EVENTS} events for call log ${callLog.id}`);
      }
      
      callFlowEvents.push({
        type: 'hangup',
        timestamp: new Date(),
        data: hangupData,
      });

      // Determine final status based on disposition if not provided
      let statusToSet = finalStatus;
      if (!statusToSet) {
        if (disposition === CallDisposition.ANSWERED) {
          statusToSet = CallStatus.COMPLETED;
        } else if (disposition === CallDisposition.NO_ANSWER) {
          statusToSet = CallStatus.NO_ANSWER;
        } else if (disposition === CallDisposition.BUSY) {
          statusToSet = CallStatus.FAILED;
        } else {
          statusToSet = CallStatus.FAILED;
        }
      }

      // Calculate billable seconds (only if call was answered)
      const billableSeconds = disposition === CallDisposition.ANSWERED ? duration : 0;

      await this.callLogRepository.update(callLog.id, {
        status: statusToSet,
        callStatus: statusToSet,
        disposition,
        duration,
        billableSeconds,
        callFlowEvents,
      });

      this.logger.log(`[EventListener] Updated call log ${callLog.id}: status=${statusToSet}, disposition=${disposition}, duration=${duration}s`);

      // Notify journey execution about call completion
      try {
        const { JourneysService } = await import('../journeys/journeys.service');
        const { PhoneFormatter } = await import('../utils/phone-formatter');
        const journeysService = this.moduleRef.get(JourneysService, { strict: false });
        if (journeysService) {
          // Use callLog.to (destination number) as primary source since it's normalized to E164
          // Fallback to destinationNumber or phoneNumber, but normalize them first
          let phoneNumberForMatching = callLog.to; // This is already normalized to E164
          if (!phoneNumberForMatching && destinationNumber) {
            try {
              phoneNumberForMatching = PhoneFormatter.formatToE164(destinationNumber);
            } catch {
              phoneNumberForMatching = destinationNumber;
            }
          }
          if (!phoneNumberForMatching && phoneNumber) {
            // phoneNumber is caller ID (DID), not destination, but use as last resort
            try {
              phoneNumberForMatching = PhoneFormatter.formatToE164(phoneNumber);
            } catch {
              phoneNumberForMatching = phoneNumber;
            }
          }
          
          this.logger.log(`[EventListener] Notifying journey service of call completion: ${uniqueId}, status=${statusToSet}, disposition=${disposition}, phoneNumber=${phoneNumberForMatching}`);
          await journeysService.handleCallCompletion(
            uniqueId,
            statusToSet,
            disposition,
            phoneNumberForMatching,
          );
        } else {
          this.logger.warn(`[EventListener] JourneysService not available for callback`);
        }
      } catch (error) {
        this.logger.error(`[EventListener] Error notifying journey service: ${error.message}`, error.stack);
      }

      // Note: Contact status is NOT updated to CONTACT_MADE when call is answered.
      // It is only updated when:
      // 1. Contact replies to a text message
      // 2. Call is transferred (handled in TransferConnected/TransferResult events)
    } catch (error) {
      this.logger.error(`Failed to update call log on hangup: ${error.message}`, error.stack);
    }
  }

  /**
   * Update contact leadStatus to CONTACT_MADE when a call is transferred
   */
  private async updateContactStatusOnTransfer(uniqueIdOrCallId: string): Promise<void> {
    try {
      // Find call log by uniqueId or id
      const callLog = await this.callLogRepository.findOne({
        where: [
          { uniqueId: uniqueIdOrCallId },
          { id: uniqueIdOrCallId },
        ],
      });

      if (!callLog || !callLog.to || !callLog.tenantId) {
        this.logger.debug(`[EventListener] Call log not found for transfer: ${uniqueIdOrCallId}`);
        return;
      }

      const contact = await this.contactRepository.findOne({
        where: { phoneNumber: callLog.to, tenantId: callLog.tenantId },
      });

      if (contact && contact.leadStatus !== LeadStatus.SOLD && contact.leadStatus !== LeadStatus.CONTACT_MADE) {
        contact.leadStatus = LeadStatus.CONTACT_MADE;
        await this.contactRepository.save(contact);
        this.logger.log(`[EventListener] Updated contact ${contact.id} status to CONTACT_MADE (phone: ${callLog.to}) - call transferred`);
      }
    } catch (error) {
      this.logger.error(`Failed to update contact status on transfer: ${error.message}`, error.stack);
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 30000); // Every 30 seconds
  }

  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, 60000); // Every 60 seconds
  }

  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  private async performHealthCheck(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        this.ami.action({ action: 'Ping' }, (err: Error | null, res: any) => {
          if (err) {
            this.connected = false;
            reject(err);
          } else {
            this.logger.debug(
              `✓ System operational | Active: ${this.callStats.activeCalls} calls | Total: ${this.callStats.totalCalls} | Answered: ${this.callStats.answeredCalls} | Failed: ${this.callStats.failedCalls}`,
            );
            resolve();
          }
        });
      });
    } catch (error) {
      this.logger.warn(`Health check failed: ${error.message}`);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    // Remove old active calls from memory
    for (const [uniqueId, call] of this.activeCalls.entries()) {
      if (now - call.startTime.getTime() > maxAge) {
        this.activeCalls.delete(uniqueId);
        this.callChannels.delete(call.channel);
      }
    }

    // Clean up stuck CONNECTED call logs in database (calls that never received hangup event)
    // This is critical for AMI calls - if hangup event is missed, status stays CONNECTED forever
    this.cleanupStuckCallLogs().catch((error) => {
      this.logger.error(`Failed to cleanup stuck call logs: ${error.message}`, error.stack);
    });

    // Warn if maps are getting too large
    if (this.activeCalls.size > 5000) {
      this.logger.warn(`Active calls map size: ${this.activeCalls.size} (consider cleanup)`);
    }

    if (this.callChannels.size > 5000) {
      this.logger.warn(`Call channels map size: ${this.callChannels.size} (consider cleanup)`);
    }
  }

  /**
   * Clean up stuck CONNECTED call logs that never received a hangup event
   * This is critical for AMI calls - if hangup event is missed, status stays CONNECTED forever
   * and blocks subsequent calls with "Contact is currently on an active call" error
   */
  private async cleanupStuckCallLogs(): Promise<void> {
    try {
      const stuckThreshold = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      
      // Find call logs stuck in CONNECTED status for more than 10 minutes
      const stuckCalls = await this.callLogRepository.find({
        where: {
          status: CallStatus.CONNECTED,
          createdAt: LessThanOrEqual(stuckThreshold),
        },
        take: 100, // Process in batches
      });

      if (stuckCalls.length > 0) {
        this.logger.warn(`[AMI Cleanup] Found ${stuckCalls.length} stuck CONNECTED call logs, auto-completing them`);
        
        for (const callLog of stuckCalls) {
          // Calculate duration based on creation time
          const duration = Math.floor((Date.now() - callLog.createdAt.getTime()) / 1000);
          
          // If call was created but never answered, mark as NO_ANSWER
          // If it was in CONNECTED state, it likely never completed successfully
          const disposition = duration > 3 ? CallDisposition.NO_ANSWER : CallDisposition.FAILED;
          const finalStatus = duration > 3 ? CallStatus.NO_ANSWER : CallStatus.FAILED;
          
          await this.callLogRepository.update(callLog.id, {
            status: finalStatus,
            callStatus: finalStatus,
            disposition,
            duration,
            billableSeconds: 0,
            callFlowEvents: [
              ...(callLog.callFlowEvents || []),
              {
                type: 'auto_cleanup',
                timestamp: new Date(),
                data: {
                  reason: 'Stuck CONNECTED status - hangup event never received',
                  originalStatus: 'CONNECTED',
                  duration,
                },
              },
            ],
          });
        }
        
        this.logger.log(`[AMI Cleanup] Auto-completed ${stuckCalls.length} stuck CONNECTED call logs`);
      }
    } catch (error) {
      this.logger.error(`[AMI Cleanup] Error cleaning up stuck call logs: ${error.message}`, error.stack);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

