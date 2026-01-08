import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Response } from 'express';
import { promises as fs } from 'fs';
import { VoiceTemplate } from '../entities/voice-template.entity';
import { GeneratedAudio } from '../entities/generated-audio.entity';
import { VoiceMessage, VoiceMessageStatus } from '../entities/voice-message.entity';
import { AudioCredits, CreditTransactionType } from '../entities/audio-credits.entity';
import { Contact } from '../entities/contact.entity';
import { Campaign } from '../entities/campaign.entity';
import { Segment } from '../entities/segment.entity';
import { Tenant } from '../entities/tenant.entity';
import { KokoroService } from '../kokoro/kokoro.service';
import { AsteriskSoundService } from '../asterisk/asterisk-sound.service';
import { AudioProcessingService } from '../audio-processing/audio-processing.service';
import { CalendarEvent, CalendarEventStatus } from '../entities/calendar-event.entity';
import { formatInTimeZone } from 'date-fns-tz';
import { ModuleRef } from '@nestjs/core';
import { CreateVoiceTemplateDto } from './dto/create-voice-template.dto';
import { GenerateVoiceCampaignDto } from './dto/generate-voice-campaign.dto';
import { VoicePresetsService } from '../voice-presets/voice-presets.service';
import * as crypto from 'crypto';
import * as path from 'path';

@Injectable()
export class VoiceMessagesService {
  private readonly logger = new Logger(VoiceMessagesService.name);

  constructor(
    @InjectRepository(VoiceTemplate)
    private voiceTemplateRepository: Repository<VoiceTemplate>,
    @InjectRepository(GeneratedAudio)
    private generatedAudioRepository: Repository<GeneratedAudio>,
    @InjectRepository(VoiceMessage)
    private voiceMessageRepository: Repository<VoiceMessage>,
    @InjectRepository(AudioCredits)
    private audioCreditsRepository: Repository<AudioCredits>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(Segment)
    private segmentRepository: Repository<Segment>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private kokoroService: KokoroService,
    private asteriskSoundService: AsteriskSoundService,
    private audioProcessingService: AudioProcessingService,
    private voicePresetsService: VoicePresetsService,
    private readonly moduleRef: ModuleRef,
  ) {}

  async createTemplate(tenantId: string, dto: CreateVoiceTemplateDto): Promise<VoiceTemplate> {
    // Extract variables from messageContent (e.g., {firstName}, {lastName})
    const variablePattern = /\{(\w+)\}/g;
    const variables: string[] = [];
    let match;
    while ((match = variablePattern.exec(dto.messageContent)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    // Load voice preset if provided
    let voicePreset = null;
    let finalVoiceId: string | undefined;
    let finalVoiceName: string | undefined;
    let finalVoiceConfig = dto.voiceConfig;

    if (dto.voicePresetId) {
      try {
        voicePreset = await this.voicePresetsService.findOne(tenantId, dto.voicePresetId);
        finalVoiceId = voicePreset.kokoroVoiceId;
        finalVoiceName = voicePreset.kokoroVoiceName;
        // Merge preset config with template config (template config takes precedence)
        finalVoiceConfig = {
          ...voicePreset.voiceConfig,
          ...dto.voiceConfig,
        };
      } catch (error) {
        this.logger.warn(`Voice preset ${dto.voicePresetId} not found, using provided voice config`);
      }
    }

    // Support both Kokoro and legacy ElevenLabs fields
    const voiceId = finalVoiceId || dto.kokoroVoiceId || dto.elevenLabsVoiceId;
    const voiceName = finalVoiceName || dto.kokoroVoiceName || dto.elevenLabsVoiceName;

    if (!voiceId) {
      throw new BadRequestException('Voice ID is required (kokoroVoiceId, elevenLabsVoiceId, or voicePresetId)');
    }

    const template = this.voiceTemplateRepository.create({
      name: dto.name,
      description: dto.description,
      messageContent: dto.messageContent,
      kokoroVoiceId: voiceId,
      kokoroVoiceName: voiceName,
      elevenLabsVoiceId: dto.elevenLabsVoiceId || voiceId, // Set for backward compatibility
      elevenLabsVoiceName: dto.elevenLabsVoiceName || voiceName, // Set for backward compatibility
      voicePresetId: dto.voicePresetId || null,
      voiceConfig: finalVoiceConfig,
      audioEffects: dto.audioEffects,
      variables,
      isActive: dto.isActive ?? true,
      tenantId,
    });

    return this.voiceTemplateRepository.save(template);
  }

  async findAllTemplates(tenantId: string): Promise<VoiceTemplate[]> {
    try {
      return await this.voiceTemplateRepository.find({
        where: { tenantId, isActive: true },
        relations: ['voicePreset'],
        order: { createdAt: 'DESC' },
      });
    } catch (error: any) {
      // If column/relation doesn't exist (migration not run), try without relation
      const errorMessage = error.message || error.toString() || '';
      if (
        errorMessage.includes('voicePreset') ||
        errorMessage.includes('relation') ||
        errorMessage.includes('column') ||
        errorMessage.includes('does not exist') ||
        error.code === '42703' // PostgreSQL undefined column error
      ) {
        this.logger.warn('voicePreset column/relation not available, loading templates without relation');
        return this.voiceTemplateRepository.find({
          where: { tenantId, isActive: true },
          order: { createdAt: 'DESC' },
        });
      }
      this.logger.error('Error loading voice templates', error);
      throw error;
    }
  }

  async findTemplate(tenantId: string, id: string): Promise<VoiceTemplate> {
    try {
      const template = await this.voiceTemplateRepository.findOne({
        where: { id, tenantId },
        relations: ['voicePreset'],
      });
      if (!template) {
        throw new NotFoundException('Voice template not found');
      }
      return template;
    } catch (error: any) {
      // If column/relation doesn't exist (migration not run), try without relation
      const errorMessage = error.message || error.toString() || '';
      if (
        errorMessage.includes('voicePreset') ||
        errorMessage.includes('relation') ||
        errorMessage.includes('column') ||
        errorMessage.includes('does not exist') ||
        error.code === '42703' // PostgreSQL undefined column error
      ) {
        const template = await this.voiceTemplateRepository.findOne({
          where: { id, tenantId },
        });
        if (!template) {
          throw new NotFoundException('Voice template not found');
        }
        return template;
      }
      // If it's a NotFoundException, re-throw it
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error loading voice template', error);
      throw error;
    }
  }

  async calculateCampaignCost(
    tenantId: string,
    campaignId: string,
    segmentId: string,
    voiceTemplateId: string,
  ): Promise<{
    totalContacts: number;
    uniqueAudioFiles: number;
    estimatedCredits: number;
    variableCombinations: Array<{ variables: Record<string, string>; count: number }>;
  }> {
    const segment = await this.segmentRepository.findOne({
      where: { id: segmentId, tenantId },
      relations: ['contacts'],
    });

    if (!segment) {
      throw new NotFoundException('Segment not found');
    }

    const template = await this.findTemplate(tenantId, voiceTemplateId);
    const contacts = segment.contacts || [];

    // Group contacts by variable combinations
    const variableMap = new Map<string, { variables: Record<string, string>; contacts: Contact[] }>();

    for (const contact of contacts) {
      const variableValues: Record<string, string> = {};
      let hasAllVariables = true;

      for (const variable of template.variables) {
        let value: string | undefined;

        // Map common variables
        switch (variable.toLowerCase()) {
          case 'firstname':
          case 'first_name':
            value = contact.firstName || '';
            break;
          case 'lastname':
          case 'last_name':
            value = contact.lastName || '';
            break;
          case 'email':
            value = contact.email || '';
            break;
          case 'phone':
          case 'phonenumber':
          case 'phone_number':
            value = contact.phoneNumber || '';
            break;
          default:
            // Check attributes
            value = contact.attributes?.[variable] || '';
        }

        if (!value) {
          hasAllVariables = false;
          break;
        }
        variableValues[variable] = value;
      }

      if (hasAllVariables) {
        const key = JSON.stringify(variableValues);
        if (!variableMap.has(key)) {
          variableMap.set(key, { variables: variableValues, contacts: [] });
        }
        variableMap.get(key)!.contacts.push(contact);
      }
    }

    const variableCombinations = Array.from(variableMap.values()).map((item) => ({
      variables: item.variables,
      count: item.contacts.length,
    }));

    const uniqueAudioFiles = variableCombinations.length;
    const totalContacts = contacts.length;

    // Estimate credits (1 credit per second of audio, or per 100 characters)
    const estimatedTextLength = template.messageContent.length;
    const estimatedCreditsPerAudio = this.kokoroService.calculateCredits(
      template.messageContent,
    );
    const estimatedCredits = uniqueAudioFiles * estimatedCreditsPerAudio;

    return {
      totalContacts,
      uniqueAudioFiles,
      estimatedCredits,
      variableCombinations,
    };
  }

  async generateVoiceCampaign(
    tenantId: string,
    dto: GenerateVoiceCampaignDto,
  ): Promise<{ message: string; jobId: string }> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: dto.campaignId, tenantId },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const segment = await this.segmentRepository.findOne({
      where: { id: dto.segmentId, tenantId },
      relations: ['contacts'],
    });
    if (!segment) {
      throw new NotFoundException('Segment not found');
    }

    const template = await this.findTemplate(tenantId, dto.voiceTemplateId);
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check credits
    const cost = await this.calculateCampaignCost(
      tenantId,
      dto.campaignId,
      dto.segmentId,
      dto.voiceTemplateId,
    );

    if (tenant.audioCreditsBalance < cost.estimatedCredits) {
      throw new BadRequestException(
        `Insufficient credits. Required: ${cost.estimatedCredits}, Available: ${tenant.audioCreditsBalance}`,
      );
    }

    // Start generation process (async)
    const jobId = crypto.randomUUID();
    this.generateAndSendVoiceMessages(tenantId, dto, cost, jobId).catch((error) => {
      this.logger.error('Voice campaign generation failed', {
        error: error?.message || error,
        stack: error?.stack,
        jobId,
        tenantId,
        campaignId: dto.campaignId,
      });
      // Don't throw - this is fire-and-forget, but log comprehensively
    });

    return {
      message: `Voice campaign generation started. Generating ${cost.uniqueAudioFiles} unique audio files for ${cost.totalContacts} contacts.`,
      jobId,
    };
  }

  private async generateAndSendVoiceMessages(
    tenantId: string,
    dto: GenerateVoiceCampaignDto,
    cost: Awaited<ReturnType<typeof this.calculateCampaignCost>>,
    jobId: string,
  ): Promise<void> {
    const template = await this.findTemplate(tenantId, dto.voiceTemplateId);
    const segment = await this.segmentRepository.findOne({
      where: { id: dto.segmentId, tenantId },
      relations: ['contacts'],
    });

    if (!segment) return;

    const contacts = segment.contacts || [];
    const audioCache = new Map<string, GeneratedAudio>();

    this.logger.log(`[Voice Campaign] Starting generation - Campaign: ${dto.campaignId}, Template: ${template.id} (${template.name}), Segment: ${dto.segmentId}, Contacts: ${contacts.length}, Unique Audio Files: ${cost.uniqueAudioFiles}, Job ID: ${jobId}`);

    // Check if template needs appointment info
    const needsAppointmentInfo = template.variables.some(v => 
      ['appointmenttime', 'appointment_time', 'appointmentdate', 'appointment_date', 'appointmentdatetime', 'appointment_date_time'].includes(v.toLowerCase())
    );

    // Fetch appointment info for all contacts in parallel if needed
    const appointmentInfoMap = new Map<string, { time: string; date: string; dateTime: string }>();
    if (needsAppointmentInfo) {
      const appointmentPromises = contacts.map(async (contact) => {
        const info = await this.getAppointmentInfo(tenantId, contact.id);
        return { contactId: contact.id, info };
      });
      const appointmentResults = await Promise.all(appointmentPromises);
      appointmentResults.forEach(({ contactId, info }) => {
        appointmentInfoMap.set(contactId, info);
      });
    }

    // Group contacts by variable combinations
    const contactGroups = new Map<string, Contact[]>();
    for (const contact of contacts) {
      const variableValues: Record<string, string> = {};
      let hasAllVariables = true;

      // Get appointment info from map if needed
      const appointmentInfo = needsAppointmentInfo ? (appointmentInfoMap.get(contact.id) || { time: '', date: '', dateTime: '' }) : { time: '', date: '', dateTime: '' };
      
      for (const variable of template.variables) {
        let value: string | undefined;
        switch (variable.toLowerCase()) {
          case 'firstname':
          case 'first_name':
            value = contact.firstName || '';
            break;
          case 'lastname':
          case 'last_name':
            value = contact.lastName || '';
            break;
          case 'email':
            value = contact.email || '';
            break;
          case 'phone':
          case 'phonenumber':
          case 'phone_number':
            value = contact.phoneNumber || '';
            break;
          case 'appointmenttime':
          case 'appointment_time':
            value = appointmentInfo.time || '';
            break;
          case 'appointmentdate':
          case 'appointment_date':
            value = appointmentInfo.date || '';
            break;
          case 'appointmentdatetime':
          case 'appointment_date_time':
            value = appointmentInfo.dateTime || '';
            break;
          default:
            value = contact.attributes?.[variable] || '';
        }
        if (!value) {
          hasAllVariables = false;
          break;
        }
        variableValues[variable] = value;
      }

      if (hasAllVariables) {
        const key = JSON.stringify(variableValues);
        if (!contactGroups.has(key)) {
          contactGroups.set(key, []);
        }
        contactGroups.get(key)!.push(contact);
      }
    }

    // Prepare all audio generation tasks for parallel processing
    const audioGenerationTasks: Array<{
      key: string;
      variableValues: Record<string, string>;
      normalizedKey: string;
      normalizedVariableValues: Record<string, string>;
      groupContacts: Contact[];
    }> = [];

    for (const [key, groupContacts] of contactGroups.entries()) {
      const variableValues = JSON.parse(key);
      const normalizedVariableValues = Object.keys(variableValues)
        .sort()
        .reduce((acc, k) => {
          acc[k] = variableValues[k];
          return acc;
        }, {} as Record<string, string>);
      const normalizedKey = JSON.stringify(normalizedVariableValues);

      // Check cache first
      let generatedAudio = audioCache.get(normalizedKey);
      if (!generatedAudio) {
        // Check database
        generatedAudio = await this.generatedAudioRepository
          .createQueryBuilder('audio')
          .where('audio."voiceTemplateId" = :voiceTemplateId', { voiceTemplateId: template.id })
          .andWhere('audio."tenantId" = :tenantId', { tenantId })
          .andWhere('audio."variableValues"::jsonb @> :variableValues::jsonb', {
            variableValues: normalizedKey,
          })
          .andWhere(':variableValues::jsonb @> audio."variableValues"::jsonb', {
            variableValues: normalizedKey,
          })
          .getOne();

        if (generatedAudio) {
          audioCache.set(normalizedKey, generatedAudio);
        } else {
          // Add to parallel processing queue
          audioGenerationTasks.push({
            key,
            variableValues,
            normalizedKey,
            normalizedVariableValues,
            groupContacts,
          });
        }
      }
    }

    // Process audio generation in parallel batches (10 at a time)
    const BATCH_SIZE = 10;
    for (let i = 0; i < audioGenerationTasks.length; i += BATCH_SIZE) {
      const batch = audioGenerationTasks.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (task) => {
        const { variableValues, normalizedKey, normalizedVariableValues, groupContacts } = task;
        
          // Generate new audio
          let substitutedText = this.substituteVariables(template.messageContent, variableValues);
          
          // Load preset if template has one, and merge configs
          let finalVoiceConfig = template.voiceConfig;
          let finalVoiceId = template.kokoroVoiceId || template.elevenLabsVoiceId;
          
          if (template.voicePresetId) {
            try {
              const preset = await this.voicePresetsService.findOne(tenantId, template.voicePresetId);
              finalVoiceId = preset.kokoroVoiceId;
              finalVoiceConfig = {
                ...preset.voiceConfig,
                ...template.voiceConfig,
              };
            } catch (error) {
              this.logger.warn(`Voice preset ${template.voicePresetId} not found, using template config`);
            }
          }
          
          const startTime = Date.now();
        this.logger.log(`[Voice Campaign] Generating new audio - Campaign: ${dto.campaignId}, Template: ${template.id} (${template.name}), Variable Values: ${JSON.stringify(variableValues)}, Credits estimated: ${this.kokoroService.calculateCredits(substitutedText, undefined)}, Job ID: ${jobId}`);

          try {
            let { audioBuffer, duration } = await this.kokoroService.generateAudio({
            text: substitutedText,
              voiceId: finalVoiceId,
              voiceConfig: finalVoiceConfig,
            context: 'voice-campaign',
            requestId: `${jobId}-${normalizedKey}`,
          } as any);

            // Apply audio effects if configured
            if (template.audioEffects) {
              try {
                audioBuffer = await this.audioProcessingService.processAudio(
                  audioBuffer,
                24000,
                  template.audioEffects,
                );
              } catch (error) {
                this.logger.warn(`Failed to apply audio effects, using original audio: ${error.message}`);
              }
            }

            const filename = `${crypto.randomUUID()}.wav`;
            const filePath = await this.kokoroService.saveAudioFile(audioBuffer, filename);
            const audioUrl = `/uploads/audio/${filename}`;

            const creditsUsed = this.kokoroService.calculateCredits(substitutedText, duration);
            this.logger.log(`Audio generated - Credits: ${creditsUsed}, Duration: ${duration}s, Text length: ${substitutedText.length}`);

          const generatedAudio = this.generatedAudioRepository.create({
              voiceTemplateId: template.id,
            variableValues: normalizedVariableValues,
              audioUrl,
              audioFilePath: filePath,
              fileSizeBytes: audioBuffer.length,
              durationSeconds: duration,
              usageCount: 0,
              tenantId,
              metadata: {
                generationTime: Date.now() - startTime,
                creditsUsed,
              },
            });

          const savedAudio = await this.generatedAudioRepository.save(generatedAudio);
          this.logger.log(`Generated audio saved: ${savedAudio.id}`);

          // Deduct credits
            await this.deductCredits(tenantId, creditsUsed, {
              voiceTemplateId: template.id,
            generatedAudioId: savedAudio.id,
              campaignId: dto.campaignId,
              segmentId: dto.segmentId,
            });

          return { normalizedKey, generatedAudio: savedAudio, groupContacts };
          } catch (ttsError: any) {
            this.logger.error(`Failed to generate audio for template ${template.id}`, {
              error: ttsError?.message || ttsError,
              stack: ttsError?.stack,
              templateId: template.id,
              variableValues: normalizedVariableValues,
              textLength: substitutedText.length,
            });
          return { normalizedKey, generatedAudio: null, groupContacts };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process results
      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value.generatedAudio) {
          audioCache.set(result.value.normalizedKey, result.value.generatedAudio);
        }
      }
    }

    // Now create voice messages for all contacts
    for (const [key, groupContacts] of contactGroups.entries()) {
      const variableValues = JSON.parse(key);
      const normalizedVariableValues = Object.keys(variableValues)
        .sort()
        .reduce((acc, k) => {
          acc[k] = variableValues[k];
          return acc;
        }, {} as Record<string, string>);
      const normalizedKey = JSON.stringify(normalizedVariableValues);

      const generatedAudio = audioCache.get(normalizedKey);
      if (!generatedAudio) {
        this.logger.warn(`No audio found for variable combination: ${normalizedKey}, skipping contacts`);
        continue;
      }

      // Create voice messages for all contacts in this group
      for (const contact of groupContacts) {
        const voiceMessage = this.voiceMessageRepository.create({
          contactId: contact.id,
          campaignId: dto.campaignId,
          voiceTemplateId: template.id,
          generatedAudioId: generatedAudio.id,
          variableValues,
          audioUrl: generatedAudio.audioUrl,
          status: VoiceMessageStatus.QUEUED,
          tenantId,
        });

        await this.voiceMessageRepository.save(voiceMessage);

        // Increment usage count
        generatedAudio.usageCount += 1;
        await this.generatedAudioRepository.save(generatedAudio);
      }
    }

    // TODO: Send messages via Twilio (implement in a separate service/queue)
    this.logger.log(`[Voice Campaign] Generation completed - Campaign: ${dto.campaignId}, Job ID: ${jobId}, Total Contacts: ${contacts.length}, Audio Files Generated: ${audioCache.size}`);
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

  private async deductCredits(
    tenantId: string,
    amount: number,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (!tenant) return;

    tenant.audioCreditsBalance -= amount;
    await this.tenantRepository.save(tenant);

    const creditTransaction = this.audioCreditsRepository.create({
      tenantId,
      transactionType: CreditTransactionType.USAGE,
      amount: -amount,
      description: 'Voice message generation',
      metadata,
    });

    await this.audioCreditsRepository.save(creditTransaction);
  }

  /**
   * Preview a voice template with sample variable values
   */
  async previewTemplate(
    tenantId: string,
    templateId: string,
    variableValues: Record<string, string>,
  ): Promise<{
    generatedAudioId: string;
    audioUrl: string;
    audioFilePath: string;
    durationSeconds: number;
    substitutedText: string;
  }> {
    try {
      const template = await this.findTemplate(tenantId, templateId);
      
      this.logger.log(`[Preview] Generating preview audio - Template: ${templateId} (${template.name}), Variable Values: ${JSON.stringify(variableValues)}`);
      
      // Validate template has message content
      if (!template.messageContent || template.messageContent.trim().length === 0) {
        throw new BadRequestException('Voice template message content is empty. Please add message content to the template.');
      }

    // Normalize variableValues by sorting keys for consistent comparison
    const normalizedVariableValues = Object.keys(variableValues)
      .sort()
      .reduce((acc, key) => {
        acc[key] = variableValues[key];
        return acc;
      }, {} as Record<string, string>);

    // Substitute variables
    const substitutedText = this.substituteVariables(template.messageContent, variableValues);

    // Check if audio already exists for this variable combination using QueryBuilder
    // Use JSONB containment operator (@>) which is faster with GIN index
    // Note: TypeORM preserves camelCase, so column name is "variableValues" (quoted for PostgreSQL)
    // The composite index on (voiceTemplateId, tenantId) filters first, then GIN index on variableValues speeds up JSONB comparison
    let generatedAudio = await this.generatedAudioRepository
      .createQueryBuilder('audio')
      .where('audio."voiceTemplateId" = :voiceTemplateId', { voiceTemplateId: template.id })
      .andWhere('audio."tenantId" = :tenantId', { tenantId })
      .andWhere('audio."variableValues"::jsonb @> :variableValues::jsonb', {
        variableValues: JSON.stringify(normalizedVariableValues),
      })
      .andWhere(':variableValues::jsonb @> audio."variableValues"::jsonb', {
        variableValues: JSON.stringify(normalizedVariableValues),
      })
      .getOne();

    if (!generatedAudio) {
        this.logger.log(`[Preview] Generating new audio (not cached) - Template: ${templateId} (${template.name}), Variable Values: ${JSON.stringify(normalizedVariableValues)}`);
        
      // Load preset if template has one, and merge configs
      let finalVoiceConfig = template.voiceConfig;
      let finalVoiceId = template.kokoroVoiceId || template.elevenLabsVoiceId;
      
      if (template.voicePresetId) {
        try {
          const preset = await this.voicePresetsService.findOne(tenantId, template.voicePresetId);
          finalVoiceId = preset.kokoroVoiceId;
          // Merge preset config with template config (template takes precedence)
          finalVoiceConfig = {
            ...preset.voiceConfig,
            ...template.voiceConfig,
          };
        } catch (error) {
          this.logger.warn(`Voice preset ${template.voicePresetId} not found, using template config`);
        }
      }
      
      // Validate voice ID is set
      if (!finalVoiceId) {
        throw new BadRequestException(
          'Voice template does not have a voice ID configured. Please set kokoroVoiceId, elevenLabsVoiceId, or select a voice preset.'
        );
      }
      
      // Validate text is not empty
      if (!substitutedText || substitutedText.trim().length === 0) {
        throw new BadRequestException(
          'Message content is empty after variable substitution. Please check your template message content and variable values.'
        );
      }
      
      // Generate new audio
      this.logger.log(`Generating preview audio for template ${template.id} with voice ${finalVoiceId}`);
      let { audioBuffer, duration } = await this.kokoroService.generateAudio({
        text: substitutedText, // Tags preserved for Kokoro to process as instructions
        voiceId: finalVoiceId,
        voiceConfig: finalVoiceConfig,
        context: 'preview',
        requestId: `preview-${templateId}-${Date.now()}`,
      } as any);

      // Apply audio effects if configured
      if (template.audioEffects) {
        try {
          audioBuffer = await this.audioProcessingService.processAudio(
            audioBuffer,
            24000, // Kokoro sample rate
            template.audioEffects,
          );
          this.logger.log(`Applied audio effects to preview for template ${template.id}`);
        } catch (error) {
          this.logger.warn(`Failed to apply audio effects to preview, using original audio: ${error.message}`);
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
        await fs.unlink(tempAudioPath);
      } catch (error) {
        this.logger.warn(`Failed to delete temporary audio file: ${error.message}`);
      }

      // Save GeneratedAudio record with normalized variableValues
      const creditsUsed = this.kokoroService.calculateCredits(substitutedText, duration);
      generatedAudio = this.generatedAudioRepository.create({
        voiceTemplateId: template.id,
        variableValues: normalizedVariableValues,
        audioUrl,
        audioFilePath: convertedFiles.wav,
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
    }

    return {
      generatedAudioId: generatedAudio.id,
      audioUrl: generatedAudio.audioUrl,
      audioFilePath: generatedAudio.audioFilePath,
      durationSeconds: generatedAudio.durationSeconds || 0,
      substitutedText,
    };
    } catch (error: any) {
      this.logger.error(`Failed to preview voice template ${templateId}: ${error.message}`, error.stack);
      
      // If it's already a BadRequestException, re-throw it
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // If it's a NotFoundException from findTemplate, re-throw it
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      // Wrap other errors with helpful message
      throw new BadRequestException(
        `Failed to generate preview: ${error.message || 'Unknown error occurred. Please check your TTS service configuration.'}`
      );
    }
  }

  /**
   * Stream a generated audio file
   */
  async streamGeneratedAudio(tenantId: string, generatedAudioId: string, res: Response): Promise<void> {
    const generatedAudio = await this.generatedAudioRepository.findOne({
      where: { id: generatedAudioId, tenantId },
    });

    if (!generatedAudio) {
      res.status(404).json({ error: 'Generated audio not found' });
      return;
    }

    if (!generatedAudio.audioFilePath) {
      res.status(404).json({ error: 'Audio file path not found' });
      return;
    }

    try {
      const filePath = generatedAudio.audioFilePath;
      const stats = await fs.stat(filePath);
      const mimeType = this.asteriskSoundService.getMimeType(filePath);

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      // CORS headers for audio streaming
      const origin = res.req?.headers?.origin;
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }

      // Stream the file
      const { createReadStream } = await import('fs');
      const stream = createReadStream(filePath);
      stream.pipe(res);

      stream.on('error', (error) => {
        res.status(500).json({ error: 'Failed to stream file', message: error.message });
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to stream audio file', message: error.message });
    }
  }

  /**
   * Get generated audio info
   */
  async getGeneratedAudio(tenantId: string, generatedAudioId: string): Promise<GeneratedAudio> {
    const generatedAudio = await this.generatedAudioRepository.findOne({
      where: { id: generatedAudioId, tenantId },
      relations: ['voiceTemplate'],
    });

    if (!generatedAudio) {
      throw new NotFoundException('Generated audio not found');
    }

    return generatedAudio;
  }
}

