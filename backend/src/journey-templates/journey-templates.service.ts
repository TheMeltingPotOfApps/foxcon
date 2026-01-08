import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JourneyTemplate, TemplateCategory } from '../entities/journey-template.entity';
import { JourneyTemplateGenerationJob, GenerationJobStatus } from '../entities/journey-template-generation-job.entity';
import { Journey, JourneyStatus } from '../entities/journey.entity';
import { JourneyNode, JourneyNodeType } from '../entities/journey-node.entity';
import { JourneysService } from '../journeys/journeys.service';
import { AiGenerationService } from '../ai/ai-generation.service';
import { VoiceTemplate } from '../entities/voice-template.entity';
import Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from '../config/config.service';
import { VoicePresetsService } from '../voice-presets/voice-presets.service';
import { ANTHROPIC_API_KEY } from '../config/anthropic-api-key.constants';

@Injectable()
export class JourneyTemplatesService {
  private readonly logger = new Logger(JourneyTemplatesService.name);

  private claudeClient: Anthropic | null = null;
  
  // Threshold for determining if a template is "long" and should use background generation
  private readonly LONG_TEMPLATE_THRESHOLD = 5; // days * callsPerDay

  constructor(
    @InjectRepository(JourneyTemplate)
    private templateRepository: Repository<JourneyTemplate>,
    @InjectRepository(JourneyTemplateGenerationJob)
    private generationJobRepository: Repository<JourneyTemplateGenerationJob>,
    @InjectRepository(VoiceTemplate)
    private voiceTemplateRepository: Repository<VoiceTemplate>,
    private journeysService: JourneysService,
    private aiGenerationService: AiGenerationService,
    private configService: ConfigService,
    private voicePresetsService: VoicePresetsService,
  ) {
    this.initializeClaudeClient();
  }

  private initializeClaudeClient() {
    // Use hard-coded API key - non-configurable for all tenants
    this.claudeClient = new Anthropic({ 
      apiKey: ANTHROPIC_API_KEY,
      timeout: 60000, // 60 second timeout for API calls
    });
    this.logger.log('Anthropic Claude client initialized with hard-coded API key');
  }

  async createTemplate(data: {
    name: string;
    description?: string;
    category: TemplateCategory;
    isPublic?: boolean;
    createdByUserId?: string;
    journeyData: any;
    metadata?: any;
    tenantId: string;
  }): Promise<JourneyTemplate> {
    const template = this.templateRepository.create({
      ...data,
      isPublic: data.isPublic || false,
    });

    return this.templateRepository.save(template);
  }

  async getTemplates(filters: {
    tenantId?: string;
    category?: TemplateCategory;
    isPublic?: boolean;
    search?: string;
  }): Promise<JourneyTemplate[]> {
    const query = this.templateRepository.createQueryBuilder('template');

    if (filters.tenantId) {
      query.andWhere('template.tenantId = :tenantId', { tenantId: filters.tenantId });
    }

    if (filters.isPublic !== undefined) {
      query.andWhere('template.isPublic = :isPublic', { isPublic: filters.isPublic });
    }

    if (filters.category) {
      query.andWhere('template.category = :category', { category: filters.category });
    }

    if (filters.search) {
      query.andWhere(
        '(template.name ILIKE :search OR template.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    query.orderBy('template.usageCount', 'DESC');
    query.addOrderBy('template.createdAt', 'DESC');

    return query.getMany();
  }

  async getTemplateById(id: string, tenantId?: string): Promise<JourneyTemplate> {
    const where: any = { id };
    if (tenantId) {
      where.tenantId = tenantId;
    } else {
      // If no tenantId, only return public templates
      where.isPublic = true;
    }

    const template = await this.templateRepository.findOne({ where });

    if (!template) {
      throw new NotFoundException('Journey template not found');
    }

    return template;
  }

  async createJourneyFromTemplate(
    templateId: string,
    tenantId: string,
    overrides?: {
      name?: string;
      description?: string;
    },
  ): Promise<Journey> {
    const template = await this.getTemplateById(templateId, tenantId);

    // Increment usage count
    template.usageCount += 1;
    await this.templateRepository.save(template);

    const journeyData = template.journeyData;

    // Create the journey
    const journey = await this.journeysService.create(tenantId, {
      name: overrides?.name || journeyData.name,
      description: overrides?.description || journeyData.description,
      entryCriteria: journeyData.entryCriteria,
      autoEnrollEnabled: journeyData.autoEnrollEnabled || false,
      scheduleConfig: journeyData.scheduleConfig,
    });

    // Create nodes with proper spacing
    const nodeMap = new Map<string, string>(); // Map template node IDs to new node IDs
    
    // Calculate proper layout: vertical spacing of 200px, horizontal spacing of 300px
    // Extra spacing between days: 400px
    const VERTICAL_SPACING = 200;
    const DAY_SPACING = 400; // Extra space between days
    const HORIZONTAL_SPACING = 300;
    const START_X = 400;
    const START_Y = 100;
    
    // Group nodes by day if day metadata exists in config
    const nodesByDay = new Map<number, string[]>();
    const nodeDayMap = new Map<string, number>();
    
    for (const templateNode of journeyData.nodes) {
      const day = templateNode.config?.day;
      if (day !== undefined && typeof day === 'number') {
        if (!nodesByDay.has(day)) {
          nodesByDay.set(day, []);
        }
        nodesByDay.get(day)!.push(templateNode.id);
        nodeDayMap.set(templateNode.id, day);
      }
    }
    
    // Build a graph to understand node relationships for better layout
    const nodeGraph = new Map<string, string[]>(); // nodeId -> [childNodeIds]
    const rootNodes: string[] = [];
    
    // Find root nodes (nodes with no incoming connections)
    for (const templateNode of journeyData.nodes) {
      const hasIncoming = journeyData.nodes.some(n => 
        n.connections?.nextNodeId === templateNode.id ||
        Object.values(n.connections?.outputs || {}).includes(templateNode.id) ||
        n.config?.branches?.some((b: any) => b.nextNodeId === templateNode.id) ||
        n.config?.paths?.some((p: any) => p.nextNodeId === templateNode.id)
      );
      
      if (!hasIncoming) {
        rootNodes.push(templateNode.id);
      }
    }
    
    // Build graph structure
    for (const templateNode of journeyData.nodes) {
      const children: string[] = [];
      
      if (templateNode.connections?.nextNodeId) {
        children.push(templateNode.connections.nextNodeId);
      }
      
      if (templateNode.connections?.outputs) {
        const outputValues = Object.values(templateNode.connections.outputs).filter(
          (val): val is string => typeof val === 'string'
        );
        children.push(...outputValues);
      }
      
      if (templateNode.config?.branches) {
        templateNode.config.branches.forEach((b: any) => {
          if (b.nextNodeId) children.push(b.nextNodeId);
        });
      }
      
      if (templateNode.config?.paths) {
        templateNode.config.paths.forEach((p: any) => {
          if (p.nextNodeId) children.push(p.nextNodeId);
        });
      }
      
      nodeGraph.set(templateNode.id, [...new Set(children)]);
    }
    
    // Calculate positions using BFS layout
    const positions = new Map<string, { x: number; y: number }>();
    const visited = new Set<string>();
    const queue: Array<{ id: string; x: number; y: number }> = [];
    
    // Start with root nodes
    rootNodes.forEach((rootId, index) => {
      queue.push({ id: rootId, x: START_X + index * HORIZONTAL_SPACING, y: START_Y });
    });
    
    // If no root nodes found, use first node
    if (rootNodes.length === 0 && journeyData.nodes.length > 0) {
      queue.push({ id: journeyData.nodes[0].id, x: START_X, y: START_Y });
    }
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id)) continue;
      
      visited.add(current.id);
      positions.set(current.id, { x: current.x, y: current.y });
      
      const children = nodeGraph.get(current.id) || [];
      const currentDay = nodeDayMap.get(current.id);
      
      children.forEach((childId, index) => {
        if (!visited.has(childId)) {
          const childDay = nodeDayMap.get(childId);
          
          // Calculate spacing: if moving to a new day, add extra spacing
          let spacing = VERTICAL_SPACING;
          if (currentDay !== undefined && childDay !== undefined && childDay > currentDay) {
            spacing = DAY_SPACING; // Extra spacing between days
          }
          
          // Position children below parent, with horizontal offset for multiple children
          const offsetX = children.length > 1 
            ? (index - (children.length - 1) / 2) * HORIZONTAL_SPACING * 0.6
            : 0;
          queue.push({
            id: childId,
            x: current.x + offsetX,
            y: current.y + spacing,
          });
        }
      });
    }
    
    // If nodes are grouped by day, ensure proper day spacing
    if (nodesByDay.size > 0) {
      const sortedDays = Array.from(nodesByDay.keys()).sort((a, b) => a - b);
      let currentY = START_Y;
      
      for (const day of sortedDays) {
        const dayNodes = nodesByDay.get(day)!;
        const dayNodePositions = dayNodes
          .map(id => ({ id, pos: positions.get(id) }))
          .filter(item => item.pos !== undefined) as Array<{ id: string; pos: { x: number; y: number } }>;
        
        if (dayNodePositions.length > 0) {
          // Find the minimum Y position for nodes in this day
          const minY = Math.min(...dayNodePositions.map(item => item.pos.y));
          
          // Adjust all nodes in this day to start at currentY
          const yOffset = currentY - minY;
          dayNodePositions.forEach(({ id, pos }) => {
            positions.set(id, { x: pos.x, y: pos.y + yOffset });
          });
          
          // Calculate next day's starting Y (max Y of current day + day spacing)
          const maxY = Math.max(...dayNodePositions.map(item => item.pos.y));
          currentY = maxY + DAY_SPACING;
        }
      }
    }
    
    // Create nodes with calculated positions
    for (const templateNode of journeyData.nodes) {
      const calculatedPos = positions.get(templateNode.id) || {
        x: templateNode.positionX || START_X,
        y: templateNode.positionY || START_Y,
      };
      
      // Ensure day data is preserved from template config
      const nodeConfig = {
        ...templateNode.config,
        // Preserve day if it exists in config or metadata
        day: templateNode.config?.day || (templateNode as any).metadata?.day,
      };
      
      const newNode = await this.journeysService.addNode(tenantId, journey.id, {
        type: templateNode.type as JourneyNodeType,
        positionX: calculatedPos.x,
        positionY: calculatedPos.y,
        config: nodeConfig,
        connections: templateNode.connections,
      });

      nodeMap.set(templateNode.id, newNode.id);
    }

    // Update connections to use new node IDs
    for (const templateNode of journeyData.nodes) {
      const newNodeId = nodeMap.get(templateNode.id);
      if (!newNodeId) continue;

      const updatedConnections: any = { ...templateNode.connections };

      // Update nextNodeId if it exists
      if (updatedConnections?.nextNodeId) {
        const oldNextNodeId = updatedConnections.nextNodeId;
        if (nodeMap.has(oldNextNodeId)) {
          updatedConnections.nextNodeId = nodeMap.get(oldNextNodeId)!;
        } else {
          delete updatedConnections.nextNodeId;
        }
      }

      // SIMPLIFIED: Remove outputs handling - all nodes use nextNodeId only
      // If outputs exist, convert first output to nextNodeId for backward compatibility
      if (updatedConnections?.outputs && Object.keys(updatedConnections.outputs).length > 0) {
        const firstOutputNodeId = Object.values(updatedConnections.outputs)[0] as string;
        if (typeof firstOutputNodeId === 'string' && nodeMap.has(firstOutputNodeId)) {
          updatedConnections.nextNodeId = nodeMap.get(firstOutputNodeId)!;
        }
        // Remove outputs object
        delete updatedConnections.outputs;
      }

      // Update the node with new connections
      await this.journeysService.updateNode(tenantId, journey.id, newNodeId, {
        connections: updatedConnections,
      });
    }

    return journey;
  }

  async updateTemplate(
    id: string,
    updates: Partial<JourneyTemplate>,
    tenantId?: string,
  ): Promise<JourneyTemplate> {
    const template = await this.getTemplateById(id, tenantId);
    Object.assign(template, updates);
    return this.templateRepository.save(template);
  }

  async deleteTemplate(id: string, tenantId?: string): Promise<void> {
    const template = await this.getTemplateById(id, tenantId);
    await this.templateRepository.remove(template);
  }

  /**
   * Generate a preview script for Day 1, Call 1
   * This allows the user to review and edit before generating all scripts
   */
  async generatePreviewScript(
    tenantId: string,
    data: {
      industry: string;
      brandName: string;
      marketingAngle: 'corporate' | 'personable' | 'psa' | 'storytelling';
      sentiment: 'kind' | 'caring' | 'concerned' | 'excited' | 'passionate' | 'enthusiastic';
      voiceTemplateId?: string; // Optional if voicePresetId is provided
      voicePresetId?: string; // Optional if voiceTemplateId is provided
      includeContactName: boolean;
    },
  ): Promise<{ script: string; agentName: string }> {
    // Validate that either voiceTemplateId or voicePresetId is provided
    if (!data.voiceTemplateId && !data.voicePresetId) {
      throw new BadRequestException('Either voiceTemplateId or voicePresetId must be provided');
    }

    // Get voice template or load from preset
    let voiceTemplate: VoiceTemplate | null = null;

    if (data.voiceTemplateId) {
      voiceTemplate = await this.voiceTemplateRepository.findOne({
        where: { id: data.voiceTemplateId, tenantId },
      });

      if (!voiceTemplate) {
        throw new BadRequestException('Voice template not found');
      }
    } else if (data.voicePresetId) {
      // Load voice preset
      try {
        const voicePreset = await this.voicePresetsService.findOne(tenantId, data.voicePresetId);
        // Create a temporary voice template object for compatibility
        // Use customVoiceName if available, otherwise use kokoroVoiceName
        const voiceNameToUse = voicePreset.customVoiceName || voicePreset.kokoroVoiceName;
        voiceTemplate = {
          id: '', // Temporary ID
          kokoroVoiceId: voicePreset.kokoroVoiceId,
          kokoroVoiceName: voiceNameToUse,
          elevenLabsVoiceId: voicePreset.kokoroVoiceId,
          elevenLabsVoiceName: voiceNameToUse,
          voiceConfig: voicePreset.voiceConfig,
          audioEffects: null,
          messageContent: '',
          variables: [],
          isActive: true,
          tenantId,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as VoiceTemplate;
      } catch (error) {
        throw new BadRequestException(`Voice preset not found: ${data.voicePresetId}`);
      }
    }

    // Use custom voice name if available, otherwise extract from voice name
    // If using a voice preset with customVoiceName, use it directly; otherwise extract from full name
    const fullVoiceName = voiceTemplate!.elevenLabsVoiceName || voiceTemplate!.kokoroVoiceName || 'Sarah';
    // If the voice name doesn't contain dashes, it's likely already a custom name - use it directly
    // Otherwise extract the first part before dashes
    const agentName = fullVoiceName.includes(' - ') || fullVoiceName.includes(' – ')
      ? fullVoiceName.split(' - ')[0].split(' – ')[0].trim()
      : fullVoiceName.trim();

    // Generate a simple journey description for preview
    const journeyDescription = `Create a journey for ${data.brandName} in the ${data.industry} industry. 
The journey should have a ${data.marketingAngle} marketing angle with a ${data.sentiment} sentiment.
${data.includeContactName ? 'Personalize messages by including the contact\'s name.' : 'Use generic messaging without names.'}`;

    // Generate preview script for Day 1, Call 1
    let script = await this.generatePress1AudioScript(
      data,
      1, // day
      1, // callNumber
      0, // voiceIndex
      journeyDescription,
      agentName,
      undefined, // No reference script for preview
      0.7, // Default temperature for preview
    );

    // Ensure script uses {firstName} format (SINGLE curly braces for IVR voice scripts)
    script = script.replace(/\[CONTACT_NAME\]/gi, '{firstName}');
    script = script.replace(/\[LAST_NAME\]/gi, '{lastName}');
    script = script.replace(/\[PHONE_NUMBER\]/gi, '{phoneNumber}');
    script = script.replace(/\[EMAIL\]/gi, '{email}');
    // Convert double curly braces to single curly braces for IVR (if AI generated double braces)
    script = script.replace(/\{\{(\w+)\}\}/g, '{$1}');

    return { script, agentName };
  }

  /**
   * Determine if a template should be generated in the background based on complexity
   */
  private shouldUseBackgroundGeneration(totalDays: number, callsPerDay: number): boolean {
    const complexity = totalDays * callsPerDay;
    return complexity > this.LONG_TEMPLATE_THRESHOLD;
  }

  /**
   * Start background generation of a journey template
   * Returns a job ID that can be used to check status
   */
  async startBackgroundGeneration(
    tenantId: string,
    data: {
      industry: string;
      brandName: string;
      totalDays: number;
      callsPerDay: number;
      restPeriodDays: number[];
      includeSms: boolean;
      marketingAngle: 'corporate' | 'personable' | 'psa' | 'storytelling';
      sentiment: 'kind' | 'caring' | 'concerned' | 'excited' | 'passionate' | 'enthusiastic';
      voiceTemplateId?: string;
      voicePresetId?: string;
      numberOfVoices: number;
      includeContactName: boolean;
      audioEffects?: any;
      referenceScript?: string;
      temperature?: number;
      journeyName?: string;
      smsCta?: any;
      delayConfig?: any;
    },
  ): Promise<{ jobId: string }> {
    // Create job record
    const job = this.generationJobRepository.create({
      tenantId,
      status: GenerationJobStatus.PENDING,
      generationParams: data,
      progress: {
        totalDays: data.totalDays,
        totalCalls: data.totalDays * data.callsPerDay,
        currentStep: 'Initializing',
        percentage: 0,
      },
    });

    const savedJob = await this.generationJobRepository.save(job);

    // Start background processing (don't await)
    this.processGenerationJob(savedJob.id).catch((error) => {
      this.logger.error(`Background generation job ${savedJob.id} failed: ${error.message}`, error.stack);
    });

    return { jobId: savedJob.id };
  }

  /**
   * Get the status of a generation job
   */
  async getGenerationJobStatus(jobId: string, tenantId: string): Promise<JourneyTemplateGenerationJob> {
    const job = await this.generationJobRepository.findOne({
      where: { id: jobId, tenantId },
      relations: ['template', 'journey'],
    });

    if (!job) {
      throw new NotFoundException('Generation job not found');
    }

    return job;
  }

  /**
   * Process a generation job in the background
   */
  private async processGenerationJob(jobId: string): Promise<void> {
    const job = await this.generationJobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      this.logger.error(`Job ${jobId} not found`);
      return;
    }

    try {
      // Update status to processing
      job.status = GenerationJobStatus.PROCESSING;
      job.startedAt = new Date();
      await this.generationJobRepository.save(job);

      // Call the actual generation method with progress tracking
      const result = await this.generateAiPoweredJourneyTemplateInternal(
        job.tenantId,
        job.generationParams,
        (progress) => {
          // Update progress in database
          this.generationJobRepository.update(jobId, { progress }).catch((err) => {
            this.logger.warn(`Failed to update progress for job ${jobId}: ${err.message}`);
          });
        },
      );

      // Update job with results
      job.status = GenerationJobStatus.COMPLETED;
      job.templateId = result.template.id;
      job.journeyId = result.journey.id;
      job.completedAt = new Date();
      job.progress = {
        ...job.progress,
        percentage: 100,
        currentStep: 'Completed',
      };
      await this.generationJobRepository.save(job);

      this.logger.log(`Background generation job ${jobId} completed successfully`);
    } catch (error: any) {
      this.logger.error(`Background generation job ${jobId} failed: ${error.message}`, error.stack);
      
      // Update job with error
      job.status = GenerationJobStatus.FAILED;
      job.errorMessage = error.message || 'Unknown error occurred';
      job.completedAt = new Date();
      await this.generationJobRepository.save(job);
    }
  }


  async generateAiPoweredJourneyTemplate(
    tenantId: string,
    data: {
      industry: string;
      brandName: string;
      totalDays: number;
      callsPerDay: number;
      restPeriodDays: number[];
      includeSms: boolean;
      marketingAngle: 'corporate' | 'personable' | 'psa' | 'storytelling';
      sentiment: 'kind' | 'caring' | 'concerned' | 'excited' | 'passionate' | 'enthusiastic';
      voiceTemplateId?: string; // Optional if voicePresetId is provided
      voicePresetId?: string; // Optional if voiceTemplateId is provided
      numberOfVoices: number;
      includeContactName: boolean;
      audioEffects?: {
        distance?: 'close' | 'medium' | 'far';
        backgroundNoise?: {
          enabled: boolean;
          volume?: number;
          file?: string;
        };
        volume?: number;
        coughEffects?: Array<{
          file: 'stifled-cough' | 'coughing-woman' | 'coughing-woman-2';
          timestamp: number;
          volume?: number;
        }>;
      };
      referenceScript?: string; // Optional: edited preview script to use as reference
      temperature?: number; // AI temperature (0-1), default 0.7
      journeyName?: string; // Journey name
      smsCta?: {
        type: 'none' | 'event' | 'phone' | 'ai';
        eventTypeId?: string;
        phoneNumber?: string;
        aiTemplateId?: string;
      };
      delayConfig?: {
        betweenCalls: Array<{ value: number; unit: 'MINUTES' | 'HOURS' }>;
        betweenCallAndSms: { value: number; unit: 'MINUTES' | 'HOURS' };
      };
      useBackgroundGeneration?: boolean; // Force background generation
    },
  ): Promise<{ template: JourneyTemplate; journey: Journey } | { jobId: string }> {
    // Check if we should use background generation
    const shouldUseBackground = data.useBackgroundGeneration !== undefined 
      ? data.useBackgroundGeneration 
      : this.shouldUseBackgroundGeneration(data.totalDays, data.callsPerDay);

    if (shouldUseBackground) {
      // Start background generation and return job ID
      return this.startBackgroundGeneration(tenantId, data);
    }

    // Otherwise, generate synchronously
    try {
      return await this.generateAiPoweredJourneyTemplateInternal(tenantId, data);
    } catch (error: any) {
      this.logger.error(`Failed to generate AI-powered journey template: ${error.message}`, error.stack);
      
      // If it's already a BadRequestException, re-throw it
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // Wrap other errors in BadRequestException with helpful message
      throw new BadRequestException(
        `Failed to generate journey template: ${error.message || 'Unknown error occurred. Please check your AI API configuration and try again.'}`
      );
    }
  }

  /**
   * Internal method that performs the actual generation
   */
  private async generateAiPoweredJourneyTemplateInternal(
    tenantId: string,
    data: any,
    onProgress?: (progress: any) => void,
  ): Promise<{ template: JourneyTemplate; journey: Journey }> {
    // Ensure Claude client is initialized before starting
    if (!this.claudeClient) {
      this.initializeClaudeClient();
    }

    // Validate that either voiceTemplateId or voicePresetId is provided
    if (!data.voiceTemplateId && !data.voicePresetId) {
      throw new BadRequestException('Either voiceTemplateId or voicePresetId must be provided');
    }

    // Get voice template or load from preset
    let voiceTemplate: VoiceTemplate | null = null;
    let voicePresetConfig: any = null;

    if (data.voiceTemplateId) {
      voiceTemplate = await this.voiceTemplateRepository.findOne({
        where: { id: data.voiceTemplateId, tenantId },
      });

      if (!voiceTemplate) {
        throw new BadRequestException('Voice template not found');
      }
    } else if (data.voicePresetId) {
      // Load voice preset
      try {
        const voicePreset = await this.voicePresetsService.findOne(tenantId, data.voicePresetId);
        voicePresetConfig = {
          kokoroVoiceId: voicePreset.kokoroVoiceId,
          kokoroVoiceName: voicePreset.kokoroVoiceName,
          voiceConfig: voicePreset.voiceConfig,
          audioEffects: data.audioEffects || null,
        };
        // Create a temporary voice template object for compatibility
        // Use customVoiceName if available, otherwise use kokoroVoiceName
        const voiceNameToUse = voicePreset.customVoiceName || voicePreset.kokoroVoiceName;
        voiceTemplate = {
          id: '', // Temporary ID
          kokoroVoiceId: voicePreset.kokoroVoiceId,
          kokoroVoiceName: voiceNameToUse,
          elevenLabsVoiceId: voicePreset.kokoroVoiceId,
          elevenLabsVoiceName: voiceNameToUse,
          voiceConfig: voicePreset.voiceConfig,
          audioEffects: data.audioEffects || null,
          messageContent: '', // Will be set per script
          variables: [],
          isActive: true,
          tenantId,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as VoiceTemplate;
      } catch (error) {
        throw new BadRequestException(`Voice preset not found: ${data.voicePresetId}`);
      }
    }

    // Generate journey description for AI
    const journeyDescription = this.buildJourneyDescription(data);

    // Use custom voice name if available, otherwise extract from voice name
    // If using a voice preset with customVoiceName, use it directly; otherwise extract from full name
    const fullVoiceName = voiceTemplate.elevenLabsVoiceName || voiceTemplate.kokoroVoiceName || 'Sarah';
    // If the voice name doesn't contain dashes, it's likely already a custom name - use it directly
    // Otherwise extract the first part before dashes
    const agentName = fullVoiceName.includes(' - ') || fullVoiceName.includes(' – ')
      ? fullVoiceName.split(' - ')[0].split(' – ')[0].trim()
      : fullVoiceName.trim();

    // Generate audio files and SMS content
    // Create voice templates for each script - these will be used by MAKE_CALL nodes
    const voiceTemplates: Array<{
      day: number;
      callNumber: number;
      voiceIndex: number;
      voiceTemplateId: string;
    }> = [];
    const smsMessages: Array<{
      day: number;
      message: string;
    }> = [];

    const totalDays = data.totalDays;
    const callsPerDay = data.callsPerDay;
    const totalCalls = totalDays * callsPerDay;
    let processedCalls = 0;

    // Generate content for each day - create voice templates for each script
    for (let day = 1; day <= totalDays; day++) {
      const isRestDay = data.restPeriodDays.includes(day);
      
      if (onProgress) {
        onProgress({
          currentDay: day,
          totalDays,
          currentStep: `Generating Day ${day} content`,
          percentage: Math.round((processedCalls / totalCalls) * 100),
        });
      }
      
      if (!isRestDay) {
        // Generate calls for this day
        for (let callNumber = 1; callNumber <= callsPerDay; callNumber++) {
          for (let voiceIndex = 0; voiceIndex < data.numberOfVoices; voiceIndex++) {
            processedCalls++;
            
            if (onProgress) {
              onProgress({
                currentDay: day,
                totalDays,
                currentCall: callNumber,
                totalCalls,
                currentStep: `Generating Day ${day}, Call ${callNumber}`,
                percentage: Math.round((processedCalls / totalCalls) * 100),
              });
            }

            // Generate press-1 audio script (with consistent agent name)
            // Use reference script if provided and this is Day 1, Call 1, Voice 0
            // Otherwise generate normally
            let script: string;
            if (data.referenceScript && day === 1 && callNumber === 1 && voiceIndex === 0) {
              // Use the edited reference script for the first call
              script = data.referenceScript;
            } else {
              // Generate script, using reference script as a style guide if available
              script = await this.generatePress1AudioScript(
                data,
                day,
                callNumber,
                voiceIndex,
                journeyDescription,
                agentName,
                data.referenceScript, // Pass reference script as style guide
                data.temperature, // Pass temperature
              );
            }

            // Create a voice template for this script
            // Extract variables from script (should already be in {variableName} format for IVR)
            // But handle legacy [CONTACT_NAME] format if present
            const variablePattern = /\{(\w+)\}/g; // Single curly braces for IVR
            const variables: string[] = [];
            let match;
            while ((match = variablePattern.exec(script)) !== null) {
              const varName = match[1];
              if (!variables.includes(varName)) {
                variables.push(varName);
              }
            }

            // Convert script to voice template format
            // Script should already be in {variableName} format for IVR (single braces)
            let messageContent = script;
            
            // Convert any legacy square bracket format to single curly braces for IVR
            messageContent = messageContent.replace(/\[CONTACT_NAME\]/gi, '{firstName}');
            messageContent = messageContent.replace(/\[LAST_NAME\]/gi, '{lastName}');
            messageContent = messageContent.replace(/\[PHONE_NUMBER\]/gi, '{phoneNumber}');
            messageContent = messageContent.replace(/\[EMAIL\]/gi, '{email}');
            
            // Handle any other unmapped square bracket variables
            messageContent = messageContent.replace(/\[(\w+)\]/g, (match, varName) => {
              return `{${varName.toLowerCase()}}`;
            });
            
            // Convert double curly braces to single curly braces for IVR (if AI generated double braces)
            messageContent = messageContent.replace(/\{\{(\w+)\}\}/g, '{$1}');

            // Determine which voice to use (if multiple voices, use different voice for voiceIndex > 0)
            let voiceId = voiceTemplate.elevenLabsVoiceId;
            let voiceName = voiceTemplate.elevenLabsVoiceName || 'Default Voice';
            if (data.numberOfVoices > 1 && voiceIndex > 0) {
              // For now, use the same voice (could be enhanced to use different voices)
              // You could fetch available voices and rotate them
            }

            // Create voice template
            const createdVoiceTemplate = this.voiceTemplateRepository.create({
              name: `${data.brandName} - Day ${day} Call ${callNumber}${data.numberOfVoices > 1 ? ` Voice ${voiceIndex + 1}` : ''}`,
              description: `AI-generated voice template for ${data.brandName} journey - Day ${day}, Call ${callNumber}`,
              messageContent,
              elevenLabsVoiceId: voiceId,
              elevenLabsVoiceName: voiceName,
              voiceConfig: voiceTemplate.voiceConfig,
              audioEffects: data.audioEffects || voiceTemplate.audioEffects, // Use provided audio effects or inherit from base template
              variables,
              isActive: true,
              tenantId,
            });

            const savedVoiceTemplate = await this.voiceTemplateRepository.save(createdVoiceTemplate);

            voiceTemplates.push({
              day,
              callNumber,
              voiceIndex,
              voiceTemplateId: savedVoiceTemplate.id,
            });
          }
        }

        // Generate SMS if enabled
        if (data.includeSms) {
          const smsMessage = await this.generateSmsContent(
            data,
            day,
            journeyDescription,
            data.temperature, // Pass temperature
          );
          smsMessages.push({ day, message: smsMessage });
        }
      }
    }

    // Build journey template structure (with voice templates)
    const journeyData = this.buildJourneyTemplateStructure(
      data,
      voiceTemplates,
      smsMessages,
      data.delayConfig, // Pass delay config
    );

    // Create template
    const template = this.templateRepository.create({
      name: `${data.brandName} - ${data.totalDays} Day Journey`,
      description: `AI-generated journey for ${data.industry} industry`,
      category: TemplateCategory.CUSTOM,
      isPublic: false,
      tenantId,
      journeyData,
      metadata: {
        estimatedDuration: `${data.totalDays} days`,
        useCase: `${data.industry} - ${data.marketingAngle} - ${data.sentiment}`,
        tags: [data.industry, data.marketingAngle, data.sentiment],
        // Store generation parameters for reusing templates
        generationParams: {
          industry: data.industry,
          brandName: data.brandName,
          totalDays: data.totalDays,
          callsPerDay: data.callsPerDay,
          restPeriodDays: data.restPeriodDays,
          includeSms: data.includeSms,
          marketingAngle: data.marketingAngle,
          sentiment: data.sentiment,
          voiceTemplateId: data.voiceTemplateId,
          voicePresetId: data.voicePresetId,
          numberOfVoices: data.numberOfVoices,
          includeContactName: data.includeContactName,
          audioEffects: data.audioEffects,
          temperature: data.temperature,
          smsCta: data.smsCta,
          delayConfig: data.delayConfig,
        },
        // Note: agentName is used during generation but not stored in metadata
      } as any, // Type assertion needed since metadata is JSONB and flexible
    });

    const savedTemplate = await this.templateRepository.save(template);
    
    // Ensure we have a single template, not an array
    const templateEntity = Array.isArray(savedTemplate) ? savedTemplate[0] : savedTemplate;

    // Automatically create the journey from the template
    const journey = await this.createJourneyFromTemplate(
      templateEntity.id,
      tenantId,
      {
        name: data.journeyName || `${data.brandName} Journey`,
        description: `AI-generated ${data.totalDays}-day journey for ${data.industry}`,
      },
    );

    // Return both template and journey
    return {
      template: templateEntity,
      journey,
    };
  }

  private buildJourneyDescription(data: any): string {
    return `Create a ${data.totalDays}-day journey for ${data.brandName} in the ${data.industry} industry. 
The journey should have a ${data.marketingAngle} marketing angle with a ${data.sentiment} sentiment.
${data.numberOfVoices > 1 ? `Use ${data.numberOfVoices} distinct voices/characters.` : 'Use a single consistent voice.'}
${data.includeContactName ? 'Personalize messages by including the contact\'s name.' : 'Use generic messaging without names.'}
Make ${data.callsPerDay} calls per day${data.restPeriodDays.length > 0 ? `, with rest periods on days: ${data.restPeriodDays.join(', ')}` : ''}.
${data.includeSms ? 'Include SMS messages as well.' : 'Focus only on voice calls.'}`;
  }

  private async generatePress1AudioScript(
    data: any,
    day: number,
    callNumber: number,
    voiceIndex: number,
    journeyDescription: string,
    agentName: string,
    referenceScript?: string, // Optional reference script to use as style guide
    temperature?: number, // Optional temperature (0-1), default 0.7
  ): Promise<string> {
    const referenceGuidance = referenceScript
      ? `\n\nREFERENCE SCRIPT (use this as a style guide - match the tone, structure, and approach):
"${referenceScript}"

IMPORTANT: Use the reference script above as a guide for:
- Tone and style
- How ${agentName} introduces themselves
- The structure and flow
- How the message is delivered
- But adapt the content for Day ${day}, Call ${callNumber} (escalate appropriately based on day number)`

      : '';

    const prompt = `You are writing a press-1 style IVR script for a phone call.

Journey Context: ${journeyDescription}

Generate a script for:
- Day ${day} of the journey
- Call number ${callNumber} on this day${referenceGuidance}

CRITICAL REQUIREMENTS:
1. The script MUST be MAXIMUM 30 seconds when spoken (approximately 75-90 words)
2. The script MUST ALWAYS end with "Press 1 to speak with a representative" or "Press 1 to get connected"
3. You are ${agentName} from ${data.brandName} - ALWAYS introduce yourself as ONLY "${agentName}" (just the name, nothing else) and say you are calling from ${data.brandName}
4. You are the SAME person (${agentName}) with the SAME voice in ALL calls - maintain consistency
5. NEVER include any additional text after the name like "- Realistic Conversations" or any other descriptors - just say "${agentName}"
6. ${data.includeContactName ? 'Use "Hello {firstName}" at the beginning (use single curly braces {firstName} for IVR, NOT double braces or square brackets)' : 'Use a friendly greeting'}
7. Match the ${data.marketingAngle} marketing angle
8. Use a ${data.sentiment} tone
9. The content should escalate appropriately based on the day number
10. Make it relevant to ${data.industry} industry
11. Keep it concise and focused - every word counts to stay under 30 seconds
12. CRITICAL: Use variable format {firstName} with SINGLE curly braces for IVR voice scripts, NOT {{firstName}} (double braces) or [CONTACT_NAME] (square brackets)
${referenceScript ? '13. Match the style and approach of the reference script provided above' : ''}

Example structure:
"Hello {firstName}, this is ${agentName} calling from ${data.brandName}. [Brief message - 2-3 sentences]. Press 1 to speak with a representative."

IMPORTANT: Always use {firstName} format for IVR voice scripts (SINGLE curly braces), never use {{firstName}} (double braces) or [CONTACT_NAME] (square brackets).

Return ONLY the script text, no stage directions, no notes, just the natural spoken words ending with a press-1 prompt.`;

    try {
      const script = await this.generateTextFromPrompt(prompt, temperature);
      if (!script || script.trim().length === 0) {
        throw new Error('AI service returned empty script');
      }
      let cleanedScript = script.trim();
      
      // Convert any square bracket variables to single curly brace format for IVR
      cleanedScript = cleanedScript.replace(/\[CONTACT_NAME\]/gi, '{firstName}');
      cleanedScript = cleanedScript.replace(/\[LAST_NAME\]/gi, '{lastName}');
      cleanedScript = cleanedScript.replace(/\[PHONE_NUMBER\]/gi, '{phoneNumber}');
      cleanedScript = cleanedScript.replace(/\[EMAIL\]/gi, '{email}');
      // Convert triple curly braces to single curly braces for IVR (fix for AI generating {{{}}})
      cleanedScript = cleanedScript.replace(/\{\{\{(\w+)\}\}\}/g, '{$1}');
      // Convert double curly braces to single curly braces for IVR (if AI generated double braces)
      cleanedScript = cleanedScript.replace(/\{\{(\w+)\}\}/g, '{$1}');
      
      // Ensure it ends with press-1 prompt
      if (!cleanedScript.toLowerCase().includes('press 1') && !cleanedScript.toLowerCase().includes('press one')) {
        cleanedScript += ' Press 1 to speak with a representative.';
      }
      
      return cleanedScript;
    } catch (error: any) {
      this.logger.error(`Failed to generate audio script for day ${day}, call ${callNumber}: ${error.message}`, error.stack);
      
      // If it's a BadRequestException (API key, rate limit, etc.), re-throw it
      // This allows the error to propagate up so users know what went wrong
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // Otherwise, use fallback
      const fallbackScript = data.includeContactName 
        ? `Hello {firstName}, this is ${agentName} calling from ${data.brandName}. We have an important message for you. Press 1 to speak with a representative.`
        : `Hello, this is ${agentName} calling from ${data.brandName}. We have an important message for you. Press 1 to speak with a representative.`;
      this.logger.warn(`Using fallback script for day ${day}, call ${callNumber}`);
      return fallbackScript;
    }
  }


  private async generateSmsContent(
    data: any,
    day: number,
    journeyDescription: string,
    temperature?: number, // Optional temperature (0-1), default 0.7
  ): Promise<string> {
    // Build CTA instruction based on smsCta config
    let ctaInstruction = '';
    if (data.smsCta?.type === 'event') {
      ctaInstruction = 'Include a call-to-action to schedule a meeting/appointment. Use {{calendarLink}} variable for the booking link.';
    } else if (data.smsCta?.type === 'phone') {
      const phoneNumber = data.smsCta.phoneNumber || 'your phone number';
      ctaInstruction = `Include a call-to-action with the phone number: ${phoneNumber}. Encourage recipients to call.`;
    } else if (data.smsCta?.type === 'ai') {
      ctaInstruction = 'Include a call-to-action encouraging recipients to reply to the message for more information or assistance.';
    }
    
    const prompt = `Generate an SMS message for ${data.brandName} in the ${data.industry} industry.

Journey Context: ${journeyDescription}

Generate an SMS for Day ${day} of the journey.

Requirements:
1. Keep it under 160 characters
2. Match the ${data.marketingAngle} marketing angle
3. Use a ${data.sentiment} tone
4. ${data.includeContactName ? 'Use "Hi {{firstName}}" format (use double curly braces {{firstName}}, NOT square brackets [CONTACT_NAME])' : 'Use generic greeting'}
5. Make it relevant to ${data.industry} industry
6. The content should escalate appropriately based on the day number
7. CRITICAL: Use variable format {{firstName}} with EXACTLY TWO curly braces ({{variable}}), NEVER use three braces ({{{variable}}}) or square brackets [CONTACT_NAME]
8. NEVER use triple curly braces {{{}}}. Always use exactly {{}} for variables.
${ctaInstruction ? `9. ${ctaInstruction}` : ''}

Example: "Hi {{firstName}}, this is ${data.brandName}. We have an important message for you.${data.smsCta?.type === 'event' ? ' Schedule here: {{calendarLink}}' : data.smsCta?.type === 'phone' ? ` Call us at ${data.smsCta.phoneNumber || 'your number'}` : data.smsCta?.type === 'ai' ? ' Reply to learn more!' : ''}"

Return ONLY the SMS text, no quotes, no notes.`;

    try {
      const message = await this.generateTextFromPrompt(prompt, temperature);
      if (!message || message.trim().length === 0) {
        throw new Error('AI service returned empty SMS message');
      }
      let cleanedMessage = message.trim().substring(0, 160);
      
      // Convert any square bracket variables to double curly brace format for SMS
      cleanedMessage = cleanedMessage.replace(/\[CONTACT_NAME\]/gi, '{{firstName}}');
      cleanedMessage = cleanedMessage.replace(/\[LAST_NAME\]/gi, '{{lastName}}');
      cleanedMessage = cleanedMessage.replace(/\[PHONE_NUMBER\]/gi, '{{phoneNumber}}');
      cleanedMessage = cleanedMessage.replace(/\[EMAIL\]/gi, '{{email}}');
      
      // Handle any other unmapped square bracket variables
      cleanedMessage = cleanedMessage.replace(/\[(\w+)\]/g, (match, varName) => {
        return `{{${varName.toLowerCase()}}}`;
      });
      
      // Convert triple curly braces to double curly braces for SMS variables (fix for AI generating {{{}}})
      // Handle various formats: {{{variable}}}, {{{ variable }}}, etc.
      cleanedMessage = cleanedMessage.replace(/\{\{\{(\s*)(\w+)(\s*)\}\}\}/g, '{{$2}}');
      cleanedMessage = cleanedMessage.replace(/\{\{\{(\w+)\}\}\}/g, '{{$1}}');
      
      // Convert double curly braces that might have been incorrectly formatted
      // Ensure all variables use exactly {{variable}} format
      cleanedMessage = cleanedMessage.replace(/\{\{\s*(\w+)\s*\}\}/g, '{{$1}}');
      
      // Convert single curly braces to double curly braces for SMS variables
      cleanedMessage = cleanedMessage.replace(/\{(\w+)\}/g, '{{$1}}');
      
      // Final cleanup: remove any remaining triple braces (aggressive cleanup)
      cleanedMessage = cleanedMessage.replace(/\{\{\{/g, '{{');
      cleanedMessage = cleanedMessage.replace(/\}\}\}/g, '}}');
      
      // If phone CTA is selected but phone number not in message, append it
      if (data.smsCta?.type === 'phone' && data.smsCta.phoneNumber) {
        const phoneNumber = data.smsCta.phoneNumber;
        // Check if phone number is already in the message
        if (!cleanedMessage.includes(phoneNumber) && !cleanedMessage.includes('{{phoneNumber}}')) {
          // Append phone number CTA if there's room (keep under 160 chars)
          const ctaText = ` Call us at ${phoneNumber}`;
          if (cleanedMessage.length + ctaText.length <= 160) {
            cleanedMessage += ctaText;
          } else {
            // Truncate message to make room for phone number
            const maxLength = 160 - ctaText.length;
            cleanedMessage = cleanedMessage.substring(0, maxLength).trim() + ctaText;
          }
        }
      }
      
      return cleanedMessage;
    } catch (error: any) {
      this.logger.error(`Failed to generate SMS content: ${error.message}`);
      const fallbackMessage = data.includeContactName
        ? `Hi {{firstName}}, this is ${data.brandName}! We have an important update for you.`
        : `Hello from ${data.brandName}! We have an important update for you.`;
      return fallbackMessage;
    }
  }

  private buildJourneyTemplateStructure(
    data: any,
    voiceTemplates: Array<{ day: number; callNumber: number; voiceIndex: number; voiceTemplateId: string }>,
    smsMessages: Array<{ day: number; message: string }>,
    delayConfig?: {
      betweenCalls: Array<{ value: number; unit: 'MINUTES' | 'HOURS' }>;
      betweenCallAndSms: { value: number; unit: 'MINUTES' | 'HOURS' };
    },
  ): any {
    const nodes: any[] = [];
    const nodeIdMap = new Map<string, string>();
    let nodeCounter = 0;
    let yPosition = 100;
    const HORIZONTAL_SPACING = 300;
    const VERTICAL_SPACING = 200;
    const DAY_SPACING = 400;

    // Group voice templates by day
    const templatesByDay = new Map<number, typeof voiceTemplates>();
    voiceTemplates.forEach(template => {
      if (!templatesByDay.has(template.day)) {
        templatesByDay.set(template.day, []);
      }
      templatesByDay.get(template.day)!.push(template);
    });

    let previousNodeId: string | null = null;
    let previousDay: number | null = null;

    for (let day = 1; day <= data.totalDays; day++) {
      const isRestDay = data.restPeriodDays.includes(day);
      
      if (isRestDay) {
        // Skip rest days but still track the day for delay node attribution
        // The delay node between days should account for rest days
        previousDay = day; // Update previousDay even for rest days
        continue;
      }

      const dayTemplates = templatesByDay.get(day) || [];
      const daySms = smsMessages.find(sms => sms.day === day);

      // Create nodes for this day
      let dayStartNodeId: string | null = null;
      let dayLastNodeId: string | null = null;
      let previousCallNodeId: string | null = null;

      // Sort templates by callNumber to ensure proper order
      const sortedTemplates = [...dayTemplates].sort((a, b) => {
        if (a.callNumber !== b.callNumber) {
          return a.callNumber - b.callNumber;
        }
        return a.voiceIndex - b.voiceIndex;
      });

      // Create call nodes with voice templates assigned and connect them with delays
      for (const template of sortedTemplates) {
        const nodeId = `node_${nodeCounter++}`;
        nodeIdMap.set(`${day}_${template.callNumber}_${template.voiceIndex}`, nodeId);

        const callNode = {
          id: nodeId,
          type: 'MAKE_CALL',
          positionX: 400 + template.callNumber * HORIZONTAL_SPACING,
          positionY: yPosition,
          config: {
            voiceTemplateId: template.voiceTemplateId, // Assign voice template to node
            day,
            callNumber: template.callNumber,
            voiceIndex: template.voiceIndex,
          },
          connections: {}, // Will be set later if there's a next call or SMS
        };

        // Connect previous call node to this one with a delay between calls
        if (previousCallNodeId) {
          // Get delay config for this call number (index is callNumber - 2 since we're between calls)
          const delayIndex = template.callNumber - 2; // First delay is between call 1 and 2 (index 0)
          const defaultDelay = { value: 3, unit: 'HOURS' as const }; // Default: 3 hours
          const delay = delayConfig?.betweenCalls?.[delayIndex] || defaultDelay;
          
          // Add TIME_DELAY node between calls
          // TIME_DELAY nodes belong to the current day (before incrementing)
          const delayNodeId = `node_${nodeCounter++}`;
          const delayNode = {
            id: delayNodeId,
            type: 'TIME_DELAY',
            positionX: 400 + (template.callNumber - 0.5) * HORIZONTAL_SPACING,
            positionY: yPosition,
            config: {
              delayValue: delay.value,
              delayUnit: delay.unit,
              day, // Assign to current day
            },
            metadata: {
              day, // Also in metadata for consistency
            },
            connections: {
              nextNodeId: nodeId,
            },
          };
          nodes.push(delayNode);

          const prevCallNode = nodes.find(n => n.id === previousCallNodeId);
          if (prevCallNode) {
            prevCallNode.connections = { nextNodeId: delayNodeId };
          }
        }

        nodes.push(callNode);

        if (!dayStartNodeId) {
          dayStartNodeId = nodeId;
        }
        dayLastNodeId = nodeId;
        previousCallNodeId = nodeId;
      }

      // Create SMS node if enabled
      if (daySms) {
        const smsNodeId = `node_${nodeCounter++}`;
        const smsConfig: any = {
          messageContent: daySms.message,
          day,
        };
        
        // Add CTA config based on smsCta settings
        if (data.smsCta?.type === 'event' && data.smsCta.eventTypeId) {
          smsConfig.eventTypeId = data.smsCta.eventTypeId;
        } else if (data.smsCta?.type === 'phone' && data.smsCta.phoneNumber) {
          // Store phone number in config (will be included in message content by AI)
          smsConfig.ctaPhoneNumber = data.smsCta.phoneNumber;
        } else if (data.smsCta?.type === 'ai' && data.smsCta.aiTemplateId) {
          // For AI messenger, we'll need to enable AI replies on conversations
          // This might require additional setup in the conversation handling
          smsConfig.aiTemplateId = data.smsCta.aiTemplateId;
        }
        
        const smsNode = {
          id: smsNodeId,
          type: 'SEND_SMS',
          positionX: 400,
          positionY: yPosition + VERTICAL_SPACING,
          config: smsConfig,
          connections: {},
        };

        nodes.push(smsNode);

        // Connect last call node to SMS node with a delay
        if (dayLastNodeId) {
          // Get delay config for SMS (after last call)
          const defaultSmsDelay = { value: 1, unit: 'HOURS' as const }; // Default: 1 hour
          const smsDelay = delayConfig?.betweenCallAndSms || defaultSmsDelay;
          
          // Add TIME_DELAY node between last call and SMS
          // TIME_DELAY nodes belong to the current day (before incrementing)
          const smsDelayNodeId = `node_${nodeCounter++}`;
          const smsDelayNode = {
            id: smsDelayNodeId,
            type: 'TIME_DELAY',
            positionX: 400,
            positionY: yPosition + VERTICAL_SPACING / 2,
            config: {
              delayValue: smsDelay.value,
              delayUnit: smsDelay.unit,
              day, // Assign to current day
            },
            metadata: {
              day, // Also in metadata for consistency
            },
            connections: {
              nextNodeId: smsNodeId,
            },
          };
          nodes.push(smsDelayNode);

          const lastCallNode = nodes.find(n => n.id === dayLastNodeId);
          if (lastCallNode) {
            lastCallNode.connections = { nextNodeId: smsDelayNodeId };
          }
        }

        dayLastNodeId = smsNodeId;
      }

      // Connect previous day's last node to this day's first node with a delay
      // This ensures the journey continues from day to day
      if (previousNodeId && dayStartNodeId) {
        const prevNode = nodes.find(n => n.id === previousNodeId);
        if (prevNode) {
          // Only set connection if it doesn't already have one
          if (!prevNode.connections.nextNodeId) {
            // Add TIME_DELAY node between days (1 day delay)
            // TIME_DELAY nodes belong to the previous day (the day they're transitioning FROM)
            // This ensures they're included in the correct day when collapsed/expanded
            const dayDelayNodeId = `node_${nodeCounter++}`;
            const delayDay = previousDay || day - 1; // Use previous day, or day - 1 if previousDay is null
            const dayDelayNode = {
              id: dayDelayNodeId,
              type: 'TIME_DELAY',
              positionX: 200,
              positionY: yPosition - DAY_SPACING / 2,
              config: {
                delayValue: 1, // 1 day delay between days
                delayUnit: 'DAYS',
                day: delayDay, // Assign to previous day (the day it's transitioning FROM)
              },
              metadata: {
                day: delayDay, // Also in metadata for consistency
              },
              connections: {
                nextNodeId: dayStartNodeId,
              },
            };
            nodes.push(dayDelayNode);
            prevNode.connections.nextNodeId = dayDelayNodeId;
          }
        }
      }

      // Set previousNodeId and previousDay for next iteration - this will be used to connect to the next day
      // Use dayLastNodeId (which is either the SMS node or the last call node) or fall back to dayStartNodeId
      previousNodeId = dayLastNodeId || dayStartNodeId;
      previousDay = day; // Track the current day for next iteration
      yPosition += DAY_SPACING;
    }

    return {
      name: `${data.brandName} - ${data.totalDays} Day Journey`,
      description: `AI-generated journey for ${data.industry}`,
      nodes,
      entryCriteria: {},
      autoEnrollEnabled: false,
      scheduleConfig: {},
    };
  }

  private async generateTextFromPrompt(prompt: string, temperature: number = 0.7): Promise<string> {
    try {
      if (!this.claudeClient) {
        await this.initializeClaudeClient();
        if (!this.claudeClient) {
          throw new Error('Anthropic API key not configured. Please configure ANTHROPIC_API_KEY in settings.');
        }
      }

      const model = (await this.configService.get('CLAUDE_MODEL')) || 'claude-3-5-haiku-20241022';
      
      const response = await this.claudeClient.messages.create({
        model,
        max_tokens: 500,
        temperature: Math.max(0, Math.min(1, temperature)), // Clamp between 0 and 1
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      if (!response || !response.content || !Array.isArray(response.content)) {
        throw new Error('Invalid response from AI service');
      }

      let text = '';
      for (const contentBlock of response.content) {
        if (contentBlock.type === 'text') {
          text += contentBlock.text;
        }
      }

      if (!text || text.trim().length === 0) {
        throw new Error('AI service returned empty response');
      }

      return text.trim().replace(/^["']|["']$/g, '').trim();
    } catch (error: any) {
      this.logger.error(`Failed to generate text from prompt: ${error.message}`, error.stack);
      
      // Provide more specific error messages
      if (error.message?.includes('API key')) {
        throw new BadRequestException('Anthropic API key is not configured. Please configure ANTHROPIC_API_KEY in system settings.');
      } else if (error.status === 401) {
        throw new BadRequestException('Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY configuration.');
      } else if (error.status === 429) {
        throw new BadRequestException('Anthropic API rate limit exceeded. Please try again in a few moments.');
      } else if (error.status === 500 || error.status >= 500) {
        throw new BadRequestException('Anthropic API service is temporarily unavailable. Please try again later.');
      } else if (error.code === 'ECONNREFUSED' || error.message?.includes('connect')) {
        throw new BadRequestException('Cannot connect to Anthropic API. Please check your network connection.');
      } else if (error.message?.includes('timeout')) {
        throw new BadRequestException('AI service request timed out. Please try again.');
      }
      
      // Re-throw with original message if not handled above
      throw new BadRequestException(`Failed to generate AI content: ${error.message || 'Unknown error'}`);
    }
  }
}

