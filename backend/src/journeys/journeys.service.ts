import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual } from 'typeorm';
import { Journey, JourneyStatus } from '../entities/journey.entity';
import { JourneyNode, JourneyNodeType } from '../entities/journey-node.entity';
import { JourneyContact, JourneyContactStatus } from '../entities/journey-contact.entity';
import { JourneyNodeExecution, ExecutionStatus } from '../entities/journey-node-execution.entity';
import { Contact } from '../entities/contact.entity';
import { Campaign } from '../entities/campaign.entity';
import { CampaignContact, CampaignContactStatus } from '../entities/campaign-contact.entity';
import { Conversation } from '../entities/conversation.entity';
import { Message, MessageDirection } from '../entities/message.entity';
import { TenantWebhook } from '../entities/tenant-webhook.entity';
import { Template } from '../entities/template.entity';
import { TemplateVersion } from '../entities/template-version.entity';
import { NumberPool } from '../entities/number-pool.entity';
import { TwilioNumber } from '../entities/twilio-number.entity';
import { ContentAiTemplate } from '../entities/content-ai-template.entity';
import { CallLog, CallStatus, CallDisposition } from '../entities/call-log.entity';
import { AsteriskDid } from '../entities/asterisk-did.entity';
import { VoiceTemplate } from '../entities/voice-template.entity';
import { GeneratedAudio } from '../entities/generated-audio.entity';
import { JourneyAudio } from '../entities/journey-audio.entity';
import { Tenant } from '../entities/tenant.entity';
import { CreateJourneyDto } from './dto/create-journey.dto';
import { CreateJourneyNodeDto } from './dto/create-node.dto';
import { EnrollContactDto } from './dto/enroll-contact.dto';
import { TwilioService } from '../twilio/twilio.service';
import { ContentAiService } from '../content-ai/content-ai.service';
import { CallsService } from '../asterisk/calls.service';
import { AsteriskSoundService } from '../asterisk/asterisk-sound.service';
import { DidsService } from '../asterisk/dids.service';
import { KokoroService } from '../kokoro/kokoro.service';
import { AudioProcessingService } from '../audio-processing/audio-processing.service';
import { Tcpaservice } from '../tcpa/tcpa.service';
import { TenantLimitsService } from '../tenant-limits/tenant-limits.service';
import { CalendarEvent, CalendarEventStatus } from '../entities/calendar-event.entity';
import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { ModuleRef } from '@nestjs/core';
import { formatInTimeZone } from 'date-fns-tz';
import { TimezoneService } from '../common/timezone.service';
import { PhoneFormatter } from '../utils/phone-formatter';
import { LeadStatusesService } from '../lead-statuses/lead-statuses.service';

@Injectable()
export class JourneysService {
  private readonly logger = new Logger(JourneysService.name);
  // Cache for journey nodes to reduce database queries
  private nodeCache = new Map<string, { node: JourneyNode; timestamp: number }>();
  private readonly NODE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly DEBUG_LOG_PATH = '/root/SMS/.cursor/debug.log';
  // Cache for call logs to reduce DB queries (cache recent calls for 5 minutes)
  private callLogCache = new Map<string, { callLog: CallLog; timestamp: number }>();
  private readonly CALL_LOG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CALL_LOG_CACHE_SIZE = 1000; // Max cached call logs
  
  // Helper function to write debug logs
  private writeDebugLog(location: string, message: string, data: any, hypothesisId?: string): void {
    try {
      const logEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        location,
        message,
        data,
        sessionId: 'debug-session',
        runId: 'journey-execution',
        hypothesisId: hypothesisId || 'unknown',
      };
      const logLine = JSON.stringify(logEntry) + '\n';
      // Ensure directory exists
      const logDir = path.dirname(this.DEBUG_LOG_PATH);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      // Append to log file
      fs.appendFileSync(this.DEBUG_LOG_PATH, logLine, 'utf8');
    } catch (error) {
      // Silently fail - don't break execution if logging fails
      this.logger.debug(`Failed to write debug log: ${error.message}`);
    }
  }
  
  constructor(
    @InjectRepository(Journey)
    private journeyRepository: Repository<Journey>,
    @InjectRepository(JourneyNode)
    private journeyNodeRepository: Repository<JourneyNode>,
    @InjectRepository(JourneyContact)
    private journeyContactRepository: Repository<JourneyContact>,
    @InjectRepository(JourneyNodeExecution)
    private journeyNodeExecutionRepository: Repository<JourneyNodeExecution>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(CampaignContact)
    private campaignContactRepository: Repository<CampaignContact>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(TenantWebhook)
    private webhookRepository: Repository<TenantWebhook>,
    @InjectRepository(Template)
    private templateRepository: Repository<Template>,
    @InjectRepository(TemplateVersion)
    private templateVersionRepository: Repository<TemplateVersion>,
    @InjectRepository(NumberPool)
    private numberPoolRepository: Repository<NumberPool>,
    @InjectRepository(TwilioNumber)
    private twilioNumberRepository: Repository<TwilioNumber>,
    @InjectRepository(ContentAiTemplate)
    private contentAiTemplateRepository: Repository<ContentAiTemplate>,
    @InjectRepository(CallLog)
    private callLogRepository: Repository<CallLog>,
    @InjectRepository(AsteriskDid)
    private asteriskDidRepository: Repository<AsteriskDid>,
    @InjectRepository(VoiceTemplate)
    private voiceTemplateRepository: Repository<VoiceTemplate>,
    @InjectRepository(GeneratedAudio)
    private generatedAudioRepository: Repository<GeneratedAudio>,
    @InjectRepository(JourneyAudio)
    private journeyAudioRepository: Repository<JourneyAudio>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private twilioService: TwilioService,
    private contentAiService: ContentAiService,
    private callsService: CallsService,
    private asteriskSoundService: AsteriskSoundService,
    private kokoroService: KokoroService,
    private audioProcessingService: AudioProcessingService,
    private tcpaService: Tcpaservice,
    private tenantLimitsService: TenantLimitsService,
    private didsService: DidsService,
    private readonly moduleRef: ModuleRef,
    private timezoneService: TimezoneService,
    private leadStatusesService: LeadStatusesService,
  ) {}

  async create(tenantId: string, dto: CreateJourneyDto): Promise<Journey> {
    const journey = this.journeyRepository.create({
      ...dto,
      tenantId,
      status: dto.status || JourneyStatus.DRAFT,
    });
    return this.journeyRepository.save(journey);
  }

  async findAll(tenantId: string): Promise<Journey[]> {
    // Use QueryBuilder for optimized query - don't load all contacts
    const journeys = await this.journeyRepository
      .createQueryBuilder('journey')
      .leftJoinAndSelect('journey.nodes', 'nodes')
      .where('journey.tenantId = :tenantId', { tenantId })
      .orderBy('journey.createdAt', 'DESC')
      .getMany();
    
    // Get contact counts for all journeys in a single query (only ACTIVE contacts)
    const journeyIds = journeys.map(j => j.id);
    if (journeyIds.length > 0) {
      const contactCounts = await this.journeyContactRepository
        .createQueryBuilder('jc')
        .select('jc.journeyId', 'journeyId')
        .addSelect('COUNT(jc.id)', 'count')
        .where('jc.journeyId IN (:...journeyIds)', { journeyIds })
        .andWhere('jc.tenantId = :tenantId', { tenantId })
        .andWhere('jc.status = :status', { status: JourneyContactStatus.ACTIVE })
        .groupBy('jc.journeyId')
        .getRawMany();
      
      const countMap = new Map(contactCounts.map(c => [c.journeyId, parseInt(c.count)]));
      
      // Add contactsCount to each journey
      journeys.forEach(journey => {
        (journey as any).contactsCount = countMap.get(journey.id) || 0;
        (journey as any).contacts = []; // Empty array for compatibility
      });
    }
    
    return journeys;
  }

  async findOne(tenantId: string, id: string): Promise<Journey> {
    // Use QueryBuilder for optimized query - don't load all contacts (they're loaded separately)
    const journey = await this.journeyRepository
      .createQueryBuilder('journey')
      .leftJoinAndSelect('journey.nodes', 'nodes')
      .where('journey.id = :id', { id })
      .andWhere('journey.tenantId = :tenantId', { tenantId })
      .getOne();
    
    if (!journey) {
      throw new NotFoundException('Journey not found');
    }
    
    // Get contact count separately (much faster than loading all contacts)
    // Only count ACTIVE contacts
    const contactsCount = await this.journeyContactRepository.count({
      where: { journeyId: id, tenantId, status: JourneyContactStatus.ACTIVE },
    });
    
    // Ensure all node configs and connections are valid objects (not null)
    if (journey.nodes) {
      journey.nodes = journey.nodes.map((node) => ({
        ...node,
        config: node.config || {},
        connections: node.connections || {},
      }));
    }
    
    // Add contactsCount to journey object (contacts loaded separately via paginated endpoint)
    (journey as any).contactsCount = contactsCount;
    (journey as any).contacts = []; // Empty array to maintain compatibility
    
    return journey;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateJourneyDto>): Promise<Journey> {
    const journey = await this.findOne(tenantId, id);
    Object.assign(journey, dto);
    const updatedJourney = await this.journeyRepository.save(journey);
    // Clear node cache when journey is updated
    this.clearNodeCache(id);
    return updatedJourney;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const journey = await this.findOne(tenantId, id);
    await this.journeyRepository.remove(journey);
    // Clear node cache when journey is deleted
    this.clearNodeCache(id);
  }

  async launch(tenantId: string, id: string): Promise<Journey> {
    // Load journey directly from repository to ensure we have a proper entity instance
    const journey = await this.journeyRepository.findOne({
      where: { id, tenantId },
    });
    
    if (!journey) {
      throw new NotFoundException('Journey not found');
    }
    
    if (journey.status === JourneyStatus.ACTIVE) {
      throw new BadRequestException('Journey is already active');
    }
    
    journey.status = JourneyStatus.ACTIVE;
    journey.startedAt = new Date();
    return this.journeyRepository.save(journey);
  }

  async pause(tenantId: string, id: string): Promise<Journey> {
    // Load journey directly from repository to ensure we have a proper entity instance
    const journey = await this.journeyRepository.findOne({
      where: { id, tenantId },
    });
    
    if (!journey) {
      throw new NotFoundException('Journey not found');
    }
    
    if (journey.status !== JourneyStatus.ACTIVE) {
      throw new BadRequestException('Journey is not active');
    }
    
    journey.status = JourneyStatus.PAUSED;
    journey.pausedAt = new Date();
    return this.journeyRepository.save(journey);
  }

  async updateRemovalCriteria(
    tenantId: string,
    journeyId: string,
    removalCriteria: any,
  ): Promise<Journey> {
    // Load journey without relations to avoid TypeORM trying to update related entities
    const journey = await this.journeyRepository.findOne({
      where: { id: journeyId, tenantId },
    });
    
    if (!journey) {
      throw new NotFoundException('Journey not found');
    }
    
    // Generate webhook token if webhook conditions exist and token doesn't exist
    const hasWebhookCondition = removalCriteria?.conditions?.some(
      (c: any) => c.type === 'webhook'
    );
    
    if (hasWebhookCondition && !removalCriteria.webhookToken) {
      removalCriteria.webhookToken = crypto.randomBytes(32).toString('hex');
    }
    
    // Use update instead of save to avoid TypeORM trying to update relations
    await this.journeyRepository.update(
      { id: journeyId, tenantId },
      { removalCriteria },
    );
    
    // Return updated journey
    const updatedJourney = await this.journeyRepository.findOne({
      where: { id: journeyId, tenantId },
    });
    
    return updatedJourney!;
  }

  async generateWebhookToken(tenantId: string, journeyId: string): Promise<string> {
    // Load journey without relations to avoid TypeORM trying to update related entities
    const journey = await this.journeyRepository.findOne({
      where: { id: journeyId, tenantId },
    });
    
    if (!journey) {
      throw new NotFoundException('Journey not found');
    }
    
    const webhookToken = crypto.randomBytes(32).toString('hex');
    
    // Ensure removalCriteria object exists and preserve existing structure
    const currentRemovalCriteria = journey.removalCriteria || { enabled: false, conditions: [] };
    journey.removalCriteria = {
      ...currentRemovalCriteria,
      webhookToken,
    };
    
    // Use update instead of save to avoid TypeORM trying to update relations
    await this.journeyRepository.update(
      { id: journeyId, tenantId },
      { removalCriteria: journey.removalCriteria },
    );
    
    this.logger.log(`[JourneyWebhook] Generated webhook token for journey ${journeyId}`);
    return webhookToken;
  }

  async getWebhookUrl(tenantId: string, journeyId: string, baseUrl?: string): Promise<string | null> {
    const journey = await this.findOne(tenantId, journeyId);
    const webhookToken = journey.removalCriteria?.webhookToken;
    
    if (!webhookToken) {
      return null;
    }
    
    // Use baseUrl if provided, otherwise use environment variable or default
    let apiBase = baseUrl || process.env.API_BASE_URL;
    
    // If no baseUrl provided, construct from environment
    if (!apiBase) {
      // Check if we're in production (custom domain)
      if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.includes('nurtureengine.net')) {
        apiBase = 'https://api.nurtureengine.net';
      } else {
        // Development or IP-based access
        apiBase = process.env.FRONTEND_URL?.replace(':5001', ':5002') || 'http://localhost:5002';
      }
    }
    
    // Clean up the baseUrl - remove any malformed protocol
    apiBase = apiBase.replace(/^https?:?\/?\/?/, ''); // Remove http:, https:, http://, https://, https:/
    
    // Ensure baseUrl has proper protocol
    if (apiBase.includes('nurtureengine.net')) {
      apiBase = `https://${apiBase}`;
    } else if (!apiBase.startsWith('http://') && !apiBase.startsWith('https://')) {
      apiBase = `https://${apiBase}`;
    }
    
    // Remove trailing slash if present
    apiBase = apiBase.replace(/\/$/, '');
    
    // Add /api if not already present
    const apiPath = apiBase.includes('/api') ? apiBase : `${apiBase}/api`;
    
    // Ensure we have a properly formatted URL
    const webhookUrl = `${apiPath}/webhooks/journeys/removal-webhook/${journeyId}/${webhookToken}`;
    
    this.logger.log(`[JourneyWebhook] Generated webhook URL for journey ${journeyId}`, {
      baseUrl,
      apiBase,
      apiPath,
      webhookUrl,
    });
    
    return webhookUrl;
  }

  async getRemovalCriteria(tenantId: string, journeyId: string): Promise<any> {
    const journey = await this.findOne(tenantId, journeyId);
    return journey.removalCriteria || { enabled: false, conditions: [] };
  }

  async addNode(tenantId: string, journeyId: string, dto: CreateJourneyNodeDto): Promise<JourneyNode> {
    await this.findOne(tenantId, journeyId);
    
    // Convert temporary IDs to UUIDs in config before creating node
    if (dto.config) {
      await this.convertTemporaryIdsToUuids(tenantId, journeyId, dto.config);
    }
    
    // Convert temporary IDs to UUIDs in connections
    // Filter out day-marker nodes (UI-only, shouldn't be saved)
    if (dto.connections?.nextNodeId) {
      if (dto.connections.nextNodeId.startsWith('day-marker-')) {
        // Remove day-marker references
        delete dto.connections.nextNodeId;
      } else {
        const resolvedId = await this.resolveTemporaryNodeId(tenantId, journeyId, dto.connections.nextNodeId);
        if (resolvedId) {
          dto.connections.nextNodeId = resolvedId;
        } else {
          this.logger.warn(`[JourneyNode] Could not resolve temporary node ID in connections: ${dto.connections.nextNodeId}`);
        }
      }
    }
    
    // Convert temporary IDs to UUIDs in connections.outputs
    // Filter out day-marker nodes (UI-only, shouldn't be saved)
    if (dto.connections?.outputs) {
      for (const [output, targetNodeId] of Object.entries(dto.connections.outputs)) {
        if (targetNodeId) {
          if (targetNodeId.startsWith('day-marker-')) {
            // Remove day-marker references
            delete dto.connections.outputs[output];
          } else {
            const resolvedId = await this.resolveTemporaryNodeId(tenantId, journeyId, targetNodeId);
            if (resolvedId) {
              dto.connections.outputs[output] = resolvedId;
            } else {
              this.logger.warn(`[JourneyNode] Could not resolve temporary node ID in connections.outputs.${output}: ${targetNodeId}`);
            }
          }
        }
      }
    }
    
    const node = this.journeyNodeRepository.create({
      ...dto,
      config: dto.config || {},
      connections: dto.connections || {},
      journeyId,
      tenantId,
    });
    return this.journeyNodeRepository.save(node);
  }

  /**
   * Resolve temporary node IDs (e.g., "TIME_DELAY-1763729522735") to UUIDs
   * This is a best-effort attempt. The frontend should ideally send UUIDs.
   * 
   * Strategy:
   * 1. If it's already a UUID, return it
   * 2. Try to find a node by matching the temporary ID pattern with recently created nodes
   * 3. If no match, return null (the error handling will catch it during execution)
   */
  private async resolveTemporaryNodeId(
    tenantId: string,
    journeyId: string,
    temporaryId: string,
  ): Promise<string | null> {
    // Temporary IDs are not UUIDs, so if it's already a UUID, return it
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(temporaryId)) {
      return temporaryId;
    }

    // Extract the node type and timestamp from temporary ID (e.g., "TIME_DELAY-1763729522735")
    const match = temporaryId.match(/^([A-Z_]+)-(\d+)$/);
    if (!match) {
      this.logger.warn(`[JourneyNode] Invalid temporary ID format: ${temporaryId}`);
      return null;
    }

    const nodeTypePrefix = match[1];
    const timestamp = parseInt(match[2], 10);
    
    // Find all nodes in the journey, ordered by creation time
    const allNodes = await this.journeyNodeRepository.find({
      where: { journeyId, tenantId },
      order: { createdAt: 'DESC' },
    });

    // Try to find a node that matches:
    // 1. Same node type prefix
    // 2. Created around the same time (within 5 minutes of the timestamp)
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    const targetTime = timestamp;
    
    for (const n of allNodes) {
      // Check if node type matches
      if (n.type === nodeTypePrefix || n.type.startsWith(nodeTypePrefix)) {
        // Check if created around the same time
        const nodeCreatedTime = n.createdAt?.getTime() || 0;
        const timeDiff = Math.abs(nodeCreatedTime - targetTime);
        
        if (timeDiff < timeWindow) {
          this.logger.debug(`[JourneyNode] Resolved temporary ID ${temporaryId} to UUID ${n.id} (time diff: ${timeDiff}ms)`);
          return n.id;
        }
      }
    }

    // If no match found, log warning but don't fail - let execution handle it
    this.logger.warn(`[JourneyNode] Could not resolve temporary ID: ${temporaryId} (type: ${nodeTypePrefix}, timestamp: ${timestamp})`);
    return null;
  }

  /**
   * Convert temporary node IDs to UUIDs in node configuration
   */
  private async convertTemporaryIdsToUuids(
    tenantId: string,
    journeyId: string,
    config: any,
  ): Promise<void> {
    if (!config) return;

    // Convert branches nextNodeId
    if (config.branches && Array.isArray(config.branches)) {
      for (const branch of config.branches) {
        if (branch.nextNodeId) {
          const resolvedId = await this.resolveTemporaryNodeId(tenantId, journeyId, branch.nextNodeId);
          if (resolvedId) {
            branch.nextNodeId = resolvedId;
          } else {
            this.logger.warn(`[JourneyNode] Could not resolve temporary node ID: ${branch.nextNodeId}`);
            // Don't set to null, keep the original value - the error handling will catch it during execution
          }
        }
      }
    }

    // Convert defaultBranch nextNodeId
    if (config.defaultBranch?.nextNodeId) {
      const resolvedId = await this.resolveTemporaryNodeId(tenantId, journeyId, config.defaultBranch.nextNodeId);
      if (resolvedId) {
        config.defaultBranch.nextNodeId = resolvedId;
      } else {
        this.logger.warn(`[JourneyNode] Could not resolve temporary node ID: ${config.defaultBranch.nextNodeId}`);
      }
    }

    // Convert paths nextNodeId (for weighted paths)
    if (config.paths && Array.isArray(config.paths)) {
      for (const path of config.paths) {
        if (path.nextNodeId) {
          const resolvedId = await this.resolveTemporaryNodeId(tenantId, journeyId, path.nextNodeId);
          if (resolvedId) {
            path.nextNodeId = resolvedId;
          } else {
            this.logger.warn(`[JourneyNode] Could not resolve temporary node ID: ${path.nextNodeId}`);
          }
        }
      }
    }
  }

  async updateNode(tenantId: string, journeyId: string, nodeId: string, dto: Partial<CreateJourneyNodeDto>): Promise<JourneyNode> {
    await this.findOne(tenantId, journeyId);
    const node = await this.journeyNodeRepository.findOne({
      where: { id: nodeId, journeyId, tenantId },
    });
    if (!node) {
      throw new NotFoundException('Node not found');
    }
    
    // Convert temporary IDs to UUIDs in config before merging
    if (dto.config) {
      await this.convertTemporaryIdsToUuids(tenantId, journeyId, dto.config);
      
      const existingConfig = node.config || {};
      // Remove undefined values from dto.config to avoid overwriting with undefined
      const cleanedConfig = Object.fromEntries(
        Object.entries(dto.config).filter(([_, value]) => value !== undefined)
      );
      node.config = { ...existingConfig, ...cleanedConfig };
    }
    
    // Convert temporary IDs to UUIDs in connections
    // Filter out day-marker nodes (UI-only, shouldn't be saved)
    if (dto.connections?.nextNodeId) {
      if (dto.connections.nextNodeId.startsWith('day-marker-')) {
        // Remove day-marker references
        delete dto.connections.nextNodeId;
      } else {
        const resolvedId = await this.resolveTemporaryNodeId(tenantId, journeyId, dto.connections.nextNodeId);
        if (resolvedId) {
          dto.connections.nextNodeId = resolvedId;
        } else {
          this.logger.warn(`[JourneyNode] Could not resolve temporary node ID in connections: ${dto.connections.nextNodeId}`);
        }
      }
    }
    
    // Convert temporary IDs to UUIDs in connections.outputs
    // Filter out day-marker nodes (UI-only, shouldn't be saved)
    if (dto.connections?.outputs) {
      for (const [output, targetNodeId] of Object.entries(dto.connections.outputs)) {
        if (targetNodeId) {
          if (targetNodeId.startsWith('day-marker-')) {
            // Remove day-marker references
            delete dto.connections.outputs[output];
          } else {
            const resolvedId = await this.resolveTemporaryNodeId(tenantId, journeyId, targetNodeId);
            if (resolvedId) {
              dto.connections.outputs[output] = resolvedId;
            } else {
              this.logger.warn(`[JourneyNode] Could not resolve temporary node ID in connections.outputs.${output}: ${targetNodeId}`);
            }
          }
        }
      }
    }
    
    // Update connections - merge with existing connections
    if (dto.connections !== undefined) {
      const existingConnections = node.connections || {};
      // Remove undefined values from dto.connections
      const cleanedConnections: any = Object.fromEntries(
        Object.entries(dto.connections).filter(([_, value]) => value !== undefined)
      );
      // Deep merge outputs if they exist
      if (dto.connections.outputs && existingConnections.outputs) {
        cleanedConnections.outputs = { ...existingConnections.outputs, ...cleanedConnections.outputs };
      }
      node.connections = { ...existingConnections, ...cleanedConnections };
    }
    
    // Update other fields
    if (dto.type !== undefined) node.type = dto.type;
    if (dto.positionX !== undefined) node.positionX = dto.positionX;
    if (dto.positionY !== undefined) node.positionY = dto.positionY;
    return this.journeyNodeRepository.save(node);
  }

  async deleteNode(tenantId: string, journeyId: string, nodeId: string): Promise<void> {
    await this.findOne(tenantId, journeyId);
    const node = await this.journeyNodeRepository.findOne({
      where: { id: nodeId, journeyId, tenantId },
    });
    if (!node) {
      throw new NotFoundException('Node not found');
    }
    await this.journeyNodeRepository.remove(node);
  }

  async getJourneyContacts(
    tenantId: string,
    journeyId: string,
    page: number = 1,
    limit: number = 50,
    sortBy?: string,
    sortOrder: 'ASC' | 'DESC' = 'DESC',
    search?: string,
  ): Promise<{ contacts: JourneyContact[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    
    // Build where clause
    const where: any = { journeyId, tenantId, status: JourneyContactStatus.ACTIVE };
    
    // Build query builder for search and sorting
    const queryBuilder = this.journeyContactRepository
      .createQueryBuilder('journeyContact')
      .leftJoinAndSelect('journeyContact.contact', 'contact')
      .where('journeyContact.journeyId = :journeyId', { journeyId })
      .andWhere('journeyContact.tenantId = :tenantId', { tenantId })
      .andWhere('journeyContact.status = :status', { status: JourneyContactStatus.ACTIVE });
    
    // Add search filter
    if (search) {
      queryBuilder.andWhere(
        '(contact.firstName ILIKE :search OR contact.lastName ILIKE :search OR contact.phoneNumber ILIKE :search OR contact.email ILIKE :search)',
        { search: `%${search}%` }
      );
    }
    
    // Add sorting
    if (sortBy) {
      const orderField = sortBy === 'name' 
        ? 'contact.firstName' 
        : sortBy === 'phone' 
        ? 'contact.phoneNumber'
        : sortBy === 'email'
        ? 'contact.email'
        : sortBy === 'enrolledAt'
        ? 'journeyContact.enrolledAt'
        : 'journeyContact.enrolledAt';
      queryBuilder.orderBy(orderField, sortOrder);
    } else {
      queryBuilder.orderBy('journeyContact.enrolledAt', 'DESC');
    }
    
    // Apply pagination
    queryBuilder.skip(skip).take(limit);
    
    const [contacts, total] = await queryBuilder.getManyAndCount();
    
    return {
      contacts,
      total,
      page,
      limit,
    };
  }

  async getNodes(tenantId: string, journeyId: string): Promise<JourneyNode[]> {
    await this.findOne(tenantId, journeyId);
    const nodes = await this.journeyNodeRepository.find({
      where: { journeyId, tenantId },
      order: { createdAt: 'ASC' },
    });
    // Ensure all node configs and connections are valid objects (not null)
    return nodes.map((node) => ({
      ...node,
      config: node.config || {},
      connections: node.connections || {},
    }));
  }

  async enrollContact(tenantId: string, journeyId: string, dto: EnrollContactDto): Promise<JourneyContact> {
    const journey = await this.findOne(tenantId, journeyId);
    // Allow enrollment in ACTIVE and DRAFT journeys (manual enrollment)
    if (journey.status === JourneyStatus.PAUSED || journey.status === JourneyStatus.ARCHIVED) {
      throw new BadRequestException('Cannot enroll contacts in paused or archived journeys');
    }

    const contact = await this.contactRepository.findOne({
      where: { id: dto.contactId, tenantId },
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // Check if already enrolled
    const existing = await this.journeyContactRepository.findOne({
      where: { journeyId, contactId: dto.contactId, tenantId },
    });

    if (existing && existing.status === JourneyContactStatus.ACTIVE) {
      throw new BadRequestException('Contact is already enrolled in this journey');
    }

    if (existing) {
      existing.status = JourneyContactStatus.ACTIVE;
      existing.enrolledAt = new Date();
      existing.metadata = {
        enrollmentSource: dto.enrollmentSource || 'manual',
        enrollmentData: dto.enrollmentData,
      };
      const saved = await this.journeyContactRepository.save(existing);
      
      // Start journey execution (only if not already started)
      if (!existing.currentNodeId) {
        await this.startJourneyExecution(tenantId, journeyId, saved.id);
      }
      
      return saved;
    }

    const journeyContact = this.journeyContactRepository.create({
      journeyId,
      contactId: dto.contactId,
      tenantId,
      status: JourneyContactStatus.ACTIVE,
      enrolledAt: new Date(),
      metadata: {
        enrollmentSource: dto.enrollmentSource || 'manual',
        enrollmentData: dto.enrollmentData,
      },
    });

    const saved = await this.journeyContactRepository.save(journeyContact);

    // Start journey execution
    await this.startJourneyExecution(tenantId, journeyId, saved.id);

    return saved;
  }

  /**
   * Bulk enroll multiple contacts into a journey (optimized for performance)
   */
  async bulkEnrollContacts(
    tenantId: string,
    journeyId: string,
    contactIds: string[],
    enrollmentSource: 'manual' | 'webhook' | 'segment' | 'campaign' = 'manual',
    enrollmentData?: Record<string, any>,
  ): Promise<{ success: number; failed: number; skipped: number }> {
    const journey = await this.findOne(tenantId, journeyId);
    if (journey.status === JourneyStatus.PAUSED || journey.status === JourneyStatus.ARCHIVED) {
      throw new BadRequestException('Cannot enroll contacts in paused or archived journeys');
    }

    // Bulk fetch contacts
    const contacts = await this.contactRepository.find({
      where: { id: In(contactIds), tenantId },
    });
    const validContactIds = new Set(contacts.map(c => c.id));

    // Bulk check existing journey contacts
    const existingJourneyContacts = await this.journeyContactRepository.find({
      where: { journeyId, contactId: In(contactIds), tenantId },
    });
    const existingContactIds = new Set(
      existingJourneyContacts
        .filter(jc => jc.status === JourneyContactStatus.ACTIVE)
        .map(jc => jc.contactId)
    );
    const existingToReactivate = existingJourneyContacts.filter(
      jc => jc.status !== JourneyContactStatus.ACTIVE
    );

    const result = {
      success: 0,
      failed: 0,
      skipped: 0,
    };

    // Prepare bulk inserts/updates
    const journeyContactsToCreate: JourneyContact[] = [];
    const journeyContactsToUpdate: JourneyContact[] = [];

    for (const contactId of contactIds) {
      if (!validContactIds.has(contactId)) {
        result.failed++;
        continue;
      }

      if (existingContactIds.has(contactId)) {
        result.skipped++;
        continue;
      }

      const existing = existingToReactivate.find(jc => jc.contactId === contactId);
      if (existing) {
        existing.status = JourneyContactStatus.ACTIVE;
        existing.enrolledAt = new Date();
        existing.metadata = {
          enrollmentSource,
          enrollmentData,
        };
        journeyContactsToUpdate.push(existing);
      } else {
        journeyContactsToCreate.push(
          this.journeyContactRepository.create({
            journeyId,
            contactId,
            tenantId,
            status: JourneyContactStatus.ACTIVE,
            enrolledAt: new Date(),
            metadata: {
              enrollmentSource,
              enrollmentData,
            },
          })
        );
      }
    }

    // Bulk save
    if (journeyContactsToUpdate.length > 0) {
      await this.journeyContactRepository.save(journeyContactsToUpdate);
      result.success += journeyContactsToUpdate.length;
    }

    if (journeyContactsToCreate.length > 0) {
      const saved = await this.journeyContactRepository.save(journeyContactsToCreate);
      result.success += saved.length;

      // Start journey execution for all new enrollments (in parallel batches)
      const batchSize = 10;
      for (let i = 0; i < saved.length; i += batchSize) {
        const batch = saved.slice(i, i + batchSize);
        await Promise.all(
          batch.map(jc => this.startJourneyExecution(tenantId, journeyId, jc.id).catch(err => {
            this.logger.error(`Failed to start journey execution for contact ${jc.contactId}: ${err.message}`);
          }))
        );
      }
    }

    return result;
  }

  /**
   * Check removal criteria for a contact based on webhook payload
   * This is a public method that can be called from webhook handlers
   */
  async checkRemovalCriteriaForWebhook(
    tenantId: string,
    journeyId: string,
    contactId: string,
    webhookPayload: Record<string, any>,
  ): Promise<boolean> {
    return this.checkRemovalCriteria(tenantId, journeyId, contactId, {
      webhookPayload,
    });
  }

  async removeContact(tenantId: string, journeyId: string, contactId: string, pause: boolean = false): Promise<void> {
    const journeyContact = await this.journeyContactRepository.findOne({
      where: { journeyId, contactId, tenantId },
    });

    if (!journeyContact) {
      throw new NotFoundException('Contact is not enrolled in this journey');
    }

    if (pause) {
      journeyContact.status = JourneyContactStatus.PAUSED;
      journeyContact.pausedAt = new Date();
      await this.journeyContactRepository.save(journeyContact);
    } else {
      journeyContact.status = JourneyContactStatus.REMOVED;
      journeyContact.removedAt = new Date();
      await this.journeyContactRepository.save(journeyContact);
    }
  }

  private async startJourneyExecution(tenantId: string, journeyId: string, journeyContactId: string): Promise<void> {
    const journey = await this.findOne(tenantId, journeyId);
    const journeyContact = await this.journeyContactRepository.findOne({
      where: { id: journeyContactId, tenantId },
      relations: ['contact'],
    });

    if (!journeyContact) {
      return;
    }

    // Check execution rules for after-hours handling
    const { ExecutionRulesService } = await import('../execution-rules/execution-rules.service');
    const executionRulesService = this.moduleRef.get(ExecutionRulesService, { strict: false });
    
    let shouldDelayDay1 = false;
    let day1StartTime: Date | null = null;
    
    // Get tenant timezone (needed for after-hours check and as fallback for contact timezone)
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    const tenantTimezone = tenant?.timezone || 'UTC';
    
    if (executionRulesService) {
      const rules = await executionRulesService.getExecutionRules(tenantId);
      
      // Use tenant timezone or fallback from rules
      const effectiveTenantTimezone = tenantTimezone || rules.afterHoursBusinessHours?.timezone || 'America/New_York';
      
      const now = new Date();
      
      if (rules.enableAfterHoursHandling && executionRulesService.isAfterHours(now, rules, effectiveTenantTimezone)) {
        // Calculate start of next business day
        day1StartTime = executionRulesService.calculateNextAvailableTime(now, rules, effectiveTenantTimezone);
        shouldDelayDay1 = true;
        
        this.logger.log(`[JourneyExecution] Lead submitted after hours (${effectiveTenantTimezone}), delaying day 1 nodes to ${day1StartTime.toISOString()}`);
      }
    }

    // Find entry node (node with no incoming connections)
    const nodes = await this.journeyNodeRepository.find({
      where: { journeyId, tenantId },
      order: { createdAt: 'ASC' },
    });

    if (nodes.length === 0) {
      return;
    }

    // Build a set of all node IDs that are referenced as targets (have incoming connections)
    const targetNodeIds = new Set<string>();
    
    for (const node of nodes) {
      // #region agent log
      this.writeDebugLog('journeys.service.ts:806', 'Checking node for target connections', { nodeId: node.id, nodeType: node.type, hasNextNodeId: !!node.connections?.nextNodeId, hasOutputs: !!node.connections?.outputs, outputsKeys: node.connections?.outputs ? Object.keys(node.connections.outputs) : [], hasBranches: !!(node.type === JourneyNodeType.CONDITION && node.config?.branches), hasPaths: !!(node.type === JourneyNodeType.WEIGHTED_PATH && node.config?.paths) }, 'A');
      // #endregion
      
      // Check regular connections
      if (node.connections?.nextNodeId) {
        targetNodeIds.add(node.connections.nextNodeId);
      }
      
      // SIMPLIFIED: outputs are deprecated, but check for backward compatibility
      // If outputs exist, use first output as nextNodeId
      if (node.connections?.outputs && Object.keys(node.connections.outputs).length > 0) {
        const firstOutputNodeId = Object.values(node.connections.outputs)[0] as string;
        if (firstOutputNodeId) {
          targetNodeIds.add(firstOutputNodeId);
        }
      }
      
      // Check CONDITION node branches
      if (node.type === JourneyNodeType.CONDITION && node.config?.branches) {
        for (const branch of node.config.branches) {
          if (branch.nextNodeId) {
            targetNodeIds.add(branch.nextNodeId);
          }
        }
        if (node.config.defaultBranch?.nextNodeId) {
          targetNodeIds.add(node.config.defaultBranch.nextNodeId);
        }
      }
      
      // Check WEIGHTED_PATH node paths
      if (node.type === JourneyNodeType.WEIGHTED_PATH && node.config?.paths) {
        for (const path of node.config.paths) {
          if (path.nextNodeId) {
            targetNodeIds.add(path.nextNodeId);
          }
        }
      }
    }
    
    // Find nodes that are NOT targets (have no incoming connections) - these are entry nodes
    const entryNodes = nodes.filter(node => !targetNodeIds.has(node.id));
    
    // Use the first entry node (by creation order), or fall back to first node if all nodes are connected
    const entryNode = entryNodes.length > 0 ? entryNodes[0] : nodes[0];
    
    // #region agent log
    this.writeDebugLog('journeys.service.ts:835', 'Entry node detection complete', { totalNodes: nodes.length, entryNodesCount: entryNodes.length, entryNodeId: entryNode?.id, entryNodeType: entryNode?.type, targetNodeIdsCount: targetNodeIds.size, targetNodeIds: Array.from(targetNodeIds), entryNodeIds: entryNodes.map(n => n.id) }, 'A');
    // #endregion
    
    console.log(`[JourneyExecution] Starting journey execution`, {
      journeyId,
      journeyContactId,
      totalNodes: nodes.length,
      entryNodes: entryNodes.length,
      entryNodeId: entryNode.id,
      entryNodeType: entryNode.type,
      allTargetNodeIds: Array.from(targetNodeIds),
      shouldDelayDay1,
      day1StartTime: day1StartTime?.toISOString(),
    });
    
    journeyContact.currentNodeId = entryNode.id;
    await this.journeyContactRepository.save(journeyContact);

    // Get contact timezone for scheduling
    const contactTimezone = journeyContact?.contact?.timezone || tenantTimezone;
    
    // If after hours, schedule all day 1 nodes for start of next business day
    if (shouldDelayDay1 && day1StartTime) {
      await this.scheduleDay1Nodes(tenantId, journeyId, journeyContactId, nodes, day1StartTime, contactTimezone);
    } else {
      // Schedule first node execution normally
      await this.scheduleNodeExecution(tenantId, journeyId, entryNode.id, journeyContactId, contactTimezone);
    }
  }

  /**
   * Schedule all day 1 nodes to execute at the start of the next business day
   * Only schedules the entry node(s) at the start time - other nodes will be scheduled
   * through the normal flow based on connections and TIME_DELAY nodes
   */
  private async scheduleDay1Nodes(
    tenantId: string,
    journeyId: string,
    journeyContactId: string,
    allNodes: JourneyNode[],
    startTime: Date,
    timezone: string = 'UTC',
  ): Promise<void> {
    // Build entry node set
    const targetNodeIds = new Set<string>();
    for (const node of allNodes) {
      if (node.connections?.nextNodeId) {
        targetNodeIds.add(node.connections.nextNodeId);
      }
      // SIMPLIFIED: outputs are deprecated, but check for backward compatibility
      // If outputs exist, use first output as nextNodeId
      if (node.connections?.outputs && Object.keys(node.connections.outputs).length > 0) {
        const firstOutputNodeId = Object.values(node.connections.outputs)[0] as string;
        if (firstOutputNodeId) {
          targetNodeIds.add(firstOutputNodeId);
        }
      }
      if (node.type === JourneyNodeType.CONDITION && node.config?.branches) {
        for (const branch of node.config.branches) {
          if (branch.nextNodeId) targetNodeIds.add(branch.nextNodeId);
        }
        if (node.config.defaultBranch?.nextNodeId) {
          targetNodeIds.add(node.config.defaultBranch.nextNodeId);
        }
      }
      if (node.type === JourneyNodeType.WEIGHTED_PATH && node.config?.paths) {
        for (const path of node.config.paths) {
          if (path.nextNodeId) targetNodeIds.add(path.nextNodeId);
        }
      }
    }
    
    // Find entry nodes that are day 1 (or have no day specified)
    const day1EntryNodes: JourneyNode[] = [];
    for (const node of allNodes) {
      const nodeDay = node.config?.day;
      const isEntryNode = !targetNodeIds.has(node.id);
      
      // Include if it's an entry node and (explicitly day 1 or no day specified)
      if (isEntryNode && (nodeDay === 1 || nodeDay === undefined)) {
        day1EntryNodes.push(node);
      }
    }

    this.logger.log(`[JourneyExecution] Scheduling ${day1EntryNodes.length} day 1 entry node(s) for ${startTime.toISOString()}`);

    // Set the first entry node as the current node
    const firstEntryNode = day1EntryNodes[0];
    if (firstEntryNode) {
      const journeyContact = await this.journeyContactRepository.findOne({
        where: { id: journeyContactId, tenantId },
      });
      if (journeyContact) {
        journeyContact.currentNodeId = firstEntryNode.id;
        await this.journeyContactRepository.save(journeyContact);
      }

      // Schedule only the entry node(s) at the start time
      // The normal scheduling flow will handle subsequent nodes through connections and delays
      for (const entryNode of day1EntryNodes) {
        await this.scheduleNodeExecutionAtTime(
          tenantId,
          journeyId,
          entryNode.id,
          journeyContactId,
          startTime,
        );
      }
    }
  }

  /**
   * Schedule a node execution at a specific time
   * Automatically spreads next-day executions to avoid all executing at once
   */
  private async scheduleNodeExecutionAtTime(
    tenantId: string,
    journeyId: string,
    nodeId: string,
    journeyContactId: string,
    scheduledAt: Date,
  ): Promise<void> {
    // Check if this is scheduling for tomorrow or later, and spread if so
    const now = new Date();
    const daysFromNow = Math.floor((scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    let finalScheduledAt = scheduledAt;
    
    if (daysFromNow >= 1) {
      // Spread next-day executions over a 2-hour window
      finalScheduledAt = this.spreadNextDayExecution(scheduledAt, journeyContactId, 120);
      this.logger.log(`[JourneyExecution] Spreading next-day execution for node ${nodeId} from ${scheduledAt.toISOString()} to ${finalScheduledAt.toISOString()}`);
    }
    // CRITICAL: Check if there's already a PENDING or EXECUTING execution for this node/contact combination
    // This prevents duplicate executions that cause loops
    const existingExecution = await this.journeyNodeExecutionRepository.findOne({
      where: {
        nodeId,
        journeyContactId,
        tenantId,
        status: In([ExecutionStatus.PENDING, ExecutionStatus.EXECUTING]),
      },
    });

    if (existingExecution) {
      this.logger.warn(
        `[JourneyExecution] Skipping duplicate execution - node ${nodeId} already has a ${existingExecution.status} execution for journey contact ${journeyContactId}`,
        {
          nodeId,
          journeyContactId,
          existingExecutionId: existingExecution.id,
          existingStatus: existingExecution.status,
          existingScheduledAt: existingExecution.scheduledAt,
        },
      );
      return; // Don't create a duplicate execution
    }

    const execution = this.journeyNodeExecutionRepository.create({
      journeyId,
      nodeId,
      journeyContactId,
      tenantId,
      status: ExecutionStatus.PENDING,
      scheduledAt: finalScheduledAt, // Use finalScheduledAt which includes spread buffer
    });

    await this.journeyNodeExecutionRepository.save(execution);
  }

  /**
   * Spreads execution times for next-day executions to avoid all executing at once
   * Uses a hash of journeyContactId to ensure consistent but distributed timing
   * Spreads executions over a configurable window (default: 2 hours)
   */
  private spreadNextDayExecution(baseTime: Date, journeyContactId: string, spreadWindowMinutes: number = 120): Date {
    // Create a simple hash from journeyContactId for consistent distribution
    let hash = 0;
    for (let i = 0; i < journeyContactId.length; i++) {
      const char = journeyContactId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Use absolute value and modulo to get a value between 0 and spreadWindowMinutes
    const offsetMinutes = Math.abs(hash) % spreadWindowMinutes;
    
    // Add the offset to the base time
    const spreadTime = new Date(baseTime);
    spreadTime.setMinutes(spreadTime.getMinutes() + offsetMinutes);
    
    return spreadTime;
  }

  async scheduleNodeExecution(
    tenantId: string,
    journeyId: string,
    nodeId: string,
    journeyContactId: string,
    timezone?: string,
  ): Promise<void> {
    const node = await this.journeyNodeRepository.findOne({
      where: { id: nodeId, tenantId },
    });

    if (!node) {
      this.logger.error(`[JourneyExecution] Cannot schedule node ${nodeId} - node not found for tenant ${tenantId}`, {
        nodeId,
        tenantId,
        journeyId,
        journeyContactId,
      });
      return;
    }

    // CRITICAL: Check if there's already a PENDING or EXECUTING execution for this node/contact combination
    // This prevents duplicate executions that cause loops
    const existingExecution = await this.journeyNodeExecutionRepository.findOne({
      where: {
        nodeId,
        journeyContactId,
        tenantId,
        status: In([ExecutionStatus.PENDING, ExecutionStatus.EXECUTING]),
      },
    });

    if (existingExecution) {
      this.logger.warn(
        `[JourneyExecution] Skipping duplicate execution - node ${nodeId} already has a ${existingExecution.status} execution for journey contact ${journeyContactId}`,
        {
          nodeId,
          journeyContactId,
          existingExecutionId: existingExecution.id,
          existingStatus: existingExecution.status,
          existingScheduledAt: existingExecution.scheduledAt,
        },
      );
      return; // Don't create a duplicate execution
    }

    // Get timezone: contact timezone -> tenant timezone -> UTC
    let effectiveTimezone = timezone || 'UTC';
    if (!timezone) {
      try {
        const journeyContact = await this.journeyContactRepository.findOne({
          where: { id: journeyContactId, tenantId },
          relations: ['contact'],
        });
        if (journeyContact?.contact?.timezone) {
          effectiveTimezone = journeyContact.contact.timezone;
        } else {
          const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
          effectiveTimezone = tenant?.timezone || 'UTC';
        }
      } catch (error) {
        this.logger.warn(`Failed to get timezone for journey contact ${journeyContactId}, using UTC`);
        effectiveTimezone = 'UTC';
      }
    }

    let scheduledAt = new Date();

    // Calculate delay for TIME_DELAY nodes
    if (node.type === JourneyNodeType.TIME_DELAY) {
      const { delayValue, delayUnit, delayAtTime } = node.config;
      if (delayAtTime) {
        // Specific time delay (HH:mm format) - interpret in the contact's timezone
        const [hours, minutes] = delayAtTime.split(':').map(Number);
        
        // Get current date/time in UTC
        const now = new Date();
        
        // Format current date in the contact's timezone to get today's date string
        const todayStr = formatInTimeZone(now, effectiveTimezone, 'yyyy-MM-dd');
        
        // Create the scheduled time string in the contact's timezone
        const scheduledTimeStr = `${todayStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
        
        // Parse this time as if it's in the contact's timezone, then convert to UTC for storage
        scheduledAt = this.timezoneService.parseInTimezone(scheduledTimeStr, effectiveTimezone);
        
        // If the time has already passed today in the contact's timezone, schedule for tomorrow
        if (scheduledAt < now) {
          // Get tomorrow's date string in the contact's timezone
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = formatInTimeZone(tomorrow, effectiveTimezone, 'yyyy-MM-dd');
          const scheduledTimeStrTomorrow = `${tomorrowStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
          const baseScheduledAt = this.timezoneService.parseInTimezone(scheduledTimeStrTomorrow, effectiveTimezone);
          
          // Spread next-day executions over a 2-hour window to avoid all executing at once
          scheduledAt = this.spreadNextDayExecution(baseScheduledAt, journeyContactId, 120);
          
          this.logger.log(`[JourneyExecution] Scheduled TIME_DELAY node ${nodeId} for tomorrow (spread) in ${effectiveTimezone} (UTC: ${scheduledAt.toISOString()})`);
        } else {
          this.logger.log(`[JourneyExecution] Scheduled TIME_DELAY node ${nodeId} for ${delayAtTime} in ${effectiveTimezone} (UTC: ${scheduledAt.toISOString()})`);
        }
      } else if (delayUnit && typeof delayValue === 'number' && delayValue >= 0) {
        // Relative delay - validate delayValue is a valid number (including 0)
        const now = new Date();
        scheduledAt = new Date();
        const value = Math.max(0, delayValue); // Ensure non-negative
        
        switch (delayUnit) {
          case 'MINUTES':
            scheduledAt.setMinutes(scheduledAt.getMinutes() + value);
            break;
          case 'HOURS':
            scheduledAt.setHours(scheduledAt.getHours() + value);
            break;
          case 'DAYS':
            scheduledAt.setDate(scheduledAt.getDate() + value);
            // If scheduling for tomorrow or later, spread executions over time
            const daysFromNow = Math.floor((scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (daysFromNow >= 1) {
              // Spread over 2-hour window for next-day executions
              scheduledAt = this.spreadNextDayExecution(scheduledAt, journeyContactId, 120);
            }
            break;
          default:
            console.warn(`Unknown delay unit: ${delayUnit}`);
        }
      } else {
        // Invalid delay configuration - execute immediately
        console.warn(`Invalid TIME_DELAY configuration for node ${nodeId}: delayValue=${delayValue}, delayUnit=${delayUnit}, delayAtTime=${delayAtTime}`);
      }
    }

    // For MAKE_CALL nodes, check if we need to adjust scheduledAt due to minimum call delay
    if (node.type === JourneyNodeType.MAKE_CALL) {
      try {
        const journeyContact = await this.journeyContactRepository.findOne({
          where: { id: journeyContactId, tenantId },
          relations: ['contact'],
        });
        
        if (journeyContact?.contact) {
          const contact = journeyContact.contact;
          const recentCall = await this.callLogRepository.findOne({
            where: {
              tenantId,
              to: contact.phoneNumber,
              createdAt: MoreThanOrEqual(new Date(Date.now() - 300000)), // Last 5 minutes
            },
            order: { createdAt: 'DESC' },
          });
          
          if (recentCall) {
            const timeSinceCall = Date.now() - recentCall.createdAt.getTime();
            const timeSinceCallSeconds = Math.floor(timeSinceCall / 1000);
            const MINIMUM_WAIT_MINUTES = 5;
            
            if (timeSinceCallSeconds < MINIMUM_WAIT_MINUTES * 60) {
              const remainingSeconds = (MINIMUM_WAIT_MINUTES * 60) - timeSinceCallSeconds;
              const adjustedScheduledAt = new Date(Date.now() + remainingSeconds * 1000);
              
              // Only adjust if the adjusted time is later than the originally scheduled time
              if (adjustedScheduledAt > scheduledAt) {
                this.logger.log(`[JourneyExecution] Adjusting MAKE_CALL scheduled time due to minimum call delay`, {
                  nodeId,
                  journeyContactId,
                  originalScheduledAt: scheduledAt.toISOString(),
                  adjustedScheduledAt: adjustedScheduledAt.toISOString(),
                  timeSinceCallSeconds,
                  remainingSeconds,
                });
                scheduledAt = adjustedScheduledAt;
              }
            }
          }
        }
      } catch (error) {
        // If we can't check the call delay, log but continue with original scheduledAt
        this.logger.warn(`[JourneyExecution] Failed to check call delay when scheduling MAKE_CALL node ${nodeId}`, {
          nodeId,
          journeyContactId,
          error: error.message,
        });
      }
    }

    const execution = this.journeyNodeExecutionRepository.create({
      journeyId,
      nodeId,
      journeyContactId,
      tenantId,
      status: ExecutionStatus.PENDING,
      scheduledAt,
    });

    await this.journeyNodeExecutionRepository.save(execution);
    
    this.logger.log(`[JourneyExecution] Created execution for node ${nodeId} (${node.type}) scheduled at ${scheduledAt.toISOString()}`, {
      executionId: execution.id,
      nodeId,
      nodeType: node.type,
      journeyContactId,
      scheduledAt: scheduledAt.toISOString(),
    });

    // Execute immediately if scheduled time has arrived
    // For TIME_DELAY nodes: execute immediately when scheduledAt arrives (delay already applied)
    // For other nodes: execute immediately (no delay configured)
    const now = new Date();
    if (scheduledAt <= now) {
      // Execute immediately - don't wait for scheduler
      // This ensures TIME_DELAY nodes execute as soon as their delay completes
      await this.executeNode(tenantId, journeyId, nodeId, journeyContactId);
    } else {
      // Scheduled for future - scheduler will pick it up
      this.logger.debug(`[JourneyExecution] Scheduled node ${nodeId} (${node.type}) for future execution at ${scheduledAt.toISOString()}`);
    }
  }

  /**
   * Determines the outcome of a node execution for routing to the correct output
   */
  private determineNodeOutcome(
    nodeType: JourneyNodeType,
    executionResult: any,
    journeyContact: JourneyContact,
  ): string {
    switch (nodeType) {
      case JourneyNodeType.SEND_SMS:
        // Check execution result
        if (executionResult.action === 'SMS_OPTED_OUT') {
          return 'opted_out';
        }
        if (!executionResult.success) {
          return 'failed';
        }
        // For now, we can't detect replies synchronously, so we'll use 'success'
        // Replies would need to be handled via webhook/async processing
        return 'success';
      
      case JourneyNodeType.MAKE_CALL:
        if (!executionResult.success) {
          return 'failed';
        }
        // Check call status from execution result if available
        if (executionResult.callStatus) {
          const status = executionResult.callStatus.toLowerCase();
          if (status === 'transferred') {
            return 'transferred';
          }
          if (status === 'answered' || status === 'completed') {
            return 'answered';
          }
          if (status === 'no_answer') {
            return 'no_answer';
          }
          if (status === 'busy') {
            return 'busy';
          }
        }
        // If waiting for call completion, return 'success' temporarily (will be updated when call completes)
        if (executionResult.waitingForCallCompletion) {
          return 'success'; // Temporary - will be updated by handleCallCompletion
        }
        // Default to success if call was initiated successfully
        return 'success';
      
      case JourneyNodeType.ADD_TO_CAMPAIGN:
      case JourneyNodeType.REMOVE_FROM_CAMPAIGN:
      case JourneyNodeType.EXECUTE_WEBHOOK:
      case JourneyNodeType.UPDATE_CONTACT_STATUS:
        return executionResult.success ? 'success' : 'failed';
      
      case JourneyNodeType.TIME_DELAY:
        return 'completed';
      
      case JourneyNodeType.CONDITION:
      case JourneyNodeType.WEIGHTED_PATH:
        // These handle their own routing via branches/paths
        return 'success';
      
      default:
        return executionResult.success ? 'success' : 'failed';
    }
  }

  async executeNode(tenantId: string, journeyId: string, nodeId: string, journeyContactId: string): Promise<void> {
    // #region agent log
    this.writeDebugLog('journeys.service.ts:1274', 'executeNode called', { tenantId, journeyId, nodeId, journeyContactId }, 'E');
    // #endregion
    
    // Use cached node lookup to reduce database queries
    const node = await this.getCachedNode(journeyId, nodeId, tenantId);

    const journeyContact = await this.journeyContactRepository.findOne({
      where: { id: journeyContactId, tenantId },
      relations: ['contact'],
    });

    // #region agent log
    this.writeDebugLog('journeys.service.ts:1283', 'Node and journeyContact lookup', { nodeFound: !!node, nodeType: node?.type, journeyContactFound: !!journeyContact, contactId: journeyContact?.contactId }, 'E');
    // #endregion

    if (!node || !journeyContact) {
      this.logger.error(`[JourneyExecution] Cannot execute node - node or journeyContact not found`, {
        nodeId,
        journeyContactId,
        tenantId,
        nodeFound: !!node,
        journeyContactFound: !!journeyContact,
      });
      return;
    }

    // Loop detection: Check if we're executing the same node repeatedly
    // Optimized: Only select needed fields (id, executedAt) for faster query
    const recentExecutions = await this.journeyNodeExecutionRepository
      .createQueryBuilder('execution')
      .select(['execution.id', 'execution.executedAt'])
      .where('execution.nodeId = :nodeId', { nodeId })
      .andWhere('execution.journeyContactId = :journeyContactId', { journeyContactId })
      .andWhere('execution.tenantId = :tenantId', { tenantId })
      .orderBy('execution.executedAt', 'DESC')
      .limit(3)
      .getMany();

    // If the same node has been executed 2+ times in the last 5 seconds, pause the journey immediately
    if (recentExecutions.length >= 2) {
      const timeDiff = recentExecutions[0]?.executedAt?.getTime() - recentExecutions[1]?.executedAt?.getTime();
      if (timeDiff && timeDiff < 5000) { // Less than 5 seconds
        this.logger.error(`[JourneyExecution] Loop detected: Node ${nodeId} executed ${recentExecutions.length} times in ${timeDiff}ms. Pausing journey immediately.`, {
          nodeId,
          nodeType: node.type,
          journeyContactId,
          recentExecutions: recentExecutions.map(e => ({ id: e.id, executedAt: e.executedAt })),
        });
        
        // Mark current execution as failed
        const currentExecution = this.journeyNodeExecutionRepository.create({
          journeyId,
          nodeId,
          journeyContactId,
          tenantId,
          status: ExecutionStatus.FAILED,
          executedAt: new Date(),
          completedAt: new Date(),
          result: {
            success: false,
            error: `Loop detected: Node executed ${recentExecutions.length} times in ${timeDiff}ms`,
            action: node.type,
          },
        });
        await this.journeyNodeExecutionRepository.save(currentExecution);
        
        // Pause the journey
        journeyContact.status = JourneyContactStatus.PAUSED;
        journeyContact.currentNodeId = nodeId; // Stay on current node
        await this.journeyContactRepository.save(journeyContact);
        return;
      }
    }

    // Optimized: Combine both queries into a single query with proper joins
    // This reduces 2 database queries to 1
    const executions = await this.journeyNodeExecutionRepository
      .createQueryBuilder('execution')
      .leftJoinAndSelect('execution.node', 'node')
      .where('execution.journeyContactId = :journeyContactId', { journeyContactId })
      .andWhere('execution.tenantId = :tenantId', { tenantId })
      .orderBy('execution.createdAt', 'DESC')
      .addOrderBy('execution.executedAt', 'DESC')
      .limit(10) // Get enough to find both current and previous
      .getMany();

    // Find execution for current node
    let execution = executions.find(e => e.nodeId === nodeId);
    
    // Find previous execution (most recent executed execution that's not the current node)
    const previousExecution = executions.find(e => e.nodeId !== nodeId && e.executedAt);

    // If no execution record exists, create one (this can happen if executeNode is called directly)
    if (!execution) {
      console.warn(`[JourneyExecution] No execution record found for node ${nodeId}, creating one`, {
        nodeId,
        journeyContactId,
        tenantId,
        nodeType: node.type,
      });
      execution = this.journeyNodeExecutionRepository.create({
        journeyId,
        nodeId,
        journeyContactId,
        tenantId,
        status: ExecutionStatus.EXECUTING,
        scheduledAt: new Date(),
        executedAt: new Date(),
        result: {
          previousAction: previousExecution?.node?.type || null,
          previousNodeId: previousExecution?.nodeId || null,
          previousNodeName: previousExecution?.node?.config?.messageContent?.substring(0, 50) || previousExecution?.node?.type || null,
        },
      });
      await this.journeyNodeExecutionRepository.save(execution);
    } else {
      // Update previous action info if not already set
      if (!execution.result) {
        execution.result = {};
      }
      if (!execution.result.previousAction && previousExecution && previousExecution.nodeId !== nodeId) {
        execution.result.previousAction = previousExecution.node?.type || null;
        execution.result.previousNodeId = previousExecution.nodeId || null;
        execution.result.previousNodeName = previousExecution.node?.config?.messageContent?.substring(0, 50) || previousExecution.node?.type || null;
      }
    }

    execution.status = ExecutionStatus.EXECUTING;
    execution.executedAt = new Date();
    await this.journeyNodeExecutionRepository.save(execution);

    try {
      let nextNodeId: string | undefined;
      let executionResult: any = { success: true };

      switch (node.type) {
        case JourneyNodeType.SEND_SMS:
          try {
            // Check if contact has opted out
            if (journeyContact.contact?.isOptedOut) {
              executionResult = {
                success: false,
                action: 'SMS_OPTED_OUT',
                message: 'Contact has opted out',
                to: journeyContact.contact.phoneNumber,
              };
              // Don't throw - allow journey to continue to opted_out output
              break;
            }

            // Check TCPA compliance before sending SMS
            const tcpaCheck = await this.tcpaService.checkCompliance(
              tenantId,
              journeyContact.contactId,
              JourneyNodeType.SEND_SMS,
              {
                journeyId,
                nodeId,
                messageContent: node.config.messageContent,
                isAutomated: true,
                isMarketing: true, // Assume marketing unless specified otherwise
                scheduledTime: execution.scheduledAt,
              },
            );

            if (!tcpaCheck.canProceed) {
              executionResult = {
                success: false,
                action: 'SMS_BLOCKED_TCPA',
                message: tcpaCheck.message || 'SMS blocked due to TCPA compliance violation',
                violations: tcpaCheck.violations,
                to: journeyContact.contact.phoneNumber,
              };
              // Don't throw - allow journey to continue to failed output
              break;
            }

            const smsResult = await this.executeSendSMS(tenantId, node, journeyContact);
            executionResult = {
              success: true,
              action: 'SMS_SENT',
              message: 'SMS sent successfully',
              messageSid: smsResult?.sid || null,
              to: journeyContact.contact.phoneNumber,
            };
          } catch (error) {
            executionResult = {
              success: false,
              action: error.message?.includes('TCPA') ? 'SMS_BLOCKED_TCPA' : 'SMS_FAILED',
              message: error.message,
              to: journeyContact.contact.phoneNumber,
            };
            // Don't throw - allow journey to continue to failed output
          }
          break;
        case JourneyNodeType.ADD_TO_CAMPAIGN:
          const campaign = await this.executeAddToCampaign(tenantId, node, journeyContact);
          executionResult = {
            success: true,
            action: 'ADDED_TO_CAMPAIGN',
            message: 'Contact added to campaign',
            campaignId: node.config.campaignId,
            campaignName: campaign?.name || null,
          };
          break;
        case JourneyNodeType.REMOVE_FROM_CAMPAIGN:
          await this.executeRemoveFromCampaign(tenantId, node, journeyContact);
          executionResult = {
            success: true,
            action: 'REMOVED_FROM_CAMPAIGN',
            message: 'Contact removed from campaign',
            campaignId: node.config.campaignId,
          };
          break;
        case JourneyNodeType.EXECUTE_WEBHOOK:
          const webhookResult = await this.executeWebhook(node, journeyContact);
          executionResult = {
            success: true,
            action: 'WEBHOOK_EXECUTED',
            message: 'Webhook executed successfully',
            webhookUrl: node.config.webhookUrl,
            response: webhookResult,
          };
          break;
        case JourneyNodeType.TIME_DELAY:
          this.logger.log(`[JourneyExecution] Executing TIME_DELAY node`, {
            nodeId: node.id,
            journeyId,
            journeyContactId,
            delayValue: node.config.delayValue,
            delayUnit: node.config.delayUnit,
            delayAtTime: node.config.delayAtTime,
            scheduledAt: execution.scheduledAt?.toISOString(),
            connections: node.connections,
            hasNextNodeId: !!node.connections?.nextNodeId,
            nextNodeId: node.connections?.nextNodeId,
            hasOutputs: !!node.connections?.outputs,
            outputsKeys: node.connections?.outputs ? Object.keys(node.connections.outputs) : [],
          });
          // TIME_DELAY node execution is immediate - the delay was already applied when scheduling this node
          // Now we just mark it as completed and move to the next node
          const delayAtTime = node.config.delayAtTime;
          executionResult = {
            success: true,
            action: 'DELAY_EXECUTED',
            message: `Delay completed: ${node.config.delayValue || 'scheduled'} ${node.config.delayUnit || delayAtTime || ''}`,
            delayValue: node.config.delayValue,
            delayUnit: node.config.delayUnit,
            delayAtTime: delayAtTime,
          };
          
          // Log warning if no next node is configured
          if (!node.connections?.nextNodeId && (!node.connections?.outputs || !node.connections.outputs['completed'])) {
            this.logger.warn(`[JourneyExecution] TIME_DELAY node ${node.id} has no next node configured. Journey may stop here.`, {
              nodeId: node.id,
              journeyId,
              journeyContactId,
              connections: node.connections,
            });
          }
          break;
        case JourneyNodeType.MAKE_CALL:
          try {
            console.log(`[JourneyExecution] Executing MAKE_CALL node`, {
              nodeId: node.id,
              journeyId,
              journeyContactId,
              contactPhone: journeyContact.contact.phoneNumber,
              config: node.config,
            });

            // Check TCPA compliance before making call
            const tcpaCheck = await this.tcpaService.checkCompliance(
              tenantId,
              journeyContact.contactId,
              JourneyNodeType.MAKE_CALL,
              {
                journeyId,
                nodeId,
                messageContent: node.config.voiceMessageUrl,
                isAutomated: true,
                isMarketing: true,
                scheduledTime: execution.scheduledAt,
              },
            );

            if (!tcpaCheck.canProceed) {
              console.warn(`[JourneyExecution] MAKE_CALL blocked by TCPA`, {
                nodeId: node.id,
                journeyId,
                contactId: journeyContact.contactId,
                violations: tcpaCheck.violations,
              });
              executionResult = {
                success: false,
                action: 'CALL_BLOCKED_TCPA',
                message: tcpaCheck.message || 'Call blocked due to TCPA compliance violation',
                violations: tcpaCheck.violations,
                to: journeyContact.contact.phoneNumber,
              };
              // Don't throw - allow journey to continue to failed output (consistent with SEND_SMS)
              break;
            }

            const callResult = await this.executeMakeCall(tenantId, node, journeyContact);
            console.log(`[JourneyExecution] MAKE_CALL executed successfully`, {
              nodeId: node.id,
              callResult: callResult?.asteriskUniqueId || callResult?.sid,
            });
            
            const callUniqueId = callResult?.callUniqueId || callResult?.asteriskUniqueId;
            
            // #region agent log
            this.writeDebugLog('journeys.service.ts:1598', 'MAKE_CALL initiated - waiting for completion', { nodeId: node.id, journeyId, journeyContactId, callUniqueId, asteriskUniqueId: callResult?.asteriskUniqueId }, 'F');
            // #endregion
            
            // Normalize phone number to E164 format to match call log format for consistent matching
            const normalizedPhoneNumber = PhoneFormatter.formatToE164(journeyContact.contact.phoneNumber);
            
            executionResult = {
              success: true,
              action: 'CALL_MADE',
              message: 'Call initiated successfully - waiting for completion',
              callSid: callResult?.sid || callResult?.asteriskUniqueId || null,
              asteriskUniqueId: callResult?.asteriskUniqueId || null,
              to: normalizedPhoneNumber, // Use normalized E164 format to match call log
              ivrAudioPreviewUrl: callResult?.ivrAudioPreviewUrl,
              ivrFilePath: callResult?.ivrFilePath,
              didUsed: callResult?.didUsed,
              didId: callResult?.didId,
              callUniqueId: callUniqueId,
              waitingForCallCompletion: true, // Flag to indicate we're waiting for call status
            };
            
            // Store callUniqueId in execution for later lookup
            execution.result = {
              ...execution.result,
              ...executionResult,
            };
            execution.status = ExecutionStatus.EXECUTING; // Keep as EXECUTING until call completes
            await this.journeyNodeExecutionRepository.save(execution);
            
            // Reload execution to verify it was saved correctly
            const savedExecution = await this.journeyNodeExecutionRepository.findOne({
              where: { id: execution.id },
            });
            
            // #region agent log
            this.writeDebugLog('journeys.service.ts:1640', 'MAKE_CALL execution saved - waiting for callback', { 
              executionId: execution.id, 
              nodeId: node.id, 
              callUniqueId, 
              asteriskUniqueId: callResult?.asteriskUniqueId, 
              status: execution.status,
              savedStatus: savedExecution?.status,
              savedWaitingFlag: savedExecution?.result?.waitingForCallCompletion,
              savedCallUniqueId: savedExecution?.result?.callUniqueId,
            }, 'F');
            // #endregion
            
            if (!savedExecution?.result?.waitingForCallCompletion) {
              this.logger.error(`[JourneyExecution] Failed to save waitingForCallCompletion flag for execution ${execution.id}`);
            }
            
            // Don't route yet - wait for call completion callback from AMI Event Listener
            // The routing will happen in handleCallCompletion callback
            return; // Exit early - routing will happen when call completes
          } catch (error: any) {
            console.error(`[JourneyExecution] MAKE_CALL failed`, {
              nodeId: node.id,
              journeyId,
              journeyContactId,
              error: error.message,
              stack: error.stack,
              config: node.config,
            });
            executionResult = {
              success: false,
              action: error.message?.includes('TCPA') ? 'CALL_BLOCKED_TCPA' : 'CALL_FAILED',
              message: error.message || 'Failed to make call',
              error: error.message,
              to: journeyContact.contact.phoneNumber,
            };
            // Don't throw error - allow journey to continue to next node
            // The execution will be marked as failed but journey can continue
          }
          break;
        case JourneyNodeType.CONDITION:
          nextNodeId = await this.evaluateCondition(tenantId, journeyId, node, journeyContact);
          if (!nextNodeId) {
            // #region agent log
            this.writeDebugLog('journeys.service.ts:1582', 'CONDITION node returned no nextNodeId', { nodeId: node.id, branchesCount: node.config?.branches?.length || 0, hasDefaultBranch: !!node.config?.defaultBranch?.nextNodeId }, 'B');
            // #endregion
            this.logger.warn(`[JourneyExecution] CONDITION node ${node.id} returned no nextNodeId - no branch matched and no defaultBranch configured`, {
              nodeId: node.id,
              branchesCount: node.config?.branches?.length || 0,
              hasDefaultBranch: !!node.config?.defaultBranch?.nextNodeId,
            });
          }
          executionResult = {
            success: true,
            action: 'CONDITION_EVALUATED',
            message: 'Condition evaluated',
            nextNodeId: nextNodeId || null,
          };
          break;
        case JourneyNodeType.WEIGHTED_PATH:
          nextNodeId = await this.evaluateWeightedPath(node, journeyContact);
          if (!nextNodeId) {
            // #region agent log
            this.writeDebugLog('journeys.service.ts:1574', 'WEIGHTED_PATH node returned no nextNodeId', { nodeId: node.id, pathsCount: node.config?.paths?.length || 0, pathsWithNextNodeId: node.config?.paths?.filter(p => p.nextNodeId).length || 0 }, 'C');
            // #endregion
            this.logger.warn(`[JourneyExecution] WEIGHTED_PATH node ${node.id} returned no nextNodeId - paths may be empty or missing nextNodeId`, {
              nodeId: node.id,
              pathsCount: node.config?.paths?.length || 0,
              pathsWithNextNodeId: node.config?.paths?.filter(p => p.nextNodeId).length || 0,
            });
          }
          executionResult = {
            success: true,
            action: 'PATH_SELECTED',
            message: 'Path selected based on weighted distribution',
            nextNodeId: nextNodeId || null,
          };
          break;
        case JourneyNodeType.UPDATE_CONTACT_STATUS:
          try {
            if (!node.config.leadStatus) {
              throw new BadRequestException('Lead status is required for UPDATE_CONTACT_STATUS node');
            }
            
            // Validate status exists for this tenant
            const tenantStatuses = await this.leadStatusesService.findAllStatuses(tenantId);
            const statusNames = tenantStatuses.map(s => s.name);
            if (!statusNames.includes(node.config.leadStatus)) {
              throw new BadRequestException(
                `Invalid lead status: ${node.config.leadStatus}. Valid statuses are: ${statusNames.join(', ')}`
              );
            }

            // Get contact ID from journeyContact
            const contactId = journeyContact.contactId || journeyContact.contact?.id;
            if (!contactId) {
              throw new BadRequestException('Contact ID is missing from journey contact');
            }

            // Verify contact exists
            const contact = await this.contactRepository.findOne({
              where: { id: contactId, tenantId },
            });

            if (!contact) {
              throw new NotFoundException(`Contact not found: ${contactId}`);
            }

            // Update the contact's status
            contact.leadStatus = node.config.leadStatus;
            await this.contactRepository.save(contact);

            executionResult = {
              success: true,
              action: 'CONTACT_STATUS_UPDATED',
              message: `Contact status updated to ${node.config.leadStatus}`,
              leadStatus: node.config.leadStatus,
              contactId: contactId,
            };
          } catch (error) {
            // Configuration/validation errors are critical - rethrow to pause journey
            executionResult = {
              success: false,
              action: 'CONTACT_STATUS_UPDATE_FAILED',
              message: error.message,
              error: error.message,
            };
            // Re-throw to trigger critical error handling
            throw error;
          }
          break;
        default:
          // Log unknown node type
          const errorMessage = `Unknown or unsupported node type: ${node.type}`;
          console.error(`[JourneyExecution] ${errorMessage}`, {
            nodeId: node.id,
            journeyId,
            journeyContactId,
            nodeType: node.type,
          });
          executionResult = {
            success: false,
            action: 'UNKNOWN_NODE_TYPE',
            message: errorMessage,
          };
          throw new Error(errorMessage);
      }

      // Mark execution as completed (even if it failed, we still mark it as completed so journey can continue)
      execution.status = executionResult.success === false ? ExecutionStatus.FAILED : ExecutionStatus.COMPLETED;
      execution.completedAt = new Date();
      
      // Merge execution result with existing result (preserve previous action info)
      const mergedResult = {
        ...execution.result,
        ...executionResult,
        nextNodeId: nextNodeId || executionResult.nextNodeId || undefined,
      };
      
      // Simplified: Store execution result directly (no outcome-based routing needed)
      // Add simple details for logging/display purposes
      if (node.type === JourneyNodeType.MAKE_CALL) {
        if (executionResult.success) {
          mergedResult.outcomeDetails = `Call initiated successfully${executionResult.callUniqueId ? ` (Unique ID: ${executionResult.callUniqueId})` : ''}`;
        } else {
          mergedResult.outcomeDetails = executionResult.error || 'Call failed';
        }
      } else if (node.type === JourneyNodeType.SEND_SMS) {
        if (executionResult.success) {
          mergedResult.outcomeDetails = `SMS sent successfully${executionResult.messageSid ? ` (SID: ${executionResult.messageSid})` : ''}`;
        } else {
          mergedResult.outcomeDetails = executionResult.error || 'SMS failed';
        }
      } else if (node.type === JourneyNodeType.CONDITION) {
        mergedResult.outcomeDetails = `Condition evaluated`;
      } else if (node.type === JourneyNodeType.TIME_DELAY) {
        mergedResult.outcomeDetails = `Delayed for ${executionResult.delayValue} ${executionResult.delayUnit || 'seconds'}`;
      }
      
      execution.result = mergedResult;
      await this.journeyNodeExecutionRepository.save(execution);
      
      // Move to next node - SIMPLIFIED: All nodes use connections.nextNodeId (except CONDITION/WEIGHTED_PATH)
      // CONDITION and WEIGHTED_PATH nodes use their evaluated nextNodeId from config
      let targetNodeId: string | undefined;
      
      // CONDITION and WEIGHTED_PATH nodes dynamically determine next node via branches/paths
      if ((node.type === JourneyNodeType.CONDITION || node.type === JourneyNodeType.WEIGHTED_PATH) && nextNodeId) {
        targetNodeId = nextNodeId;
        this.logger.log(`[JourneyExecution] Found next node from CONDITION/WEIGHTED_PATH evaluation: ${targetNodeId}`, {
          nodeId: node.id,
          nodeType: node.type,
          nextNodeId,
        });
      }
      // All other nodes use simple nextNodeId connection
      else if (node.connections?.nextNodeId) {
        targetNodeId = node.connections.nextNodeId;
        this.logger.log(`[JourneyExecution] Found next node from connections.nextNodeId: ${targetNodeId}`, {
          nodeId: node.id,
          nodeType: node.type,
        });
      } else {
        // No next node found - log error
        this.logger.error(`[JourneyExecution] No next node found for ${node.type} node ${node.id}. Journey will stop here.`, {
          nodeId: node.id,
          nodeType: node.type,
          hasNextNodeId: !!node.connections?.nextNodeId,
          nextNodeId: node.connections?.nextNodeId,
          executionResultNextNodeId: nextNodeId,
          connections: node.connections,
          journeyId,
          journeyContactId,
        });
      }
      
      // #region agent log
      this.writeDebugLog('journeys.service.ts:1708', 'Next node routing result', { nodeId: node.id, nodeType: node.type, targetNodeId, hasTargetNode: !!targetNodeId }, 'D');
      // #endregion
      
      if (targetNodeId) {
        
        // Validate that targetNodeId is a valid UUID
        // Temporary IDs like "TIME_DELAY-1763729522735" are not valid UUIDs
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(targetNodeId)) {
          this.logger.error(`[JourneyExecution] Invalid node ID format (not a UUID): ${targetNodeId}`, {
            currentNodeId: node.id,
            currentNodeType: node.type,
            targetNodeId,
            nextNodeId,
            connections: node.connections,
          });
          
          // Don't try to resolve temporary IDs - this causes loops
          // If a temporary ID exists, it means the frontend didn't properly save the node connections
          // We should pause the journey immediately to prevent infinite loops
          {
            // If we can't resolve it, log error and mark journey as paused
            this.logger.error(`[JourneyExecution] Cannot resolve temporary node ID: ${targetNodeId}. Journey will be paused.`, {
              currentNodeId: node.id,
              currentNodeType: node.type,
              targetNodeId,
              nextNodeId,
              connections: node.connections,
            });
            
            // Mark execution as failed with error details
            execution.status = ExecutionStatus.FAILED;
            execution.completedAt = new Date();
            execution.result = {
              success: false,
              error: `Cannot resolve temporary node ID: ${targetNodeId}`,
              action: node.type,
            };
            await this.journeyNodeExecutionRepository.save(execution);
            
            // Pause the journey
            journeyContact.status = JourneyContactStatus.PAUSED;
            journeyContact.currentNodeId = node.id; // Stay on current node
            await this.journeyContactRepository.save(journeyContact);
            return; // Don't continue to next node
          }
        }
        
        // Verify the target node exists before setting it
        const targetNode = await this.journeyNodeRepository.findOne({
          where: { id: targetNodeId, tenantId },
        });
        
        if (!targetNode) {
          this.logger.error(`[JourneyExecution] Target node not found: ${targetNodeId}`, {
            currentNodeId: node.id,
            currentNodeType: node.type,
            targetNodeId,
          });
          
          // Mark execution as failed
          execution.status = ExecutionStatus.FAILED;
          execution.completedAt = new Date();
          execution.result = {
            success: false,
            error: `Target node not found: ${targetNodeId}`,
            action: node.type,
          };
          await this.journeyNodeExecutionRepository.save(execution);
          
          // Pause the journey
          journeyContact.status = JourneyContactStatus.PAUSED;
          journeyContact.currentNodeId = node.id; // Stay on current node
          await this.journeyContactRepository.save(journeyContact);
          return; // Don't continue to next node
        }
        
        console.log(`[JourneyExecution] Moving to next node`, {
          currentNodeId: node.id,
          currentNodeType: node.type,
          targetNodeId,
          nextNodeId,
          connections: node.connections,
          executionResult: executionResult.action,
        });
        journeyContact.currentNodeId = targetNodeId;
        await this.journeyContactRepository.save(journeyContact);
        // Get contact timezone for scheduling
        let contactTimezone: string | undefined;
        try {
          const journeyContact = await this.journeyContactRepository.findOne({
            where: { id: journeyContactId, tenantId },
            relations: ['contact'],
          });
          if (journeyContact?.contact?.timezone) {
            contactTimezone = journeyContact.contact.timezone;
          } else {
            const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
            contactTimezone = tenant?.timezone;
          }
        } catch (error) {
          this.logger.warn(`Failed to get timezone for journey contact ${journeyContactId}`);
        }
        // Schedule the next node
        // For TIME_DELAY nodes: the delay has already been applied, so schedule next node immediately
        // For other nodes: schedule normally (if target is TIME_DELAY, it will apply its own delay)
        try {
          await this.scheduleNodeExecution(tenantId, journeyId, targetNodeId, journeyContactId, contactTimezone);
          
          if (node.type === JourneyNodeType.TIME_DELAY) {
            this.logger.log(`[JourneyExecution] TIME_DELAY completed successfully, scheduled next node: ${targetNodeId}`, {
              delayNodeId: node.id,
              nextNodeId: targetNodeId,
              delayValue: node.config.delayValue,
              delayUnit: node.config.delayUnit,
              delayAtTime: node.config.delayAtTime,
              journeyContactId,
              journeyId,
            });
          } else {
            this.logger.log(`[JourneyExecution] ${node.type} completed, scheduled next node: ${targetNodeId}`, {
              currentNodeId: node.id,
              currentNodeType: node.type,
              nextNodeId: targetNodeId,
              journeyContactId,
              journeyId,
            });
          }
        } catch (error) {
          this.logger.error(`[JourneyExecution] Failed to schedule next node ${targetNodeId} after ${node.type} completion`, {
            currentNodeId: node.id,
            currentNodeType: node.type,
            targetNodeId,
            journeyContactId,
            error: error.message,
            stack: error.stack,
          });
          
          // If scheduling failed due to minimum call delay, reschedule for later
          if (error.message && error.message.includes('Minimum') && error.message.includes('minutes required between calls')) {
            try {
              // Extract remaining minutes from error message or calculate from last call
              const contact = journeyContact.contact;
              const recentCall = await this.callLogRepository.findOne({
                where: {
                  tenantId,
                  to: contact.phoneNumber,
                  createdAt: MoreThanOrEqual(new Date(Date.now() - 300000)), // Last 5 minutes
                },
                order: { createdAt: 'DESC' },
              });
              
              if (recentCall) {
                const timeSinceCall = Date.now() - recentCall.createdAt.getTime();
                const timeSinceCallSeconds = Math.floor(timeSinceCall / 1000);
                const MINIMUM_WAIT_MINUTES = 5;
                const remainingSeconds = (MINIMUM_WAIT_MINUTES * 60) - timeSinceCallSeconds;
                const rescheduleDelayMinutes = Math.ceil(remainingSeconds / 60);
                
                // Reschedule the next node for after the minimum wait period
                const rescheduleTime = new Date(Date.now() + (rescheduleDelayMinutes * 60 * 1000));
                this.logger.log(`[JourneyExecution] Rescheduling next node ${targetNodeId} due to minimum call delay. Will execute at ${rescheduleTime.toISOString()}`, {
                  currentNodeId: node.id,
                  currentNodeType: node.type,
                  targetNodeId,
                  journeyContactId,
                  rescheduleDelayMinutes,
                  rescheduleTime: rescheduleTime.toISOString(),
                });
                
                // Get timezone for rescheduling
                let contactTimezone: string | undefined;
                try {
                  if (journeyContact?.contact?.timezone) {
                    contactTimezone = journeyContact.contact.timezone;
                  } else {
                    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
                    contactTimezone = tenant?.timezone;
                  }
                } catch (tzError) {
                  this.logger.warn(`Failed to get timezone for rescheduling journey contact ${journeyContactId}`);
                }
                
                // Create execution record with rescheduled time
                const nextNode = await this.journeyNodeRepository.findOne({
                  where: { id: targetNodeId, journeyId, tenantId },
                });
                
                if (nextNode) {
                  const rescheduledExecution = this.journeyNodeExecutionRepository.create({
                    journeyId,
                    nodeId: targetNodeId,
                    journeyContactId,
                    tenantId,
                    status: ExecutionStatus.PENDING,
                    scheduledAt: rescheduleTime,
                  });
                  await this.journeyNodeExecutionRepository.save(rescheduledExecution);
                  
                  this.logger.log(`[JourneyExecution] Successfully rescheduled next node ${targetNodeId} for ${rescheduleTime.toISOString()}`, {
                    currentNodeId: node.id,
                    targetNodeId,
                    rescheduleTime: rescheduleTime.toISOString(),
                  });
                }
              }
            } catch (rescheduleError) {
              this.logger.error(`[JourneyExecution] Failed to reschedule next node after call delay error`, {
                currentNodeId: node.id,
                targetNodeId,
                journeyContactId,
                rescheduleError: rescheduleError.message,
              });
            }
          }
          // Don't throw - allow execution to complete, but log the error for debugging
        }
      } else {
        // No explicit next node found - check if this node type should stop the journey
        // Only stop if explicitly configured (e.g., UPDATE_CONTACT_STATUS with DNC)
        const shouldStopJourney = node.type === JourneyNodeType.UPDATE_CONTACT_STATUS && 
                                 node.config?.leadStatus === 'DNC';
        
        if (shouldStopJourney) {
          this.logger.log(`[JourneyExecution] Journey stopped - contact marked as DNC`, {
            currentNodeId: node.id,
            currentNodeType: node.type,
          });
          journeyContact.status = JourneyContactStatus.COMPLETED;
          journeyContact.completedAt = new Date();
          await this.journeyContactRepository.save(journeyContact);
        } else {
          // Journey completed - no next node found
          this.logger.warn(`[JourneyExecution] Journey stopped - no next node found`, {
            currentNodeId: node.id,
            currentNodeType: node.type,
            nextNodeId,
            connections: node.connections,
            hasNextNodeId: !!node.connections?.nextNodeId,
          });
          journeyContact.status = JourneyContactStatus.COMPLETED;
          journeyContact.completedAt = new Date();
          await this.journeyContactRepository.save(journeyContact);
        }
      }
    } catch (error) {
      // #region agent log
      this.writeDebugLog('journeys.service.ts:1932', 'Error in executeNode', { nodeId: node?.id, nodeType: node?.type, journeyId, errorMessage: error?.message, errorStack: error?.stack?.substring(0, 500) }, 'E');
      // #endregion
      
      // Get previous execution for error case too
      const previousExecution = await this.journeyNodeExecutionRepository.findOne({
        where: { journeyContactId, tenantId },
        relations: ['node'],
        order: { executedAt: 'DESC' },
      });
      
      execution.status = ExecutionStatus.FAILED;
      execution.completedAt = new Date();
      const errorResult: any = {
        success: false,
        error: error.message,
        action: node.type,
        outcome: 'FAILED',
        outcomeDetails: `Execution failed: ${error.message}`,
      };
      
      // Add previous action info if available
      if (previousExecution && previousExecution.nodeId !== nodeId) {
        errorResult.previousAction = previousExecution.node?.type || null;
        errorResult.previousNodeId = previousExecution.nodeId || null;
        errorResult.previousNodeName = previousExecution.node?.config?.messageContent?.substring(0, 50) || previousExecution.node?.type || null;
      }
      
      execution.result = {
        ...execution.result,
        ...errorResult,
      };
      await this.journeyNodeExecutionRepository.save(execution);
      
      // Log error but allow journey to continue to next node (unless it's a critical error)
      // Critical errors: NotFoundException for node/journey, BadRequestException for invalid config
      const isCriticalError = error instanceof NotFoundException || 
                             (error instanceof BadRequestException && error.message.includes('required'));
      
      if (isCriticalError) {
        this.logger.error(`[JourneyExecution] Critical error in node execution - pausing journey`, {
          nodeId: node?.id,
          nodeType: node?.type,
          journeyId,
          journeyContactId,
          error: error.message,
        });
        // Pause journey on critical errors - reload journeyContact to ensure it's available
        const journeyContactToPause = await this.journeyContactRepository.findOne({
          where: { id: journeyContactId, tenantId },
        });
        if (journeyContactToPause) {
          journeyContactToPause.status = JourneyContactStatus.PAUSED;
          journeyContactToPause.pausedAt = new Date();
          await this.journeyContactRepository.save(journeyContactToPause);
        }
        throw error;
      } else {
        // Non-critical errors: log and continue journey
        this.logger.warn(`[JourneyExecution] Non-critical error in node execution - continuing journey`, {
          nodeId: node?.id,
          nodeType: node?.type,
          journeyId,
          journeyContactId,
          error: error.message,
        });
        // Don't throw - allow journey to continue to next node
        // The execution is already marked as failed
        return;
      }
    }
  }

  async getContactExecutions(tenantId: string, journeyId: string, contactId: string): Promise<any[]> {
    // Find journey contact
    const journeyContact = await this.journeyContactRepository.findOne({
      where: { journeyId, contactId, tenantId },
    });

    if (!journeyContact) {
      throw new NotFoundException('Contact not enrolled in this journey');
    }

    // Get all executions for this journey contact
    const executions = await this.journeyNodeExecutionRepository.find({
      where: { journeyContactId: journeyContact.id, tenantId },
      relations: ['node'],
      order: { scheduledAt: 'ASC' },
    });

    return executions.map((execution, index) => {
      const result = execution.result || {};
      return {
        id: execution.id,
        nodeId: execution.nodeId,
        nodeType: execution.node?.type,
        nodeName: execution.node?.config?.messageContent?.substring(0, 50) || execution.node?.type,
        status: execution.status,
        scheduledAt: execution.scheduledAt,
        executedAt: execution.executedAt,
        completedAt: execution.completedAt,
        result: {
          ...result,
          // Enhanced execution details
          ivrAudioPreviewUrl: result.ivrAudioPreviewUrl,
          ivrFilePath: result.ivrFilePath,
          didUsed: result.didUsed,
          didId: result.didId,
          previousAction: result.previousAction,
          previousNodeId: result.previousNodeId,
          previousNodeName: result.previousNodeName,
          outcome: result.outcome,
          outcomeDetails: result.outcomeDetails,
          callUniqueId: result.callUniqueId,
          callStatus: result.callStatus,
        },
      };
    });
  }

  /**
   * Get all journey executions for a contact across all journeys
   */
  async getAllContactJourneyExecutions(tenantId: string, contactId: string): Promise<any[]> {
    // Get all journey contacts for this contact
    const journeyContacts = await this.journeyContactRepository.find({
      where: { contactId, tenantId },
      relations: ['journey'],
    });

    if (journeyContacts.length === 0) {
      return [];
    }

    // Get all executions for all journey contacts
    const journeyContactIds = journeyContacts.map(jc => jc.id);
    const executions = await this.journeyNodeExecutionRepository.find({
      where: { journeyContactId: In(journeyContactIds), tenantId },
      relations: ['node', 'journeyContact'],
      order: { scheduledAt: 'DESC' }, // Most recent first
    });

    // Group by journey and map to include journey info
    return executions.map((execution) => {
      const result = execution.result || {};
      const journeyContact = journeyContacts.find(jc => jc.id === execution.journeyContactId);
      
      return {
        id: execution.id,
        journeyId: execution.journeyId,
        journeyName: journeyContact?.journey?.name || 'Unknown Journey',
        nodeId: execution.nodeId,
        nodeType: execution.node?.type,
        nodeName: execution.node?.config?.messageContent?.substring(0, 50) || execution.node?.type,
        status: execution.status,
        scheduledAt: execution.scheduledAt,
        executedAt: execution.executedAt,
        completedAt: execution.completedAt,
        result: {
          ...result,
          // Enhanced execution details
          ivrAudioPreviewUrl: result.ivrAudioPreviewUrl,
          ivrFilePath: result.ivrFilePath,
          didUsed: result.didUsed,
          didId: result.didId,
          previousAction: result.previousAction,
          previousNodeId: result.previousNodeId,
          previousNodeName: result.previousNodeName,
          outcome: result.outcome,
          outcomeDetails: result.outcomeDetails,
          callUniqueId: result.callUniqueId,
          callStatus: result.callStatus,
        },
      };
    });
  }

  private async executeSendSMS(tenantId: string, node: JourneyNode, journeyContact: JourneyContact): Promise<any> {
    const { messageContent, templateId, numberPoolId, contentAiTemplateId, eventTypeId } = node.config;
    const contact = journeyContact.contact;

    let finalMessage = messageContent || '';
    
    // Get base URL for app (used in variables)
    // Always use app.nurtureengine.net for SMS messages (never use localhost)
    const appBaseUrl = 'https://app.nurtureengine.net';
    
    // Generate calendar booking link if eventTypeId is provided
    // Use contact.id as leadId for tracking purposes
    let calendarLink = '';
    if (eventTypeId) {
      calendarLink = `${appBaseUrl}/book/${eventTypeId}?leadId=${contact.id}`;
    }
    
    // Check for Content AI template first (takes precedence)
    if (contentAiTemplateId) {
      try {
        const contentAiTemplate = await this.contentAiTemplateRepository.findOne({
          where: { id: contentAiTemplateId, tenantId, isActive: true },
        });

        if (contentAiTemplate) {
          // Prepare context with calendarLink for Content AI
          const aiContext: any = {
            contact: {
              firstName: contact.firstName,
              lastName: contact.lastName,
              phoneNumber: contact.phoneNumber,
              email: contact.email,
              leadStatus: contact.leadStatus,
              attributes: contact.attributes,
            },
            journey: {
              id: journeyContact.journeyId,
            },
          };
          
          // Add calendarLink to context if available
          if (calendarLink) {
            aiContext.calendarLink = calendarLink;
            aiContext.variables = {
              calendarLink: calendarLink,
              appUrl: appBaseUrl,
              baseUrl: appBaseUrl,
            };
          }
          
          if (contentAiTemplate.unique) {
            // Generate unique message for this contact
            finalMessage = await this.contentAiService.generateUniqueMessage(
              tenantId,
              contentAiTemplateId,
              aiContext,
            );
          } else {
            // Use random variation from generated variations
            finalMessage = await this.contentAiService.getRandomVariation(tenantId, contentAiTemplateId);
          }
          
          // After Content AI generation, ensure variables are still replaced
          // Content AI might preserve {{variable}} syntax, so we need to replace them
          // This will be done in the variable replacement section below
        }
      } catch (error) {
        // Fall back to regular template or messageContent if Content AI fails
        console.error('Content AI generation failed:', error);
      }
    }
    
    // Load regular template if specified and Content AI wasn't used
    if (!contentAiTemplateId && templateId) {
      const template = await this.templateRepository.findOne({
        where: { id: templateId, tenantId },
        relations: ['versions'],
      });
      
      if (template && template.versions && template.versions.length > 0) {
        // Get the latest approved version, or latest version if none approved
        const approvedVersions = template.versions.filter(v => v.status === 'approved');
        const versionsToUse = approvedVersions.length > 0 ? approvedVersions : template.versions;
        const latestVersion = versionsToUse.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        finalMessage = latestVersion.content || finalMessage;
      }
    }

    // Get appointment info for contact (next upcoming event) - use ModuleRef to avoid circular dependency
    const appointmentInfo = await this.getAppointmentInfo(tenantId, contact.id);
    
    // Replace all contact variables
    const variableMap: Record<string, string> = {
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      phoneNumber: contact.phoneNumber || '',
      email: contact.email || '',
      fullName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Contact',
      leadStatus: contact.leadStatus || '',
      calendarLink: calendarLink || '',
      appointmentTime: appointmentInfo.time || '',
      appointmentDate: appointmentInfo.date || '',
      appointmentDateTime: appointmentInfo.dateTime || '',
      appUrl: appBaseUrl,
      baseUrl: appBaseUrl,
    };
    
    // Check if user explicitly included {{calendarLink}} in the message before replacement
    const hasCalendarLinkVariable = finalMessage.includes('{{calendarLink}}');
    
    // Replace standard variables (including calendarLink)
    // Do multiple passes to ensure all variables are replaced (handles nested or multiple occurrences)
    let previousMessage = '';
    let iterations = 0;
    const maxIterations = 5;
    
    while (previousMessage !== finalMessage && iterations < maxIterations) {
      previousMessage = finalMessage;
      Object.entries(variableMap).forEach(([key, value]) => {
        // Use global flag to replace all occurrences
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
        finalMessage = finalMessage.replace(regex, String(value || ''));
      });
      iterations++;
    }
    
    // Verify calendarLink was replaced if it was in the message
    if (hasCalendarLinkVariable && eventTypeId && calendarLink) {
      const stillHasVariable = finalMessage.includes('{{calendarLink}}');
      if (stillHasVariable) {
        console.warn(`[Journey SMS] Warning: {{calendarLink}} variable was not replaced. Calendar link: ${calendarLink}`);
        // Force replace it one more time
        finalMessage = finalMessage.replace(/\{\{calendarLink\}\}/gi, calendarLink);
      }
    }
    
    // Auto-include calendarLink at the end of message if eventTypeId is configured
    // This ensures the booking link is always available when an event type is selected
    // Only append if the user didn't explicitly use {{calendarLink}} variable in their message
    if (eventTypeId && calendarLink && !hasCalendarLinkVariable) {
      // Append calendar link to the message
      finalMessage = `${finalMessage}\n\n${calendarLink}`;
    }
    
    // Debug logging to verify calendarLink is being replaced
    if (eventTypeId && calendarLink) {
      console.log(`[Journey SMS] Calendar link generated: ${calendarLink}`);
      console.log(`[Journey SMS] Final message includes calendarLink: ${finalMessage.includes(calendarLink)}`);
      console.log(`[Journey SMS] Had {{calendarLink}} variable: ${hasCalendarLinkVariable}`);
      console.log(`[Journey SMS] Variable replacement iterations: ${iterations}`);
    }
    
    // Replace custom attributes
    if (contact.attributes) {
      Object.entries(contact.attributes).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
        finalMessage = finalMessage.replace(regex, String(value || ''));
      });
    }

    // Get a number from the pool if specified
    let fromNumberId: string | undefined;
    if (numberPoolId) {
      const pool = await this.numberPoolRepository.findOne({
        where: { id: numberPoolId, tenantId },
        relations: ['numbers'],
      });
      
      if (pool && pool.numbers && pool.numbers.length > 0) {
        // Round-robin selection: use Redis or simple modulo
        const activeNumbers = pool.numbers.filter((n) => {
          // Check if number hasn't exceeded daily limit
          if (n.maxMessagesPerDay) {
            const today = new Date().toDateString();
            const lastReset = n.lastResetDate?.toDateString();
            if (lastReset !== today) {
              // Reset counter if it's a new day
              n.messagesSentToday = 0;
              n.lastResetDate = new Date();
            }
            if (n.messagesSentToday >= n.maxMessagesPerDay) {
              return false; // Skip this number if limit reached
            }
          }
          return true;
        });
        
        if (activeNumbers.length > 0) {
          // Simple round-robin: use contact ID to consistently select same number
          const index = parseInt(contact.id.replace(/-/g, ''), 16) % activeNumbers.length;
          fromNumberId = activeNumbers[index].id;
        }
      }
    }

    try {
      const result = await this.twilioService.sendSMS(tenantId, contact.phoneNumber, finalMessage, fromNumberId);
      
      // Increment SMS usage count if message was sent successfully
      if (result?.sid) {
        try {
          await this.tenantLimitsService.incrementSMSUsage(tenantId, 1);
        } catch (error) {
          console.error(`Failed to increment SMS usage for journey SMS:`, error);
        }
      }
      
      // Store message SID in execution result for tracking
      return result;
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      console.error(`Failed to send SMS to ${contact.phoneNumber}:`, error);
      throw new Error(`Failed to send SMS: ${errorMessage}`);
    }
  }

  private async executeMakeCall(tenantId: string, node: JourneyNode, journeyContact: JourneyContact): Promise<any> {
    const config = node.config || {} as any;
    const audioFile = config.audioFile as string | undefined;           // Asterisk audio file name (ivr_file)
    const voiceTemplateId = config.voiceTemplateId as string | undefined;     // Voice template ID
    const journeyAudioId = config.journeyAudioId as string | undefined;       // Journey audio ID
    const didPoolType = config.didPoolType as 'MC' | 'Twilio' | undefined;   // DID pool type (MC or Twilio)
    const didId = config.didId as string | undefined;               // Specific Asterisk DID ID
    const didSegment = config.didSegment as string | undefined;     // DID segment name (e.g., "twilio-main")
    const transferNumber = config.transferNumber as string | undefined;      // Transfer destination number
    const enableVmFile = config.enableVmFile as boolean | undefined;        // Enable voicemail file (ivr_vm_file)
    const recordCall = config.recordCall as boolean | undefined;           // Record call flag
    const contact = journeyContact.contact;

    // Check if contact is currently on an active call
    const activeCall = await this.callLogRepository.findOne({
      where: {
        tenantId,
        to: contact.phoneNumber,
        status: In([CallStatus.INITIATED, CallStatus.CONNECTED, CallStatus.ANSWERED]),
        createdAt: MoreThanOrEqual(new Date(Date.now() - 3600000)), // Last hour
      },
      order: { createdAt: 'DESC' },
    });

    if (activeCall) {
      const callAge = Date.now() - activeCall.createdAt.getTime();
      const callAgeMinutes = Math.floor(callAge / 60000);
      this.logger.warn(`[JourneyExecution] Contact ${contact.phoneNumber} is currently on an active call (${callAgeMinutes} minutes old). Skipping MAKE_CALL node.`, {
        contactId: contact.id,
        activeCallId: activeCall.id,
        activeCallStatus: activeCall.status,
        nodeId: node.id,
      });
      throw new Error(`Contact is currently on an active call. Please wait before attempting another call.`);
    }

    // Check for recent calls - ensure minimum 5 minutes between any calls
    const recentCall = await this.callLogRepository.findOne({
      where: {
        tenantId,
        to: contact.phoneNumber,
        createdAt: MoreThanOrEqual(new Date(Date.now() - 300000)), // Last 5 minutes
      },
      order: { createdAt: 'DESC' },
    });

    if (recentCall) {
      const timeSinceCall = Date.now() - recentCall.createdAt.getTime();
      const timeSinceCallMinutes = Math.floor(timeSinceCall / 60000);
      const timeSinceCallSeconds = Math.floor(timeSinceCall / 1000);
      
      // Minimum 5 minutes between any calls to prevent execution conflicts
      const MINIMUM_WAIT_MINUTES = 5;
      
      if (timeSinceCallSeconds < MINIMUM_WAIT_MINUTES * 60) {
        const remainingSeconds = (MINIMUM_WAIT_MINUTES * 60) - timeSinceCallSeconds;
        const remainingMinutes = Math.ceil(remainingSeconds / 60);
        this.logger.warn(`[JourneyExecution] Contact ${contact.phoneNumber} had a recent call ${timeSinceCallMinutes} minute(s) ago. Minimum ${MINIMUM_WAIT_MINUTES} minutes required between calls. Waiting ${remainingMinutes} more minute(s) before follow-up.`, {
          contactId: contact.id,
          recentCallId: recentCall.id,
          timeSinceCallMinutes,
          timeSinceCallSeconds,
          MINIMUM_WAIT_MINUTES,
          remainingMinutes,
          nodeId: node.id,
        });
        throw new Error(`Contact had a recent call ${timeSinceCallMinutes} minute(s) ago. Minimum ${MINIMUM_WAIT_MINUTES} minutes required between calls. Please wait ${remainingMinutes} more minute(s) before attempting another call.`);
      }
    }

    // Prepare IVR file path (remove extension and leading slash per documentation)
    let ivrFilePath = '';
    let generatedAudioForPreview: GeneratedAudio | null = null; // Store for IVR preview URL
    
    // If journey audio is specified, use it (highest priority)
    if (journeyAudioId) {
      // If journey audio is specified, use it (highest priority)
      try {
        const journeyAudio = await this.journeyAudioRepository.findOne({
          where: { id: journeyAudioId, tenantId },
        });

        if (!journeyAudio) {
          throw new Error(`Journey audio not found: ${journeyAudioId}`);
        }

        // Increment usage count
        journeyAudio.usageCount += 1;
        await this.journeyAudioRepository.save(journeyAudio);

        // Use the asterisk path from metadata, or derive from audioFilePath
        ivrFilePath = journeyAudio.metadata?.asteriskPath || '';
        if (!ivrFilePath && journeyAudio.audioFilePath) {
          const audioFileName = path.basename(journeyAudio.audioFilePath, '.wav');
          ivrFilePath = `custom/${audioFileName}`;
        }

        this.logger.log(`[JourneyExecution] Using journey audio for call`, {
          journeyAudioId,
          ivrFilePath,
          day: journeyAudio.day,
          callNumber: journeyAudio.callNumber,
          contactPhone: contact.phoneNumber,
        });
      } catch (error: any) {
        this.logger.error(`Failed to retrieve journey audio: ${error.message}`, error.stack);
        throw new Error(`Failed to process journey audio: ${error.message}`);
      }
    } else if (voiceTemplateId && !audioFile) {
      // If voice template is specified, generate or get the audio file
      try {
        // Load voice template
        const voiceTemplate = await this.voiceTemplateRepository.findOne({
          where: { id: voiceTemplateId, tenantId, isActive: true },
        });

        if (!voiceTemplate) {
          throw new Error(`Voice template not found or inactive: ${voiceTemplateId}`);
        }

        // Get appointment info for contact (if template uses appointment variables)
        const hasAppointmentVariables = voiceTemplate.variables && Array.isArray(voiceTemplate.variables) &&
          (voiceTemplate.variables.includes('appointmentTime') || 
           voiceTemplate.variables.includes('appointmentDate') || 
           voiceTemplate.variables.includes('appointmentDateTime'));
        
        const appointmentInfo = hasAppointmentVariables 
          ? await this.getAppointmentInfo(tenantId, contact.id)
          : { time: '', date: '', dateTime: '' };

        // Build variable values from contact data
        const variableValues: Record<string, string> = {};
        if (voiceTemplate.variables && Array.isArray(voiceTemplate.variables)) {
          for (const varName of voiceTemplate.variables) {
            let value: string | null = null;
            
            // Check appointment variables first
            if (varName === 'appointmentTime' || varName === 'appointment_time') {
              value = appointmentInfo.time;
            } else if (varName === 'appointmentDate' || varName === 'appointment_date') {
              value = appointmentInfo.date;
            } else if (varName === 'appointmentDateTime' || varName === 'appointment_date_time') {
              value = appointmentInfo.dateTime;
            } else {
              // Standard contact fields and custom attributes
              value = contact.attributes?.[varName] || 
                       (varName === 'firstName' || varName === 'first_name' ? contact.firstName : null) ||
                       (varName === 'lastName' || varName === 'last_name' ? contact.lastName : null) ||
                       (varName === 'phoneNumber' || varName === 'phone_number' || varName === 'phone' ? contact.phoneNumber : null) ||
                       (varName === 'email' ? contact.email : null) ||
                       '';
            }
            
            variableValues[varName] = value || '';
          }
        }

        // Normalize variableValues by sorting keys for consistent comparison
        const normalizedVariableValues = Object.keys(variableValues)
          .sort()
          .reduce((acc, key) => {
            acc[key] = variableValues[key];
            return acc;
          }, {} as Record<string, string>);

        // Check if audio already exists for this variable combination
        // Use QueryBuilder with JSONB containment operator (@>) which is faster with GIN index
        // Note: TypeORM preserves camelCase, so column name is "variableValues" (quoted for PostgreSQL)
        // The composite index on (voiceTemplateId, tenantId) filters first, then GIN index on variableValues speeds up JSONB comparison
        let generatedAudio: GeneratedAudio | null = await this.generatedAudioRepository
          .createQueryBuilder('audio')
          .where('audio."voiceTemplateId" = :voiceTemplateId', { voiceTemplateId: voiceTemplate.id })
          .andWhere('audio."tenantId" = :tenantId', { tenantId })
          .andWhere('audio."variableValues"::jsonb @> :variableValues::jsonb', {
            variableValues: JSON.stringify(normalizedVariableValues),
          })
          .andWhere(':variableValues::jsonb @> audio."variableValues"::jsonb', {
            variableValues: JSON.stringify(normalizedVariableValues),
          })
          .getOne();

        // Log for debugging
        if (!generatedAudio) {
          this.logger.debug(`No cached audio found for template ${voiceTemplate.id} with variables: ${JSON.stringify(normalizedVariableValues)}`);
        } else {
          this.logger.debug(`Using cached audio ${generatedAudio.id} (usage count: ${generatedAudio.usageCount})`);
        }

        if (!generatedAudio) {
          // Generate new audio
          const substitutedText = this.substituteVariables(voiceTemplate.messageContent, variableValues);
          
          this.logger.log(`[Journey] Generating audio for Make Call node - Journey: ${journeyContact.journeyId}, Node: ${node.id}, Contact: ${journeyContact.contactId}, Template: ${voiceTemplate.id} (${voiceTemplate.name})`);
          
          try {
            const voiceId = voiceTemplate.kokoroVoiceId || voiceTemplate.elevenLabsVoiceId;
            let { audioBuffer, duration } = await this.kokoroService.generateAudio({
              text: substitutedText,
              voiceId: voiceId,
              voiceConfig: voiceTemplate.voiceConfig,
              context: 'journey-make-call',
              requestId: `${journeyContact.journeyId}-${node.id}-${journeyContact.contactId}`,
            } as any);

            // Apply audio effects if configured
            if (voiceTemplate.audioEffects) {
              try {
                audioBuffer = await this.audioProcessingService.processAudio(
                  audioBuffer,
                  24000, // Kokoro sample rate
                  voiceTemplate.audioEffects,
                );
                this.logger.log(`Applied audio effects to voice template ${voiceTemplate.id}`);
              } catch (error) {
                this.logger.warn(`Failed to apply audio effects, using original audio: ${error.message}`);
              }
            }

            // Save audio file temporarily
            const filename = `${crypto.randomUUID()}.wav`;
            const tempAudioPath = await this.kokoroService.saveAudioFile(audioBuffer, filename);
            const audioUrl = `/uploads/audio/${filename}`;

            // Convert to Asterisk formats
            const baseName = path.basename(filename, '.wav');
            const convertedFiles = await this.asteriskSoundService.convertToAsteriskFormats(
              tempAudioPath,
              `voice_template_${baseName}`,
            );

            // Clean up temporary WAV file
            try {
              fs.unlinkSync(tempAudioPath);
            } catch (error) {
              console.warn(`Failed to delete temporary audio file: ${error.message}`);
            }

            // Save GeneratedAudio record with normalized variableValues
            const creditsUsed = this.kokoroService.calculateCredits(substitutedText, duration);
            this.logger.log(`Generating new audio for template ${voiceTemplate.id} - Credits: ${creditsUsed}, Duration: ${duration}s, Text length: ${substitutedText.length}`);
            generatedAudio = this.generatedAudioRepository.create({
              voiceTemplateId: voiceTemplate.id,
              variableValues: normalizedVariableValues, // Use normalized version
              audioUrl,
              audioFilePath: convertedFiles.wav, // Store WAV path
              fileSizeBytes: audioBuffer.length,
              durationSeconds: duration,
              usageCount: 0,
              tenantId,
              metadata: {
                generationTime: Date.now(),
                creditsUsed,
              },
            });
            generatedAudio = await this.generatedAudioRepository.save(generatedAudio);
            this.logger.log(`Generated audio saved: ${generatedAudio.id}`);

            // Deduct credits
            // TODO: Implement credit deduction if needed
          } catch (kokoroError: any) {
            // Fallback: Use default script without agent name when Kokoro fails
            this.logger.warn(`Kokoro audio generation failed, using fallback without agent name: ${kokoroError.message}`);
            
            // Create a fallback script without the agent name
            // Extract agent name patterns from the original script and remove them
            let fallbackText = substitutedText;
            
            // Remove agent name patterns:
            // - "this is [Name]" or "I'm [Name]" or "I am [Name]"
            // - "[Name] calling" or "[Name] here" or "[Name] speaking"
            // - "calling from [Brand], this is [Name]"
            fallbackText = fallbackText.replace(/\b(this is|I'm|I am|it's|it is)\s+[A-Z][a-z]+(\s+calling|\s+from|\s+here)?/gi, '');
            fallbackText = fallbackText.replace(/\b[A-Z][a-z]+\s+(calling|here|speaking|from)/gi, '');
            fallbackText = fallbackText.replace(/calling\s+from\s+[^,]+,\s*this\s+is\s+[A-Z][a-z]+/gi, 'calling');
            
            // Clean up any double spaces or awkward phrasing
            fallbackText = fallbackText.replace(/\s+/g, ' ').trim();
            
            // If the fallback text is too short or empty, use a generic default without name
            if (!fallbackText.trim() || fallbackText.trim().length < 20) {
              fallbackText = variableValues.firstName 
                ? `Hello ${variableValues.firstName}, we have an important message for you. Press 1 to speak with a representative.`
                : `Hello, we have an important message for you. Press 1 to speak with a representative.`;
            }
            
            // Log the fallback being used
            this.logger.log(`Using fallback script without agent name: ${fallbackText.substring(0, 100)}...`);
            
            // Re-throw the error - we still need audio generation to succeed
            // The fallback text is prepared but we can't proceed without audio
            // In the future, you could implement a system TTS fallback here using the fallbackText
            throw new BadRequestException(
              `Failed to generate audio with Kokoro: ${kokoroError.message}. ` +
              `Please check your Kokoro API configuration. A fallback script without agent name has been prepared but audio generation is required.`
            );
          }
        } else {
          // Use existing audio
          // Increment usage count
          generatedAudio.usageCount += 1;
          await this.generatedAudioRepository.save(generatedAudio);
        }
        
        // Store reference for IVR preview URL
        generatedAudioForPreview = generatedAudio;

        // Set IVR file path for Asterisk Playback()
        // Asterisk expects: "custom/filename" (without extension) when file is in /var/lib/asterisk/sounds/custom/
        const audioFileName = path.basename(generatedAudio.audioFilePath || '', '.wav');
        if (!audioFileName) {
          throw new Error('Generated audio file path is invalid');
        }
        // Prepend "custom/" so Asterisk can find it in /var/lib/asterisk/sounds/custom/
        ivrFilePath = `custom/${audioFileName}`;
        
        this.logger.log(`[JourneyExecution] Using voice template audio for call`, {
          voiceTemplateId,
          ivrFilePath,
          generatedAudioId: generatedAudio.id,
          contactPhone: contact.phoneNumber,
          audioFilePath: generatedAudio.audioFilePath,
        });
      } catch (error: any) {
        this.logger.error(`Failed to generate/retrieve voice template audio: ${error.message}`, error.stack);
        throw new Error(`Failed to process voice template: ${error.message}`);
      }
    } else if (audioFile) {
      // Use provided audio file
      // Remove extension and leading slash as per documentation
      ivrFilePath = audioFile.replace(/^\//, '').replace(/\.(wav|mp3|gsm|ulaw|alaw)$/i, '');
    }

    // Prepare voicemail file path (same as IVR if enabled)
    let vmFilePath = '';
    if (enableVmFile && ivrFilePath) {
      vmFilePath = ivrFilePath; // Use same file for voicemail
    }

    // FORCE MC DIDs ONLY - Ignore didPoolType and always use MC pool
    // System is configured to use MC DIDs only, regardless of node configuration
    const isMcPool = true; // Always true - force MC pool
    
    // Use Asterisk DID if specified, otherwise use segment or rotation
    let fromDidId: string | undefined = didId || undefined;
    
    // If segment is specified but no specific DID ID, get next available from segment
    // Only allow MC segments (not Twilio segments)
    if (!fromDidId && didSegment) {
      const segmentDid = await this.didsService.getNextAvailableDidBySegment(tenantId, didSegment);
      if (segmentDid) {
        // Verify the DID is from MC pool (not Twilio segment)
        const didSegmentLower = (segmentDid.segment || '').toLowerCase();
        const didIsTwilio = didSegmentLower === 'twilio' || didSegmentLower.startsWith('twilio-');
        
        if (!didIsTwilio) {
          fromDidId = segmentDid.id;
        } else {
          this.logger.warn(`[JourneyExecution] DID segment ${didSegment} is Twilio segment. Skipping - only MC DIDs are allowed.`);
        }
      }
    }

    // Use Asterisk AMI service for making calls
    try {
      this.logger.log(`[JourneyExecution] Making call with IVR file (FORCED MC TRUNK)`, {
        to: contact.phoneNumber,
        fromDidId,
        didPoolType: 'MC', // Always MC - forced by system
        ivrFile: ivrFilePath,
        ivrVmFile: vmFilePath,
        voiceTemplateId: voiceTemplateId || null,
        audioFile: audioFile || null,
      });

      // Get DID information if DID ID is provided (before making call)
      // FORCE MC TRUNK - Always use MC trunk regardless of didPoolType
      let didPhoneNumber: string | undefined;
      let didInfo: any = null;
      const isTwilioCall = false; // Always false - force MC trunk
      const callContext = 'DynamicIVR'; // Always use DynamicIVR for MC trunk
      
      if (fromDidId) {
        try {
          didInfo = await this.didsService.findOne(tenantId, fromDidId);
          didPhoneNumber = didInfo?.phoneNumber || didInfo?.number;
          
          // Verify DID is from MC pool (not Twilio segment)
          const didSegmentFromInfo = didInfo?.segment || didSegment || '';
          const didIsTwilio = didSegmentFromInfo && (didSegmentFromInfo.toLowerCase() === 'twilio' || didSegmentFromInfo.toLowerCase().startsWith('twilio-'));
          if (didIsTwilio) {
            this.logger.warn(`[JourneyExecution] DID ${fromDidId} is from Twilio pool. Only MC DIDs are allowed.`);
            throw new Error(`DID ${fromDidId} is from Twilio pool. Only MC DIDs are allowed.`);
          }
        } catch (error) {
          this.logger.warn(`Failed to fetch DID info for ${fromDidId}: ${error.message}`);
          throw error;
        }
      }

      const result = await this.callsService.makeCall(
        tenantId,
        {
          to: contact.phoneNumber,
          from: fromDidId || tenantId, // DID ID or tenantId for rotation
          context: callContext, // Always DynamicIVR for MC trunk
          transferNumber: transferNumber, // Transfer number if specified
          ivrFile: ivrFilePath, // IVR audio file path (without extension)
          ivrVmFile: vmFilePath, // Voicemail audio file path (without extension)
          useTwilioFormat: false, // Always false - MC trunk doesn't use Twilio format
          didPoolType: 'MC', // Force MC pool type
        },
      );
      
      // Extract DID information from call result (handles rotation case)
      if (!didPhoneNumber && result.callDetails?.did?.number) {
        didPhoneNumber = result.callDetails.did.number;
      }
      if (!fromDidId && didPhoneNumber) {
        // If rotation was used, find the DID ID by phone number
        try {
          const didByNumber = await this.asteriskDidRepository.findOne({
            where: { number: didPhoneNumber, tenantId },
          });
          if (didByNumber) {
            fromDidId = (didByNumber as any).id;
          }
        } catch (error: any) {
          this.logger.warn(`Failed to get DID ID by phone number: ${error.message}`);
        }
      }

      // Determine IVR preview URL - need to check what audio source was used
      let ivrPreviewUrl: string | undefined;
      
      if (journeyAudioId) {
        const journeyAudio = await this.journeyAudioRepository.findOne({
          where: { id: journeyAudioId, tenantId },
        });
        if (journeyAudio?.audioFilePath) {
          // Construct preview URL from audio file path
          ivrPreviewUrl = journeyAudio.audioFilePath.startsWith('/') 
            ? `/api${journeyAudio.audioFilePath}` 
            : `/api/uploads/audio/${path.basename(journeyAudio.audioFilePath)}`;
        }
      } else if (voiceTemplateId && generatedAudioForPreview) {
        // Use the stored generated audio reference
        // Prioritize audioFilePath over audioUrl since audioUrl may point to deleted temp file
        if (generatedAudioForPreview.audioFilePath) {
          // Use the actual file path (converted Asterisk format file)
          const filePath = generatedAudioForPreview.audioFilePath;
          // Check if it's an absolute path or relative path
          if (path.isAbsolute(filePath)) {
            // Extract filename from absolute path and construct API URL
            const filename = path.basename(filePath);
            ivrPreviewUrl = `/api/uploads/audio/${filename}`;
          } else if (filePath.startsWith('/')) {
            // Relative path starting with / - ensure it starts with /api
            ivrPreviewUrl = filePath.startsWith('/api') ? filePath : `/api${filePath}`;
          } else {
            // Relative path without leading / - assume it's in uploads/audio
            ivrPreviewUrl = `/api/uploads/audio/${filePath}`;
          }
        } else if (generatedAudioForPreview.audioUrl) {
          // Fallback to audioUrl if audioFilePath not available
          ivrPreviewUrl = generatedAudioForPreview.audioUrl.startsWith('/') 
            ? (generatedAudioForPreview.audioUrl.startsWith('/api') 
                ? generatedAudioForPreview.audioUrl 
                : `/api${generatedAudioForPreview.audioUrl}`)
            : `/api/${generatedAudioForPreview.audioUrl}`;
        } else if (ivrFilePath) {
          // Fallback: construct from ivrFilePath
          const filename = ivrFilePath.replace('custom/', '');
          ivrPreviewUrl = `/api/uploads/audio/${filename}.wav`;
        }
      } else if (audioFile) {
        // For direct audio files, try to construct preview URL
        ivrPreviewUrl = `/api/uploads/audio/${path.basename(audioFile)}`;
      }

      return {
        sid: result.asteriskUniqueId, // For compatibility with existing code
        uniqueId: result.asteriskUniqueId,
        ivrAudioPreviewUrl: ivrPreviewUrl,
        ivrFilePath: ivrFilePath,
        didUsed: didPhoneNumber,
        didId: fromDidId,
        callUniqueId: result.asteriskUniqueId,
        ...result,
      };
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      console.error(`Failed to make call to ${contact.phoneNumber}:`, error);
      throw new Error(`Failed to make call: ${errorMessage}`);
    }
  }

  private async executeAddToCampaign(tenantId: string, node: JourneyNode, journeyContact: JourneyContact): Promise<Campaign | null> {
    const { campaignId } = node.config;
    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }

    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId, tenantId },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const contact = journeyContact.contact;
    
    // Check if contact is already in campaign
    const existing = await this.campaignContactRepository.findOne({
      where: { campaignId, contactId: contact.id, tenantId },
    });

    if (!existing) {
      const campaignContact = this.campaignContactRepository.create({
        campaignId,
        contactId: contact.id,
        tenantId,
        status: CampaignContactStatus.PENDING,
      });
      await this.campaignContactRepository.save(campaignContact);
    }
    
    return campaign;
  }

  private async executeRemoveFromCampaign(tenantId: string, node: JourneyNode, journeyContact: JourneyContact): Promise<void> {
    const { campaignId } = node.config;
    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }

    const contact = journeyContact.contact;
    
    // Remove contact from campaign
    await this.campaignContactRepository.delete({
      campaignId,
      contactId: contact.id,
      tenantId,
    });
  }

  private async executeWebhook(node: JourneyNode, journeyContact: JourneyContact): Promise<void> {
    const {
      webhookId,
      webhookUrl,
      webhookMethod = 'POST',
      webhookHeaders,
      webhookBody,
      webhookRetries = 3,
      webhookRetryDelay = 1000,
      webhookTimeout = 30000,
      webhookResponseHandling,
    } = node.config;

    let finalUrl = webhookUrl;
    let finalMethod = webhookMethod;
    let finalHeaders = webhookHeaders || {};
    let finalBody = webhookBody || '{}';
    const maxRetries = webhookRetries || 3;
    const retryDelay = webhookRetryDelay || 1000;
    const timeout = webhookTimeout || 30000;

    // If webhookId is provided, load webhook from database
    if (webhookId) {
      const webhook = await this.webhookRepository.findOne({
        where: { id: webhookId, tenantId: journeyContact.tenantId },
      });
      if (!webhook || !webhook.isActive) {
        throw new Error('Webhook not found or inactive');
      }
      finalUrl = webhook.url;
      // Use webhook headers if configured
      if (webhook.headers) {
        finalHeaders = { ...finalHeaders, ...webhook.headers };
      }
      // Add webhook secret to headers if configured
      if (webhook.secret) {
        finalHeaders['X-Webhook-Secret'] = webhook.secret;
      }
    }

    if (!finalUrl) {
      throw new Error('Webhook URL is required');
    }

    const contact = journeyContact.contact;
    const journey = await this.journeyRepository.findOne({
      where: { id: journeyContact.journeyId },
    });

    // Enhanced variable substitution
    let body = finalBody;
    const variables: Record<string, any> = {
      contactId: contact.id,
      phoneNumber: contact.phoneNumber,
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      email: contact.email || '',
      fullName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
      journeyId: journeyContact.journeyId,
      journeyName: journey?.name || '',
      tenantId: journeyContact.tenantId,
      ...(contact.attributes || {}),
    };

    // Replace all variables in body template
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      body = body.replace(regex, String(variables[key] || ''));
    });

    // Also support nested object notation (e.g., {{contact.phoneNumber}})
    body = body.replace(/\{\{contact\.(\w+)\}\}/g, (match, field) => {
      return String(variables[field] || '');
    });

    // Replace variables in URL
    let url = finalUrl;
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      url = url.replace(regex, encodeURIComponent(String(variables[key] || '')));
    });

    // Replace variables in headers
    const processedHeaders: Record<string, string> = {};
    Object.keys(finalHeaders).forEach((key) => {
      let headerValue = String(finalHeaders[key]);
      Object.keys(variables).forEach((varKey) => {
        const regex = new RegExp(`\\{\\{${varKey}\\}\\}`, 'g');
        headerValue = headerValue.replace(regex, String(variables[varKey] || ''));
      });
      processedHeaders[key] = headerValue;
    });

    // Parse body as JSON
    let parsedBody: any;
    try {
      parsedBody = JSON.parse(body);
    } catch (error) {
      // If not valid JSON, treat as plain text
      parsedBody = body;
    }

    // Execute webhook with retry logic
    let lastError: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios({
          method: finalMethod,
          url,
          headers: {
            'Content-Type': 'application/json',
            ...processedHeaders,
          },
          data: parsedBody,
          timeout,
          validateStatus: (status) => status < 500, // Don't throw on 4xx errors
        });

        // Handle response if configured
        if (webhookResponseHandling && response.data) {
          const responseData = response.data;

          // Extract fields from response if configured
          if (webhookResponseHandling.extractFields) {
            const extractedData: Record<string, any> = {};
            webhookResponseHandling.extractFields.forEach((field) => {
              if (responseData[field] !== undefined) {
                extractedData[field] = responseData[field];
              }
            });

            // Store extracted data in contact attributes
            if (Object.keys(extractedData).length > 0) {
              contact.attributes = {
                ...contact.attributes,
                ...extractedData,
              };
              await this.contactRepository.save(contact);
            }
          }

          // Check for error in response
          if (webhookResponseHandling.errorField && responseData[webhookResponseHandling.errorField]) {
            throw new Error(`Webhook returned error: ${responseData[webhookResponseHandling.errorField]}`);
          }
        }

        // Log successful execution
        this.logger.log(`[JourneyExecution] Webhook executed successfully`, {
          journeyId: journeyContact.journeyId,
          contactId: contact.id,
          url,
          status: response.status,
        });

        return; // Success, exit retry loop
      } catch (error: any) {
        lastError = error;
        const isLastAttempt = attempt === maxRetries;

        if (isLastAttempt) {
          this.logger.error(`[JourneyExecution] Webhook execution failed after ${maxRetries} retries`, {
            journeyId: journeyContact.journeyId,
            contactId: contact.id,
            url,
            error: error.message,
          });
          throw new Error(`Webhook execution failed after ${maxRetries} retries: ${error.message}`);
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
        this.logger.warn(`[JourneyExecution] Webhook execution failed, retrying... (attempt ${attempt + 1}/${maxRetries})`, {
          journeyId: journeyContact.journeyId,
          contactId: contact.id,
          url,
          error: error.message,
        });
      }
    }

    throw lastError || new Error('Webhook execution failed');
  }

  private async evaluateCondition(
    tenantId: string,
    journeyId: string,
    node: JourneyNode,
    journeyContact: JourneyContact,
  ): Promise<string | undefined> {
    const { branches = [], defaultBranch } = node.config || {};
    const contact = journeyContact.contact;

    this.logger.debug(`[JourneyExecution] Evaluating CONDITION node`, {
      nodeId: node.id,
      branchesCount: branches?.length || 0,
      hasDefaultBranch: !!defaultBranch?.nextNodeId,
    });

    // Load conversation and messages for message-based conditions
    const conversation = await this.conversationRepository.findOne({
      where: { contactId: contact.id, tenantId },
      relations: ['messages'],
    });

    // Evaluate each branch condition
    for (const branch of branches || []) {
      if (!branch.condition || !branch.nextNodeId) {
        continue; // Skip invalid branches
      }
      
      const branchResult = await this.evaluateConditionBranch(tenantId, journeyId, branch.condition, contact, conversation);
      this.logger.debug(`[JourneyExecution] CONDITION branch evaluated`, {
        nodeId: node.id,
        branchLabel: branch.label,
        branchResult,
        nextNodeId: branch.nextNodeId,
      });
      
      if (branchResult) {
        return branch.nextNodeId;
      }
    }

    // Return default branch if no condition matched
    const defaultNextNodeId = defaultBranch?.nextNodeId;
    
    // #region agent log
    this.writeDebugLog('journeys.service.ts:2815', 'CONDITION node evaluation complete', { nodeId: node.id, defaultNextNodeId, noBranchesMatched: true, hasDefaultBranch: !!defaultBranch, branchesCount: branches?.length || 0 }, 'B');
    // #endregion
    
    this.logger.debug(`[JourneyExecution] CONDITION node evaluation complete`, {
      nodeId: node.id,
      defaultNextNodeId,
      noBranchesMatched: true,
    });
    
    return defaultNextNodeId;
  }

  private async evaluateConditionBranch(
    tenantId: string,
    journeyId: string,
    condition: { field: string; operator: string; value?: any; campaignId?: string },
    contact: Contact,
    conversation: Conversation | null,
  ): Promise<boolean> {
    const { field, operator, value } = condition;

    // Get field value based on field path
    let fieldValue: any;

    if (field.startsWith('contact.')) {
      const contactField = field.replace('contact.', '');
      if (contactField === 'firstName') fieldValue = contact.firstName;
      else if (contactField === 'lastName') fieldValue = contact.lastName;
      else if (contactField === 'email') fieldValue = contact.email;
      else if (contactField === 'phoneNumber') fieldValue = contact.phoneNumber;
      else if (contactField === 'leadStatus') fieldValue = contact.leadStatus;
      else if (contactField === 'hasConsent') fieldValue = contact.hasConsent;
      else if (contactField === 'isOptedOut') fieldValue = contact.isOptedOut;
      else if (contactField.startsWith('attributes.')) {
        const attrKey = contactField.replace('attributes.', '');
        fieldValue = contact.attributes?.[attrKey];
      }
    } else if (field === 'message.received') {
      // Check if contact has replied in this journey/campaign
      if (conversation) {
        const hasInboundMessage = conversation.messages?.some(
          (msg) => msg.direction === MessageDirection.INBOUND,
        );
        fieldValue = hasInboundMessage;
      } else {
        fieldValue = false;
      }
    } else if (field === 'message.receivedInJourney') {
      // Check if message was received after journey enrollment
      if (conversation && journeyId) {
        const journeyContact = await this.journeyContactRepository.findOne({
          where: { contactId: contact.id, journeyId, tenantId },
        });
        if (journeyContact) {
          const hasInboundAfterEnrollment = conversation.messages?.some(
            (msg) =>
              msg.direction === MessageDirection.INBOUND &&
              msg.createdAt > journeyContact.createdAt,
          );
          fieldValue = hasInboundAfterEnrollment;
        } else {
          fieldValue = false;
        }
      } else {
        fieldValue = false;
      }
    } else if (field === 'message.receivedInCampaign') {
      // Check if message was received in a specific campaign
      const campaignId = condition.campaignId;
      if (conversation && campaignId) {
        // Check if contact is in the campaign and has received messages
        const campaignContact = await this.campaignContactRepository.findOne({
          where: { campaignId, contactId: contact.id, tenantId },
        });
        if (campaignContact && conversation.messages) {
          const hasInboundInCampaign = conversation.messages.some(
            (msg) =>
              msg.direction === MessageDirection.INBOUND &&
              msg.createdAt > campaignContact.createdAt,
          );
          fieldValue = hasInboundInCampaign;
        } else {
          fieldValue = false;
        }
      } else {
        fieldValue = false;
      }
    } else if (field.startsWith('call.')) {
      // Handle call status conditions
      const callField = field.replace('call.', '');
      
      // Get the most recent call for this contact (by phone number)
      // Check calls made during or after journey enrollment
      let journeyContact: JourneyContact | null = null;
      if (journeyId) {
        journeyContact = await this.journeyContactRepository.findOne({
          where: { contactId: contact.id, journeyId, tenantId },
        });
      }
      
      // Find calls to this contact's phone number
      const callLogs = await this.callLogRepository.find({
        where: {
          tenantId,
          to: contact.phoneNumber,
        },
        order: { createdAt: 'DESC' },
        take: 1, // Get most recent call
      });
      
      // If journey contact exists, filter to calls made after enrollment
      let relevantCall: CallLog | null = null;
      if (callLogs.length > 0) {
        if (journeyContact) {
          // Find call made after journey enrollment
          relevantCall = callLogs.find(call => call.createdAt >= journeyContact!.createdAt) || null;
        } else {
          // Use most recent call
          relevantCall = callLogs[0];
        }
      }
      
      if (callField === 'status') {
        // Return the call status
        fieldValue = relevantCall?.status || null;
      } else if (callField === 'answered') {
        // Check if call was answered
        fieldValue = relevantCall?.status === CallStatus.ANSWERED;
      } else if (callField === 'noAnswer') {
        // Check if call had no answer
        fieldValue = relevantCall?.status === CallStatus.NO_ANSWER;
      } else if (callField === 'failed') {
        // Check if call failed
        fieldValue = relevantCall?.status === CallStatus.FAILED;
      } else if (callField === 'transferred') {
        // Check if call was transferred (second leg completed)
        // Check metadata.transferStatus === 'completed'
        fieldValue = relevantCall?.metadata?.transferStatus === 'completed';
      } else if (callField === 'received') {
        // Check if any call exists
        fieldValue = relevantCall !== null;
      } else {
        fieldValue = null;
      }
    }

    // Evaluate condition based on operator
    switch (operator) {
      case 'equals':
        // Handle boolean values specially
        if (typeof fieldValue === 'boolean') {
          return fieldValue === (value === 'true' || value === true);
        }
        return String(fieldValue) === String(value);
      case 'not_equals':
        // Handle boolean values specially
        if (typeof fieldValue === 'boolean') {
          return fieldValue !== (value === 'true' || value === true);
        }
        return String(fieldValue) !== String(value);
      case 'contains':
        return String(fieldValue || '').toLowerCase().includes(String(value || '').toLowerCase());
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'exists':
        return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
      case 'not_exists':
        return fieldValue === null || fieldValue === undefined || fieldValue === '';
      default:
        return false;
    }
  }

  private async evaluateWeightedPath(
    node: JourneyNode,
    journeyContact: JourneyContact,
  ): Promise<string | undefined> {
    const { paths = [] } = node.config;
    
    // #region agent log
    this.writeDebugLog('journeys.service.ts:2992', 'Evaluating WEIGHTED_PATH node', { nodeId: node.id, pathsCount: paths.length, pathsWithNextNodeId: paths.filter(p => p.nextNodeId).length, paths: paths.map(p => ({ id: p.id, label: p.label, percentage: p.percentage, hasNextNodeId: !!p.nextNodeId })) }, 'C');
    // #endregion
    
    if (paths.length === 0) {
      return undefined;
    }

    // Ensure percentages sum to 100
    const totalPercentage = paths.reduce((sum, path) => sum + (path.percentage || 0), 0);
    if (totalPercentage !== 100) {
      // Normalize percentages
      paths.forEach((path) => {
        path.percentage = (path.percentage || 0) * (100 / totalPercentage);
      });
    }

    // Use contact ID to deterministically select path (consistent for same contact)
    const contactIdHash = parseInt(journeyContact.contact.id.replace(/-/g, ''), 16);
    const randomValue = (contactIdHash % 10000) / 100; // 0-99.99
    
    let cumulativePercentage = 0;
    for (const path of paths) {
      cumulativePercentage += path.percentage || 0;
      if (randomValue < cumulativePercentage) {
        // #region agent log
        this.writeDebugLog('journeys.service.ts:3014', 'WEIGHTED_PATH selected path', { nodeId: node.id, selectedPathId: path.id, selectedPathLabel: path.label, selectedNextNodeId: path.nextNodeId, randomValue, cumulativePercentage }, 'C');
        // #endregion
        return path.nextNodeId;
      }
    }

    // Fallback to last path
    const fallbackNextNodeId = paths[paths.length - 1]?.nextNodeId;
    // #region agent log
    this.writeDebugLog('journeys.service.ts:3020', 'WEIGHTED_PATH fallback to last path', { nodeId: node.id, fallbackNextNodeId, pathsCount: paths.length }, 'C');
    // #endregion
    return fallbackNextNodeId;
  }

  private substituteVariables(text: string, variables: Record<string, string>): string {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      // Handle both {variable} and {{variable}} formats
      const singleBraceRegex = new RegExp(`\\{${key}\\}`, 'gi');
      const doubleBraceRegex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
      result = result.replace(doubleBraceRegex, value); // Replace {{variable}} first
      result = result.replace(singleBraceRegex, value); // Then replace {variable}
    }
    return result;
  }

  /**
   * Get appointment information for a contact (next upcoming event)
   * Returns formatted time and date in contact's timezone
   */
  private async getAppointmentInfo(tenantId: string, contactId: string): Promise<{
    time: string;
    date: string;
    dateTime: string;
  }> {
    try {
      // Get CalendarService using ModuleRef to avoid circular dependency
      const calendarService = this.moduleRef.get('CalendarService', { strict: false });
      if (!calendarService) {
        return { time: '', date: '', dateTime: '' };
      }
      
      // Get next upcoming scheduled event for this contact
      const now = new Date();
      const events = await calendarService.getEvents({
        tenantId,
        contactId,
        status: CalendarEventStatus.SCHEDULED,
        startDate: now,
      });

      if (!events || events.length === 0) {
        return { time: '', date: '', dateTime: '' };
      }

      // Get the earliest upcoming event
      const nextEvent = events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0];
      
      // Get contact to determine timezone
      const contact = await this.contactRepository.findOne({
        where: { id: contactId, tenantId },
      });

      // Use contact's timezone if available, otherwise use event timezone, otherwise default to UTC
      const timezone = contact?.attributes?.timezone || nextEvent.timezone || 'UTC';

      // Format in contact's timezone
      const time = formatInTimeZone(nextEvent.startTime, timezone, 'h:mm a');
      const date = formatInTimeZone(nextEvent.startTime, timezone, 'MMMM d, yyyy');
      const dateTime = formatInTimeZone(nextEvent.startTime, timezone, 'MMMM d, yyyy h:mm a');

      return { time, date, dateTime };
    } catch (error) {
      this.logger.warn(`Failed to get appointment info for contact ${contactId}: ${error.message}`);
      return { time: '', date: '', dateTime: '' };
    }
  }

  /**
   * Generate TTS audio for a journey execution (on-demand generation for preview)
   */
  async generateTtsAudioForExecution(
    tenantId: string,
    executionId: string,
  ): Promise<{ audioUrl: string; audioDataUrl?: string; duration?: number }> {
    // Find the journey execution
    const execution = await this.journeyNodeExecutionRepository.findOne({
      where: { id: executionId, journeyContact: { tenantId } },
      relations: ['node', 'journeyContact', 'journeyContact.contact'],
    });

    if (!execution) {
      throw new NotFoundException(`Journey execution not found: ${executionId}`);
    }

    const node = execution.node;
    const journeyContact = execution.journeyContact;
    const contact = journeyContact.contact;

    // Check if this is a MAKE_CALL node with a voice template
    if (node.type !== JourneyNodeType.MAKE_CALL) {
      throw new BadRequestException('TTS generation is only available for MAKE_CALL nodes');
    }

    const voiceTemplateId = node.config?.voiceTemplateId;
    if (!voiceTemplateId) {
      throw new BadRequestException('This execution does not use a voice template');
    }

    // Load voice template
    const voiceTemplate = await this.voiceTemplateRepository.findOne({
      where: { id: voiceTemplateId, tenantId, isActive: true },
    });

    if (!voiceTemplate) {
      throw new NotFoundException(`Voice template not found or inactive: ${voiceTemplateId}`);
    }

    // Get appointment info for contact (if template uses appointment variables)
    const hasAppointmentVariables =
      voiceTemplate.variables &&
      Array.isArray(voiceTemplate.variables) &&
      (voiceTemplate.variables.includes('appointmentTime') ||
        voiceTemplate.variables.includes('appointmentDate') ||
        voiceTemplate.variables.includes('appointmentDateTime'));

    const appointmentInfo = hasAppointmentVariables
      ? await this.getAppointmentInfo(tenantId, contact.id)
      : { time: '', date: '', dateTime: '' };

    // Build variable values from contact data
    const variableValues: Record<string, string> = {};
    if (voiceTemplate.variables && Array.isArray(voiceTemplate.variables)) {
      for (const varName of voiceTemplate.variables) {
        let value: string | null = null;

        // Check appointment variables first
        if (varName === 'appointmentTime' || varName === 'appointment_time') {
          value = appointmentInfo.time;
        } else if (varName === 'appointmentDate' || varName === 'appointment_date') {
          value = appointmentInfo.date;
        } else if (varName === 'appointmentDateTime' || varName === 'appointment_date_time') {
          value = appointmentInfo.dateTime;
        } else {
          // Standard contact fields and custom attributes
          value =
            contact.attributes?.[varName] ||
            (varName === 'firstName' || varName === 'first_name' ? contact.firstName : null) ||
            (varName === 'lastName' || varName === 'last_name' ? contact.lastName : null) ||
            (varName === 'phoneNumber' || varName === 'phone_number' || varName === 'phone'
              ? contact.phoneNumber
              : null) ||
            (varName === 'email' ? contact.email : null) ||
            '';
        }

        variableValues[varName] = value || '';
      }
    }

    // Substitute variables in template
    const substitutedText = this.substituteVariables(voiceTemplate.messageContent, variableValues);

    // Generate audio using Kokoro service
    const voiceId = voiceTemplate.kokoroVoiceId || voiceTemplate.elevenLabsVoiceId;
    if (!voiceId) {
      throw new BadRequestException('Voice template does not have a voice ID configured');
    }

    let { audioBuffer, duration } = await this.kokoroService.generateAudio({
      text: substitutedText,
      voiceId: voiceId,
      voiceConfig: voiceTemplate.voiceConfig,
      context: 'journey-execution-preview',
      requestId: `preview-${executionId}`,
    } as any);

    // Apply audio effects if configured
    if (voiceTemplate.audioEffects) {
      try {
        audioBuffer = await this.audioProcessingService.processAudio(
          audioBuffer,
          24000, // Kokoro sample rate
          voiceTemplate.audioEffects,
        );
      } catch (error) {
        this.logger.warn(`Failed to apply audio effects: ${error.message}`);
      }
    }

    // Save audio file temporarily and get URL
    const filename = `${crypto.randomUUID()}.wav`;
    const tempAudioPath = await this.kokoroService.saveAudioFile(audioBuffer, filename);
    const audioUrl = `/api/uploads/audio/${filename}`;

    // Generate base64 data URL for immediate playback
    const base64Audio = audioBuffer.toString('base64');
    const audioDataUrl = `data:audio/wav;base64,${base64Audio}`;

    return {
      audioUrl,
      audioDataUrl,
      duration,
    };
  }

  /**
   * Get journey node with caching to reduce database queries
   * Nodes are cached for 5 minutes since they rarely change during execution
   */
  private async getCachedNode(journeyId: string, nodeId: string, tenantId: string): Promise<JourneyNode | null> {
    const cacheKey = `${journeyId}:${nodeId}`;
    const cached = this.nodeCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.NODE_CACHE_TTL) {
      return cached.node;
    }
    
    const node = await this.journeyNodeRepository.findOne({
      where: { id: nodeId, journeyId, tenantId },
      relations: ['journey'],
    });
    
    if (node) {
      this.nodeCache.set(cacheKey, { node, timestamp: Date.now() });
      // Clean up old cache entries periodically
      if (this.nodeCache.size > 1000) {
        const now = Date.now();
        for (const [key, value] of this.nodeCache.entries()) {
          if (now - value.timestamp > this.NODE_CACHE_TTL) {
            this.nodeCache.delete(key);
          }
        }
      }
    }
    
    return node;
  }

  /**
   * Clear node cache for a specific journey (useful when journey is updated)
   */
  clearNodeCache(journeyId: string): void {
    for (const [key] of this.nodeCache.entries()) {
      if (key.startsWith(`${journeyId}:`)) {
        this.nodeCache.delete(key);
      }
    }
  }

  /**
   * Check if contact should be removed from journey based on removal criteria
   */
  private async checkRemovalCriteria(
    tenantId: string,
    journeyId: string,
    contactId: string,
    context: {
      callStatus?: string;
      transferStatus?: string;
      callDuration?: number;
      callLog?: CallLog;
      webhookPayload?: Record<string, any>;
    },
  ): Promise<boolean> {
    try {
      const journey = await this.journeyRepository.findOne({
        where: { id: journeyId, tenantId },
      });

      if (!journey || !journey.removalCriteria?.enabled || !journey.removalCriteria?.conditions?.length) {
        return false;
      }

      const contact = await this.contactRepository.findOne({
        where: { id: contactId, tenantId },
      });

      if (!contact) {
        return false;
      }

      // Check each removal condition
      for (const condition of journey.removalCriteria.conditions) {
        let shouldRemove = false;

        switch (condition.type) {
          case 'call_transferred':
            // Remove if call was transferred
            if (context.transferStatus === 'completed' || context.transferStatus === 'transferred') {
              shouldRemove = true;
              this.logger.log(`[RemovalCriteria] Contact ${contactId} matches call_transferred condition`, {
                journeyId,
                contactId,
                transferStatus: context.transferStatus,
              });
            }
            break;

          case 'call_duration':
            // Remove if call duration exceeds threshold
            if (condition.config?.minDurationSeconds && context.callDuration) {
              if (context.callDuration >= condition.config.minDurationSeconds) {
                shouldRemove = true;
                this.logger.log(`[RemovalCriteria] Contact ${contactId} matches call_duration condition`, {
                  journeyId,
                  contactId,
                  callDuration: context.callDuration,
                  minDurationSeconds: condition.config.minDurationSeconds,
                });
              }
            }
            break;

          case 'call_status':
            // Remove if call status matches any of the configured statuses
            if (condition.config?.callStatuses && context.callStatus) {
              if (condition.config.callStatuses.includes(context.callStatus)) {
                shouldRemove = true;
                this.logger.log(`[RemovalCriteria] Contact ${contactId} matches call_status condition`, {
                  journeyId,
                  contactId,
                  callStatus: context.callStatus,
                  configuredStatuses: condition.config.callStatuses,
                });
              }
            }
            break;

          case 'webhook':
            // Remove if webhook payload contains contact's phone number
            if (context.webhookPayload && condition.config?.webhookPayloadField) {
              const payloadField = condition.config.webhookPayloadField;
              const payloadValue = context.webhookPayload[payloadField];
              
              if (payloadValue) {
                // Normalize phone numbers for comparison
                const normalizePhone = (phone: string) => {
                  try {
                    return PhoneFormatter.formatToE164(phone);
                  } catch {
                    return phone.replace(/[^0-9]/g, '');
                  }
                };

                const normalizedPayloadPhone = normalizePhone(String(payloadValue));
                const normalizedContactPhone = normalizePhone(contact.phoneNumber);

                if (normalizedPayloadPhone === normalizedContactPhone) {
                  shouldRemove = true;
                  this.logger.log(`[RemovalCriteria] Contact ${contactId} matches webhook condition`, {
                    journeyId,
                    contactId,
                    payloadField,
                    payloadValue,
                  });
                }
              }
            }
            break;

          case 'custom':
            // Custom condition evaluation (can be extended)
            if (condition.config?.customCondition) {
              // Implement custom logic here if needed
              this.logger.debug(`[RemovalCriteria] Custom condition not yet implemented`, {
                journeyId,
                contactId,
                customCondition: condition.config.customCondition,
              });
            }
            break;
        }

        // If any condition matches, remove the contact
        if (shouldRemove) {
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.error(`[RemovalCriteria] Error checking removal criteria: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Handle call completion callback from AMI Event Listener
   * Updates journey execution with final call status and routes to next node
   */
  async handleCallCompletion(
    callUniqueId: string,
    callStatus: CallStatus,
    callDisposition: CallDisposition | null,
    phoneNumber?: string,
  ): Promise<void> {
    try {
      // #region agent log
      this.writeDebugLog('journeys.service.ts:handleCallCompletion', 'Call completion callback received', { callUniqueId, callStatus, callDisposition, phoneNumber }, 'F');
      // #endregion

      // Find call log to get transfer status (with caching and fallback by phone number)
      let callLog: CallLog | null = null;
      
      // Check cache first
      const cacheKey = `callLog:${callUniqueId}`;
      const cached = this.callLogCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CALL_LOG_CACHE_TTL) {
        callLog = cached.callLog;
      } else {
        // Fetch from DB
        callLog = await this.callLogRepository.findOne({
          where: { uniqueId: callUniqueId },
        });

        // Fallback: find by phone number if uniqueId doesn't match
        // Normalize phone number to E164 for consistent lookup
        if (!callLog && phoneNumber) {
          const normalizedPhone = PhoneFormatter.formatToE164(phoneNumber);
          // Try exact match first
          callLog = await this.callLogRepository.findOne({
            where: {
              to: normalizedPhone,
              createdAt: MoreThanOrEqual(new Date(Date.now() - 300000)), // Last 5 minutes
            },
            order: { createdAt: 'DESC' },
          });
          
          // If still not found, try with different formats (fallback normalization)
          if (!callLog) {
            const normalizePhone = (phone: string) => phone?.replace(/[^0-9]/g, '');
            const normalizedDigits = normalizePhone(phoneNumber);
            // Query all recent call logs and match by normalized digits
            const recentCallLogs = await this.callLogRepository.find({
              where: {
                createdAt: MoreThanOrEqual(new Date(Date.now() - 300000)),
              },
              order: { createdAt: 'DESC' },
              take: 50, // Limit to recent 50 calls
            });
            callLog = recentCallLogs.find(cl => normalizePhone(cl.to) === normalizedDigits) || null;
          }
        }

        // Cache the result
        if (callLog) {
          this.callLogCache.set(cacheKey, { callLog, timestamp: Date.now() });
          
          // Clean up old cache entries if cache is too large
          if (this.callLogCache.size > this.MAX_CALL_LOG_CACHE_SIZE) {
            const now = Date.now();
            for (const [key, value] of this.callLogCache.entries()) {
              if (now - value.timestamp > this.CALL_LOG_CACHE_TTL) {
                this.callLogCache.delete(key);
              }
            }
            // If still too large, remove oldest entries
            if (this.callLogCache.size > this.MAX_CALL_LOG_CACHE_SIZE) {
              const entries = Array.from(this.callLogCache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
              const toRemove = entries.slice(0, entries.length - this.MAX_CALL_LOG_CACHE_SIZE);
              for (const [key] of toRemove) {
                this.callLogCache.delete(key);
              }
            }
          }
        }
      }

      // Find journey execution waiting for this call
      // Use query builder to properly query JSONB field
      const waitingExecutions = await this.journeyNodeExecutionRepository
        .createQueryBuilder('execution')
        .leftJoinAndSelect('execution.node', 'node')
        .leftJoinAndSelect('execution.journeyContact', 'journeyContact')
        .leftJoinAndSelect('journeyContact.contact', 'contact')
        .where('execution.status = :status', { status: ExecutionStatus.EXECUTING })
        .andWhere("execution.result->>'waitingForCallCompletion' = 'true'")
        .andWhere('node.type::text = :nodeType', { nodeType: JourneyNodeType.MAKE_CALL })
        .getMany();

      // #region agent log
      this.writeDebugLog('journeys.service.ts:3402', 'Searching for waiting executions', { callUniqueId, phoneNumber, waitingExecutionsCount: waitingExecutions.length, waitingExecutionIds: waitingExecutions.map(e => ({ id: e.id, callUniqueId: e.result?.callUniqueId, asteriskUniqueId: e.result?.asteriskUniqueId, to: e.result?.to })) }, 'F');
      // #endregion

      // Find execution that matches this call
      // Try multiple ID fields since callUniqueId might be customCallId initially, then updated to Asterisk uniqueId
      let execution = waitingExecutions.find(
        e => e.node?.type === JourneyNodeType.MAKE_CALL &&
        e.result?.waitingForCallCompletion &&
        (
          e.result?.callUniqueId === callUniqueId ||
          e.result?.asteriskUniqueId === callUniqueId ||
          e.result?.callUniqueId === callLog?.metadata?.customCallId ||
          (callLog?.metadata?.customCallId && e.result?.callUniqueId === callLog.metadata.customCallId) ||
          // Also check if asteriskUniqueId matches the callUniqueId (in case it was updated)
          (callLog?.uniqueId && (e.result?.callUniqueId === callLog.uniqueId || e.result?.asteriskUniqueId === callLog.uniqueId))
        )
      );

      // Fallback: find by phone number if callUniqueId doesn't match
      // Normalize phone numbers to E164 format for consistent comparison
      const normalizePhoneForComparison = (phone: string) => {
        if (!phone) return null;
        try {
          return PhoneFormatter.formatToE164(phone);
        } catch {
          // Fallback to digit-only normalization if E164 formatting fails
          return phone.replace(/[^0-9]/g, '');
        }
      };
      
      if (!execution && phoneNumber) {
        const normalizedPhone = normalizePhoneForComparison(phoneNumber);
        if (normalizedPhone) {
          execution = waitingExecutions.find(
            e => e.node?.type === JourneyNodeType.MAKE_CALL &&
            e.result?.waitingForCallCompletion &&
            normalizePhoneForComparison(e.result?.to) === normalizedPhone &&
            e.executedAt && (Date.now() - e.executedAt.getTime()) < 300000 // Within last 5 minutes
          );
        }
      }

      // Additional fallback: if we have callLog, try to match by phone number and recent execution time
      if (!execution && callLog) {
        const normalizedCallLogTo = normalizePhoneForComparison(callLog.to);
        if (normalizedCallLogTo) {
          execution = waitingExecutions.find(
            e => e.node?.type === JourneyNodeType.MAKE_CALL &&
            e.result?.waitingForCallCompletion &&
            normalizePhoneForComparison(e.result?.to) === normalizedCallLogTo &&
            e.executedAt && callLog.createdAt &&
            Math.abs(e.executedAt.getTime() - callLog.createdAt.getTime()) < 60000 // Within 1 minute of call log creation
          );
        }
      }

      // Final fallback: match by customCallId from call log metadata
      if (!execution && callLog?.metadata?.customCallId) {
        execution = waitingExecutions.find(
          e => e.node?.type === JourneyNodeType.MAKE_CALL &&
          e.result?.waitingForCallCompletion &&
          (e.result?.callUniqueId === callLog.metadata.customCallId || e.result?.asteriskUniqueId === callLog.metadata.customCallId)
        );
      }

      // #region agent log
      this.writeDebugLog('journeys.service.ts:3426', 'Execution lookup result', { executionFound: !!execution, executionId: execution?.id, nodeId: execution?.node?.id, callUniqueId, phoneNumber }, 'F');
      // #endregion

      if (!execution || !execution.node) {
        this.logger.warn(`[JourneyExecution] No waiting execution found for call ${callUniqueId}`, {
          callUniqueId,
          phoneNumber,
          callLogUniqueId: callLog?.uniqueId,
          callLogCustomCallId: callLog?.metadata?.customCallId,
          callLogTo: callLog?.to,
          waitingExecutionsCount: waitingExecutions.length,
          searchedCallUniqueIds: waitingExecutions.map(e => e.result?.callUniqueId),
          searchedAsteriskUniqueIds: waitingExecutions.map(e => e.result?.asteriskUniqueId),
          searchedToNumbers: waitingExecutions.map(e => e.result?.to),
          executionDetails: waitingExecutions.map(e => ({
            id: e.id,
            callUniqueId: e.result?.callUniqueId,
            asteriskUniqueId: e.result?.asteriskUniqueId,
            to: e.result?.to,
            executedAt: e.executedAt,
            waitingForCallCompletion: e.result?.waitingForCallCompletion,
          })),
        });
        return;
      }

      const node = execution.node;
      const journeyContact = execution.journeyContact;

      if (!journeyContact) {
        this.logger.error(`[JourneyExecution] Journey contact not found for execution ${execution.id}`);
        return;
      }

      // Refresh call log to ensure we have the latest transfer status
      // Transfer events may arrive after call completion, so we need to check again
      if (callLog) {
        const refreshedCallLog = await this.callLogRepository.findOne({
          where: { id: callLog.id },
        });
        if (refreshedCallLog) {
          callLog = refreshedCallLog;
          this.logger.log(`[JourneyExecution] Refreshed call log for transfer status check`, {
            callLogId: callLog.id,
            originalTransferStatus: callLog?.metadata?.transferStatus,
            refreshedTransferStatus: refreshedCallLog.metadata?.transferStatus,
          });
        }
      }

      // Check transfer status from call log metadata
      const transferStatus = callLog?.metadata?.transferStatus;
      
      // Also check callFlowEvents for transfer status (in case metadata wasn't updated)
      if (!transferStatus && callLog?.callFlowEvents) {
        const transferEvent = callLog.callFlowEvents.find(
          (e: any) => e.type === 'TransferConnected' || 
                      (e.type === 'TransferResult' && (e.data?.status === 'ANSWER' || e.data?.Status === 'ANSWER'))
        );
        if (transferEvent) {
          this.logger.log(`[JourneyExecution] Found transfer status in callFlowEvents`, {
            callLogId: callLog.id,
            transferEventType: transferEvent.type,
          });
        }
      }

      // #region agent log
      this.writeDebugLog('journeys.service.ts:3478', 'Determining call outcome', { 
        callUniqueId, 
        callStatus, 
        callDisposition, 
        transferStatus, 
        callLogId: callLog?.id,
        callLogMetadata: callLog?.metadata,
      }, 'F');
      // #endregion

      // Map CallStatus/CallDisposition to journey outcome
      let outcome: string;
      let callStatusString: string;

      if (callDisposition === CallDisposition.BUSY) {
        outcome = 'busy';
        callStatusString = 'busy';
      } else if (callDisposition === CallDisposition.NO_ANSWER) {
        outcome = 'no_answer';
        callStatusString = 'no_answer';
      } else if (callDisposition === CallDisposition.ANSWERED || callStatus === CallStatus.ANSWERED || callStatus === CallStatus.COMPLETED) {
        // Check if call was transferred - also check callFlowEvents as fallback
        let isTransferred = transferStatus === 'completed' || transferStatus === 'transferred';
        
        // Fallback: check callFlowEvents if metadata doesn't have transfer status
        if (!isTransferred && callLog?.callFlowEvents) {
          const transferEvent = callLog.callFlowEvents.find(
            (e: any) => e.type === 'TransferConnected' || 
                        (e.type === 'TransferResult' && (e.data?.status === 'ANSWER' || e.data?.Status === 'ANSWER'))
          );
          if (transferEvent) {
            isTransferred = true;
            this.logger.log(`[JourneyExecution] Detected transfer from callFlowEvents`, {
              executionId: execution.id,
              callLogId: callLog.id,
              transferEventType: transferEvent.type,
            });
          }
        }
        
        if (isTransferred) {
          outcome = 'transferred';
          callStatusString = 'transferred';
          this.logger.log(`[JourneyExecution] Call marked as transferred`, {
            executionId: execution.id,
            callLogId: callLog?.id,
            transferStatus,
          });
        } else {
          outcome = 'answered';
          callStatusString = 'answered';
          this.logger.log(`[JourneyExecution] Call marked as answered (not transferred)`, {
            executionId: execution.id,
            callLogId: callLog?.id,
            transferStatus,
          });
        }
      } else {
        outcome = 'failed';
        callStatusString = 'failed';
      }

      // #region agent log
      this.writeDebugLog('journeys.service.ts:3505', 'Call outcome determined', { outcome, callStatusString }, 'F');
      // #endregion

      // Update execution result with final call status
      // Update message to reflect actual call completion status
      let completionMessage = `Call ${callStatusString}`;
      if (callDisposition) {
        completionMessage += `: ${callDisposition}`;
      }
      if (transferStatus === 'completed' || transferStatus === 'transferred') {
        completionMessage += ' (transferred)';
      }
      
      const updatedResult = {
        ...execution.result,
        callStatus: callStatusString,
        transferStatus: transferStatus || null,
        waitingForCallCompletion: false,
        outcome,
        message: completionMessage, // Update message to reflect completion status
        outcomeDetails: `Call ${callStatusString}: ${callDisposition || callStatus}${transferStatus === 'completed' ? ' (transferred)' : ''}`,
      };

      execution.result = updatedResult;
      execution.status = ExecutionStatus.COMPLETED;
      execution.completedAt = new Date();
      await this.journeyNodeExecutionRepository.save(execution);

      this.logger.log(`[JourneyExecution] Call completed for execution ${execution.id}: ${callStatusString}`, {
        executionId: execution.id,
        nodeId: node.id,
        callUniqueId,
        callStatus: callStatusString,
        outcome,
      });

      // #region agent log
      this.writeDebugLog('journeys.service.ts:3560', 'Routing after call completion', { 
        executionId: execution.id, 
        outcome, 
        nodeId: node.id,
        nodeOutputs: node.connections?.outputs,
        availableOutputs: Object.keys(node.connections?.outputs || {}),
      }, 'F');
      // #endregion

      // Check removal criteria before routing
      const shouldRemove = await this.checkRemovalCriteria(
        execution.tenantId,
        execution.journeyId,
        journeyContact.contactId,
        {
          callStatus: callStatusString,
          transferStatus,
          callDuration: callLog?.duration || 0,
          callLog,
        },
      );

      if (shouldRemove) {
        this.logger.log(`[JourneyExecution] Removing contact from journey due to removal criteria`, {
          journeyId: execution.journeyId,
          contactId: journeyContact.contactId,
          callStatus: callStatusString,
          transferStatus,
        });
        await this.removeContact(execution.tenantId, execution.journeyId, journeyContact.contactId, false);
        return;
      }

      // Now route to next node based on actual call status
      await this.routeAfterCallCompletion(
        execution.tenantId,
        execution.journeyId,
        node.id,
        execution.journeyContactId,
        outcome,
        node,
        journeyContact,
      );
    } catch (error) {
      this.logger.error(`[JourneyExecution] Failed to handle call completion: ${error.message}`, error.stack);
    }
  }

  /**
   * Route to next node after call completion
   */
  private async routeAfterCallCompletion(
    tenantId: string,
    journeyId: string,
    nodeId: string,
    journeyContactId: string,
    outcome: string,
    node: JourneyNode,
    journeyContact: JourneyContact,
  ): Promise<void> {
    let targetNodeId: string | undefined;

    // #region agent log
    this.writeDebugLog('journeys.service.ts:routeAfterCallCompletion', 'Routing after call completion', { nodeId, outcome, hasOutputs: !!node.connections?.outputs, outputsKeys: node.connections?.outputs ? Object.keys(node.connections.outputs) : [] }, 'F');
    // #endregion

    // #region agent log
    this.writeDebugLog('journeys.service.ts:3617', 'Checking routing options', { 
      outcome, 
      hasOutputs: !!node.connections?.outputs, 
      outputsKeys: node.connections?.outputs ? Object.keys(node.connections.outputs) : [],
      outputs: node.connections?.outputs,
      hasNextNodeId: !!node.connections?.nextNodeId,
      nextNodeId: node.connections?.nextNodeId,
    }, 'F');
    // #endregion

    // SIMPLIFIED: All nodes use simple nextNodeId connection
    if (node.connections?.nextNodeId) {
      targetNodeId = node.connections.nextNodeId;
      this.logger.log(`[JourneyExecution] Found next node from connections.nextNodeId (outcome: ${outcome}): ${targetNodeId}`, {
        nodeId: node.id,
        nodeType: node.type,
        outcome,
      });
      
      // #region agent log
      this.writeDebugLog('journeys.service.ts:3629', 'Found target node from nextNodeId', { outcome, targetNodeId }, 'F');
      // #endregion
    } else {
      // #region agent log
      this.writeDebugLog('journeys.service.ts:3643', 'No routing target found', { outcome, hasNextNodeId: !!node.connections?.nextNodeId }, 'F');
      // #endregion
    }

    if (targetNodeId) {
      // Validate UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(targetNodeId)) {
        this.logger.error(`[JourneyExecution] Invalid node ID format: ${targetNodeId}`);
        return;
      }

      // Verify target node exists
      const targetNode = await this.journeyNodeRepository.findOne({
        where: { id: targetNodeId, tenantId },
      });

      if (!targetNode) {
        this.logger.error(`[JourneyExecution] Target node not found: ${targetNodeId}`);
        return;
      }

      // Update journey contact current node
      journeyContact.currentNodeId = targetNodeId;
      await this.journeyContactRepository.save(journeyContact);

      // Get contact timezone for scheduling
      let contactTimezone: string | undefined;
      try {
        const updatedJourneyContact = await this.journeyContactRepository.findOne({
          where: { id: journeyContactId, tenantId },
          relations: ['contact'],
        });
        if (updatedJourneyContact?.contact?.timezone) {
          contactTimezone = updatedJourneyContact.contact.timezone;
        } else {
          const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
          contactTimezone = tenant?.timezone;
        }
      } catch (error) {
        this.logger.warn(`Failed to get timezone for journey contact ${journeyContactId}`);
      }

      // Schedule the next node
      try {
        await this.scheduleNodeExecution(tenantId, journeyId, targetNodeId, journeyContactId, contactTimezone);
        this.logger.log(`[JourneyExecution] Routed to next node after call completion: ${targetNodeId}`, {
          currentNodeId: node.id,
          outcome,
          targetNodeId,
        });
      } catch (error) {
        this.logger.error(`[JourneyExecution] Failed to schedule next node after call completion`, {
          currentNodeId: node.id,
          targetNodeId,
          error: error.message,
        });
      }
    } else {
      // No next node - journey completes
      this.logger.warn(`[JourneyExecution] No next node found for outcome ${outcome}`, {
        currentNodeId: node.id,
        outcome,
        connections: node.connections,
      });
      journeyContact.status = JourneyContactStatus.COMPLETED;
      journeyContact.completedAt = new Date();
      await this.journeyContactRepository.save(journeyContact);
    }
  }
}

