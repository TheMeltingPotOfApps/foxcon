import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PhoneFormatter } from '../utils/phone-formatter';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const AsteriskManager = require('asterisk-manager');

export interface MakeCallParams {
  to: string;
  from: string;
  transfer_number?: string;
  transferNumber?: string;
  trunk: string;
  context?: string;
  extension?: string;
  ivr_file?: string;
  ivr_vm_file?: string;
  wait_strategy?: string;
  press_key?: string;
  amd_enabled?: string;
  transfer_prefix?: string;
  callId?: string;
  useTwilioFormat?: boolean; // If true, use +1 format for "to" number (Twilio requires this)
}

export interface OriginateResponse {
  uniqueId: string;
  actionId: string;
  success: boolean;
  message?: string;
  asteriskDetails?: {
    response?: string;
    message?: string;
    reason?: string;
    channel?: string;
    context?: string;
    extension?: string;
    fullEvent?: any;
  };
}

interface PendingOriginate {
  resolve: (value: OriginateResponse) => void;
  reject: (error: Error) => void;
  customCallId: string;
  to: string;
  from: string;
  transferNumber?: string;
  trunk: string;
  timestamp: number;
}

@Injectable()
export class AmiService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AmiService.name);
  private ami: any;
  private connected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private pendingOriginates = new Map<string, PendingOriginate>();
  private eventBuffer = new Map<string, number>(); // For deduplication

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
    this.startCleanupTimer();
  }

  async onModuleDestroy() {
    this.stopCleanupTimer();
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

    this.logger.log(`Connecting to AMI at ${host}:${port}...`);

    try {
      this.ami = new AsteriskManager(port, host, username, password, true);

      this.ami.on('connect', () => {
        this.connected = true;
        this.logger.log('AMI connected successfully');
      });

      this.ami.on('disconnect', () => {
        this.connected = false;
        this.logger.warn('AMI disconnected, attempting reconnect in 5 seconds...');
        this.scheduleReconnect();
      });

      this.ami.on('error', (err: Error) => {
        this.logger.error(`AMI error: ${err.message}`, err.stack);
      });

      // Listen for OriginateResponse event
      this.ami.on('originateresponse', async (evt: any) => {
        await this.handleOriginateResponse(evt);
      });

      // Connect to AMI
      this.ami.keepConnected();

      // Wait a bit for connection to establish
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      this.logger.error(`Failed to connect to AMI: ${error.message}`, error.stack);
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

  private async handleOriginateResponse(evt: any): Promise<void> {
    const actionId = evt.actionid;
    const uniqueId = evt.uniqueid;
    const response = evt.response;

    if (!actionId || !this.pendingOriginates.has(actionId)) {
      return;
    }

    const pending = this.pendingOriginates.get(actionId)!;

    // Log full event details for debugging
    this.logger.debug(`OriginateResponse event: ${JSON.stringify(evt)}`);

    if (response === 'Success' && uniqueId) {
      this.logger.log(`Call originated successfully: ${uniqueId} (actionId: ${actionId})`);
      pending.resolve({
        uniqueId,
        actionId,
        success: true,
        message: 'Call originated successfully',
      });
      this.pendingOriginates.delete(actionId);
    } else {
      // Capture all available error details from Asterisk
      const errorDetails = {
        response: response || 'Unknown',
        message: evt.message || 'No error message provided',
        reason: evt.reason || evt.reasontext || null,
        channel: evt.channel || null,
        context: evt.context || null,
        extension: evt.exten || null,
        fullEvent: evt, // Store full event for debugging
      };

      // Build detailed error message
      const errorParts = [
        `Originate failed: ${response || 'Unknown response'}`,
        evt.message ? `Message: ${evt.message}` : null,
        evt.reason ? `Reason: ${evt.reason}` : null,
        evt.reasontext ? `Reason Text: ${evt.reasontext}` : null,
        evt.channel ? `Channel: ${evt.channel}` : null,
      ].filter(Boolean);

      const errorMessage = errorParts.join(' | ');
      
      this.logger.error(`Call origination failed: ${errorMessage}`);
      this.logger.error(`Full Asterisk response: ${JSON.stringify(evt, null, 2)}`);

      // Create error with full details
      const error = new Error(errorMessage);
      (error as any).asteriskDetails = errorDetails;
      (error as any).fullEvent = evt;
      
      pending.reject(error);
      this.pendingOriginates.delete(actionId);
    }
  }

  async makeCall(params: MakeCallParams): Promise<OriginateResponse> {
    // Ensure connection
    if (!this.connected) {
      await this.connect();
      // Wait a bit more if still not connected
      if (!this.connected) {
        throw new Error('AMI connection not available');
      }
    }

    // Format phone numbers: 
    // - "from" always includes + prefix (E164 format)
    // - "to": Use +1 format for both Twilio and MC trunk (E164 format required for PJSIP)
    // - "transfer_number": Use formatWithoutPlusOne (removes +1 prefix)
    const formattedFrom = PhoneFormatter.formatToE164(params.from); // Include + prefix for from number
    
    // For both Twilio and MC trunk, use E164 format with + prefix for PJSIP channel
    // PJSIP requires E164 format (with +) for proper channel creation
    const formattedTo = PhoneFormatter.formatToE164(params.to); // Always use E164 format with + prefix
    
    // Format transfer number without +1 prefix (always)
    const rawTransferNumber = params.transfer_number || params.transferNumber;
    let formattedTransferNumber = '';
    if (rawTransferNumber) {
      // Format transfer number without +1 prefix
      formattedTransferNumber = PhoneFormatter.formatWithoutPlusOne(rawTransferNumber);
    }

    // Log formatted phone numbers for validation
    this.logger.debug(`[Call Execution] Phone number formatting:`, {
      originalTo: params.to,
      formattedTo,
      originalFrom: params.from,
      formattedFrom,
      originalTransfer: rawTransferNumber,
      formattedTransfer: formattedTransferNumber,
      callId: params.callId,
    });

    // Generate action ID
    const actionId = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const customCallId = params.callId || actionId;

    // Build AMI Originate action
    const context = params.context || 'DynamicIVR';
    const extension = params.extension || 's';

    const action: any = {
      action: 'Originate',
      actionid: actionId,
      channel: `PJSIP/${formattedTo}@${params.trunk}`,
      context: context,
      exten: extension,
      priority: 1,
      callerid: `"${formattedFrom}" <${formattedFrom}>`,
      timeout: 30000,
      async: true,
      variable: {
        to: formattedTo,
        from: formattedFrom,
        transfer_number: formattedTransferNumber,
        ivr_file: params.ivr_file || '',
        ivr_vm_file: params.ivr_vm_file || '',
        wait_strategy: params.wait_strategy || 'random',
        press_key: '1', // Hardcoded to 1 for P1 dialer - pressing 1 triggers transfer
        amd_enabled: params.amd_enabled || 'true',
        transfer_prefix: params.transfer_prefix || '',
        custom_call_id: customCallId,
        trunk: params.trunk,
        // Backward compatibility - uppercase variables for dialplan
        TRANSFER_NUMBER: formattedTransferNumber,
        FROM_NUMBER: formattedFrom,
        TO_NUMBER: formattedTo,
        TRUNK: params.trunk,
        IVR_FILE: params.ivr_file || '', // Uppercase for dialplan compatibility
        IVR_VM_FILE: params.ivr_vm_file || '', // Uppercase for dialplan compatibility
        PRESS_KEY: '1', // Hardcoded to 1 for P1 dialer - pressing 1 triggers transfer
        AMD_ENABLED: params.amd_enabled || 'true', // Uppercase for dialplan compatibility
      },
    };

    return new Promise<OriginateResponse>((resolve, reject) => {
      // Store promise handlers
      this.pendingOriginates.set(actionId, {
        resolve,
        reject,
        customCallId,
        to: formattedTo,
        from: formattedFrom,
        transferNumber: formattedTransferNumber,
        trunk: params.trunk,
        timestamp: Date.now(),
      });

      // Send action
      this.ami.action(action, (err: Error | null, res: any) => {
        if (err) {
          this.pendingOriginates.delete(actionId);
          this.logger.error(`AMI action error: ${err.message}`, err.stack);
          this.logger.error(`AMI action details: ${JSON.stringify(action, null, 2)}`);
          const error = new Error(`AMI action failed: ${err.message}`);
          (error as any).asteriskDetails = {
            action: action,
            error: err.message,
            stack: err.stack,
          };
          reject(error);
          return;
        }

        // Log immediate response from AMI
        this.logger.debug(`AMI action sent, response: ${JSON.stringify(res)}`);

        // Set timeout for response
        setTimeout(() => {
          if (this.pendingOriginates.has(actionId)) {
            const pending = this.pendingOriginates.get(actionId)!;
            this.pendingOriginates.delete(actionId);
            this.logger.warn(`OriginateResponse timeout for actionId: ${actionId}`);
            this.logger.warn(`Pending originate details: ${JSON.stringify(pending, null, 2)}`);
            const timeoutError = new Error('OriginateResponse timeout - Asterisk did not respond within 35 seconds');
            (timeoutError as any).asteriskDetails = {
              actionId,
              timeout: true,
              pendingAction: action,
            };
            pending.reject(timeoutError);
          }
        }, 35000);
      });
    });
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 5000);
  }

  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const staleTimeout = 30000; // 30 seconds

    // Clean up stale pending originates
    for (const [actionId, pending] of this.pendingOriginates.entries()) {
      if (now - pending.timestamp > staleTimeout) {
        this.logger.warn(`Cleaning up stale pending originate: ${actionId}`);
        pending.reject(new Error('Request timeout'));
        this.pendingOriginates.delete(actionId);
      }
    }

    // Limit map sizes to prevent memory leaks
    if (this.pendingOriginates.size > 50) {
      const entries = Array.from(this.pendingOriginates.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, entries.length - 50);
      for (const [actionId] of toRemove) {
        this.pendingOriginates.delete(actionId);
      }
    }

    // Clean up event buffer (15-second window)
    const bufferTimeout = 15000;
    for (const [key, timestamp] of this.eventBuffer.entries()) {
      if (now - timestamp > bufferTimeout) {
        this.eventBuffer.delete(key);
      }
    }

    if (this.eventBuffer.size > 100) {
      const entries = Array.from(this.eventBuffer.entries());
      entries.sort((a, b) => a[1] - b[1]);
      const toRemove = entries.slice(0, entries.length - 100);
      for (const [key] of toRemove) {
        this.eventBuffer.delete(key);
      }
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

