import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AmiService } from './ami.service';
import { CallLog, CallStatus } from '../entities/call-log.entity';
import { Tenant } from '../entities/tenant.entity';
import { AsteriskDid } from '../entities/asterisk-did.entity';
import { DidsService } from './dids.service';
import { PhoneFormatter } from '../utils/phone-formatter';
import { MakeCallDto, MakeCallResponseDto } from './dto/make-call.dto';

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);

  constructor(
    private amiService: AmiService,
    private didsService: DidsService,
    @InjectRepository(CallLog)
    private callLogRepository: Repository<CallLog>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(AsteriskDid)
    private asteriskDidRepository: Repository<AsteriskDid>,
  ) {}

  async makeCall(tenantId: string, dto: MakeCallDto): Promise<MakeCallResponseDto> {
    const { to, from, context, transferNumber, ivrFile, ivrVmFile, useTwilioFormat, didPoolType } = dto;

    // Step 1: Resolve Tenant (Brand equivalent)
    // 'from' can be tenant ID or phone ID
    // Use query builder to avoid issues with missing columns
    let tenant = await this.tenantRepository
      .createQueryBuilder('tenant')
      .where('tenant.id = :tenantId', { tenantId })
      .select([
        'tenant.id',
        'tenant.name',
        'tenant.slug',
        'tenant.timezone',
        'tenant.twilioConfig',
        'tenant.isActive',
        'tenant.audioCreditsBalance',
      ])
      .getOne();

    if (!tenant) {
      throw new NotFoundException(`Tenant not found: ${tenantId}`);
    }

    // If 'from' is provided and different from tenantId, try to resolve it as a DID
    let selectedDidId: string | undefined;
    if (from && from !== tenantId) {
      // Try to find DID by ID
      const didById = await this.asteriskDidRepository.findOne({
        where: { id: from, tenantId },
      });
      if (didById) {
        selectedDidId = didById.id;
      } else {
        // Try to find by phone number string
        try {
          const formattedFrom = PhoneFormatter.formatToE164(from);
          const didByNumber = await this.asteriskDidRepository.findOne({
            where: { number: formattedFrom, tenantId },
          });
          if (didByNumber) {
            selectedDidId = didByNumber.id;
          }
        } catch {
          // Invalid phone number format, ignore
        }
      }
    }

    // Step 2: Select DID (Caller ID number)
    // FORCE MC DIDs ONLY - Ignore didPoolType and always use MC pool
    let availableDID: AsteriskDid;
    
    if (selectedDidId) {
      // Use the specified DID
      const specifiedDid = await this.asteriskDidRepository.findOne({
        where: {
          id: selectedDidId,
          tenantId: tenant.id,
        },
      });
      if (!specifiedDid) {
        throw new NotFoundException(`DID not found: ${selectedDidId}`);
      }
      // Verify the DID is from MC pool (not Twilio segment)
      const didSegment = specifiedDid.segment || '';
      const isTwilioSegment = didSegment && (didSegment.toLowerCase() === 'twilio' || didSegment.toLowerCase().startsWith('twilio-'));
      if (isTwilioSegment) {
        throw new BadRequestException(`DID ${selectedDidId} is from Twilio pool. Only MC DIDs are allowed.`);
      }
      availableDID = specifiedDid;
    } else {
      // FORCE MC pool - Always get next available MC DID regardless of didPoolType
      const nextDid = await this.didsService.getNextAvailableDidByPoolType(tenant.id, 'MC');
      
      if (!nextDid) {
        throw new BadRequestException(`No available MC DIDs configured for this tenant. Please import MC DIDs via CSV.`);
      }
      
      availableDID = nextDid;
    }

    // Increment usage count
    await this.didsService.incrementUsage(tenant.id, availableDID.id);

    // Step 3: Select Transfer Number
    // Use provided transfer number, or default to DID number
    const finalTransferNumber = transferNumber || availableDID.number;

    // Step 4: Get Tenant Settings & IVR Files
    // TODO: Implement brand call settings and IVR file management
    //
    // FORCE MC TRUNK - Always use MC trunk regardless of didPoolType or DID segment
    // System is configured to use MC DIDs only
    const trunk = 'MC';
    const callContext = context || 'DynamicIVR';

    // Step 5: Generate Call ID
    const callId = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    // Step 6: Create Call Log
    // Normalize phone numbers to E164 format for consistent storage and lookup
    const normalizedTo = PhoneFormatter.formatToE164(to);
    const normalizedFrom = PhoneFormatter.formatToE164(availableDID.number);
    const normalizedTransferNumber = finalTransferNumber ? PhoneFormatter.formatToE164(finalTransferNumber) : null;
    
    const callLog = await this.callLogRepository.save({
      tenantId: tenant.id,
      from: normalizedFrom,
      to: normalizedTo,
      transferNumber: normalizedTransferNumber,
      trunk: trunk, // Use determined trunk (MC unless explicitly Twilio segment)
      context: callContext,
      status: CallStatus.INITIATED,
      callStatus: CallStatus.INITIATED,
      uniqueId: callId,
      destinationNumber: normalizedTo,
      callerId: normalizedFrom,
      phoneNumber: normalizedTo,
      didUsed: normalizedFrom,
      metadata: {
        customCallId: callId,
        tenantId: tenant.id, // Store tenantId in metadata for AMI listener lookups
        didId: availableDID.id,
        didAreaCode: availableDID.areaCode,
        ivrFile: ivrFile || '',
        voicemailFile: ivrVmFile || '',
      },
    });

    // Step 7: Execute AMI Call
    try {
      const amiResponse = await this.amiService.makeCall({
        to,
        from: availableDID.number,
        transfer_number: finalTransferNumber,
        transferNumber: finalTransferNumber,
        trunk: trunk, // Always MC trunk
        context: callContext,
        extension: 's',
        ivr_file: ivrFile || '',
        ivr_vm_file: ivrVmFile || '',
        callId: callId,
        useTwilioFormat: false, // Always false - MC trunk doesn't use Twilio format
      });

      if (amiResponse && amiResponse.uniqueId) {
        await this.callLogRepository.update(callLog.id, {
          status: CallStatus.CONNECTED,
          uniqueId: amiResponse.uniqueId, // Asterisk's actual unique ID
        });
      }

      // Build response
      const response: MakeCallResponseDto = {
        success: true,
        callId: callLog.id,
        asteriskUniqueId: amiResponse.uniqueId,
        callDetails: {
          brand: {
            name: tenant.name,
          },
          did: {
            number: availableDID.number,
            usageCount: availableDID.usageCount,
            maxUsage: availableDID.maxUsage,
            areaCode: availableDID.areaCode,
          },
          to: to,
          from: availableDID.number,
          transferNumber: finalTransferNumber,
          trunk: availableDID.trunk || trunk,
          context: callContext,
        },
        amiResponse: {
          success: amiResponse.success,
          uniqueId: amiResponse.uniqueId,
          status: 'originated',
        },
        message: 'Call initiated successfully',
      };

      return response;
    } catch (error: any) {
      // Extract Asterisk error details
      const asteriskDetails = error.asteriskDetails || error.fullEvent || {};
      const errorMessage = error.message || 'Unknown error';
      
      // Build detailed error metadata
      const errorMetadata = {
        ...callLog.metadata,
        error: {
          message: errorMessage,
          timestamp: new Date().toISOString(),
          asteriskResponse: asteriskDetails.response || null,
          asteriskMessage: asteriskDetails.message || null,
          asteriskReason: asteriskDetails.reason || asteriskDetails.reasontext || null,
          asteriskChannel: asteriskDetails.channel || null,
          fullAsteriskEvent: asteriskDetails.fullEvent || asteriskDetails.fullEvent || null,
          callParameters: {
            to,
            from: availableDID.number,
            transferNumber: finalTransferNumber,
            trunk: availableDID.trunk || trunk,
            context: callContext,
            didId: availableDID.id,
          },
        },
      };

      // Update call log with failure and detailed error info
      await this.callLogRepository.update(callLog.id, {
        status: CallStatus.FAILED,
        callStatus: CallStatus.FAILED,
        metadata: errorMetadata,
        callFlowEvents: [
          {
            type: 'ORIGINATE_FAILED',
            timestamp: new Date(),
            data: {
              error: errorMessage,
              asteriskDetails: asteriskDetails,
            },
          },
        ],
      });

      // Log detailed error
      this.logger.error(`Failed to make call: ${errorMessage}`);
      this.logger.error(`Call parameters: ${JSON.stringify({
        to,
        from: availableDID.number,
        transferNumber: finalTransferNumber,
        trunk: availableDID.trunk || trunk,
        context: callContext,
        didId: availableDID.id,
      }, null, 2)}`);
      this.logger.error(`Asterisk error details: ${JSON.stringify(asteriskDetails, null, 2)}`);
      if (error.stack) {
        this.logger.error(`Error stack: ${error.stack}`);
      }

      // Build detailed error message for API response
      const detailedMessage = asteriskDetails.message 
        ? `${errorMessage} | Asterisk: ${asteriskDetails.message}${asteriskDetails.reason ? ` (${asteriskDetails.reason})` : ''}`
        : errorMessage;

      // Create exception with error details (NestJS will include this in response)
      const errorDetails = {
        message: errorMessage,
        asteriskResponse: asteriskDetails.response || null,
        asteriskMessage: asteriskDetails.message || null,
        asteriskReason: asteriskDetails.reason || asteriskDetails.reasontext || null,
        asteriskChannel: asteriskDetails.channel || null,
        callParameters: {
          to,
          from: availableDID.number,
          transferNumber: finalTransferNumber,
          trunk: availableDID.trunk || trunk,
          context: callContext,
          didId: availableDID.id,
        },
      };

      throw new BadRequestException({
        message: `Failed to make call: ${detailedMessage}`,
        error: 'Call Failed',
        statusCode: 400,
        details: errorDetails,
      });
    }
  }

  async getCallLogs(
    tenantId: string,
    options: { limit?: number; offset?: number; status?: string } = {},
  ): Promise<{ data: CallLog[]; total: number }> {
    const { limit = 50, offset = 0, status } = options;

    const queryBuilder = this.callLogRepository
      .createQueryBuilder('callLog')
      .where('callLog.tenantId = :tenantId', { tenantId })
      .orderBy('callLog.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    if (status) {
      queryBuilder.andWhere('callLog.status = :status', { status });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  async getCallLog(tenantId: string, id: string): Promise<CallLog> {
    const callLog = await this.callLogRepository.findOne({
      where: { id, tenantId },
    });

    if (!callLog) {
      throw new NotFoundException(`Call log not found: ${id}`);
    }

    return callLog;
  }
}

