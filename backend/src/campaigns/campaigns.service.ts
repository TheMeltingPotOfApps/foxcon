import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Inject } from '@nestjs/common';
import { Campaign, CampaignType, CampaignStatus } from '../entities/campaign.entity';
import { CampaignContact, CampaignContactStatus } from '../entities/campaign-contact.entity';
import { Contact } from '../entities/contact.entity';
import { TwilioService } from '../twilio/twilio.service';
import { NumberPool } from '../entities/number-pool.entity';
import { Segment } from '../entities/segment.entity';
import { Template } from '../entities/template.entity';
import { TemplateVersion } from '../entities/template-version.entity';
import { ContentAiTemplate } from '../entities/content-ai-template.entity';
import { ContentAiService } from '../content-ai/content-ai.service';
import { Conversation, ConversationStatus } from '../entities/conversation.entity';
import { Message, MessageDirection, MessageStatus } from '../entities/message.entity';
import { CalendarService } from '../calendar/calendar.service';
import { CalendarEvent, CalendarEventStatus } from '../entities/calendar-event.entity';
import { TenantLimitsService } from '../tenant-limits/tenant-limits.service';
import { formatInTimeZone } from 'date-fns-tz';
import Redis from 'ioredis';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(CampaignContact)
    private campaignContactRepository: Repository<CampaignContact>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(NumberPool)
    private numberPoolRepository: Repository<NumberPool>,
    @InjectRepository(Segment)
    private segmentRepository: Repository<Segment>,
    @InjectRepository(Template)
    private templateRepository: Repository<Template>,
    @InjectRepository(TemplateVersion)
    private templateVersionRepository: Repository<TemplateVersion>,
    @InjectRepository(ContentAiTemplate)
    private contentAiTemplateRepository: Repository<ContentAiTemplate>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @Inject('REDIS_CLIENT')
    private redis: Redis,
    private twilioService: TwilioService,
    private contentAiService: ContentAiService,
    private calendarService: CalendarService,
    private tenantLimitsService: TenantLimitsService,
  ) {}

  async create(tenantId: string, data: Partial<Campaign> & { 
    segmentId?: string;
    contactIds?: string[];
    speed?: number; // Legacy support - convert to speedConfig
    audienceType?: 'all' | 'segment' | 'csv';
    aiTemplateId?: string;
    templateId?: string;
    contentAiTemplateId?: string;
  }): Promise<Campaign> {
    // Extract non-Campaign fields
    const { segmentId, contactIds, speed, audienceType, aiTemplateId, templateId, contentAiTemplateId, ...campaignData } = data;
    
    // Set aiEnabled if aiTemplateId is provided or if campaign type is CONVERSATIONAL
    const finalCampaignData: any = {
      ...campaignData,
      tenantId,
      status: CampaignStatus.DRAFT,
    };
    
    // For CONVERSATIONAL campaigns, always set aiEnabled if aiTemplateId is provided
    if (aiTemplateId) {
      finalCampaignData.aiEnabled = true;
      finalCampaignData.aiTemplateId = aiTemplateId;
    } else if (finalCampaignData.type === 'CONVERSATIONAL') {
      // CONVERSATIONAL campaigns require AI, but if no template provided, keep aiEnabled from form data
      // This allows validation to catch missing templates during launch
      finalCampaignData.aiEnabled = finalCampaignData.aiEnabled || false;
    }
    
    // Add templateId if provided (for OUTBOUND campaigns)
    if (templateId) {
      finalCampaignData.templateId = templateId;
    }
    
    // Add contentAiTemplateId if provided (for Content AI message generation)
    if (contentAiTemplateId) {
      finalCampaignData.contentAiTemplateId = contentAiTemplateId;
    }
    
    // Convert speed to speedConfig if provided
    if (speed && !finalCampaignData.speedConfig) {
      finalCampaignData.speedConfig = {
        messagesPerMinute: speed,
      };
    }
    
    const campaign = this.campaignRepository.create(finalCampaignData);
    const savedCampaign = await this.campaignRepository.save(campaign) as unknown as Campaign;
    
    // Add contacts based on segment or provided contact IDs
    if (segmentId) {
      await this.addContactsFromSegment(tenantId, savedCampaign.id, segmentId);
    } else if (contactIds && contactIds.length > 0) {
      await this.addContacts(tenantId, savedCampaign.id, contactIds);
    } else if (audienceType === 'all') {
      // Add all contacts if "all" audience type
      await this.addAllContacts(tenantId, savedCampaign.id);
    }
    
    return savedCampaign;
  }

  async findAll(tenantId: string): Promise<Campaign[]> {
    const campaigns = await this.campaignRepository.find({
      where: { tenantId },
      relations: ['numberPool'],
      order: { createdAt: 'DESC' },
    });

    // Add statistics to each campaign
    return Promise.all(
      campaigns.map(async (campaign) => {
        const stats = await this.getCampaignStats(tenantId, campaign.id);
        return {
          ...campaign,
          messageCount: stats.sentCount,
          deliveredCount: stats.deliveredCount,
          failedCount: stats.failedCount,
          pendingCount: stats.pendingCount,
          totalContacts: stats.totalContacts,
        } as any;
      })
    );
  }

  async findOne(tenantId: string, id: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id, tenantId },
      relations: ['numberPool'],
    });

    if (!campaign) {
      return null;
    }

    // Add statistics
    const stats = await this.getCampaignStats(tenantId, campaign.id);
    return {
      ...campaign,
      messageCount: stats.sentCount,
      deliveredCount: stats.deliveredCount,
      failedCount: stats.failedCount,
      pendingCount: stats.pendingCount,
      totalContacts: stats.totalContacts,
    } as any;
  }

  private async getCampaignStats(tenantId: string, campaignId: string): Promise<{
    sentCount: number;
    deliveredCount: number;
    failedCount: number;
    pendingCount: number;
    totalContacts: number;
  }> {
    const [sentOnlyCount, deliveredCount, failedCount, pendingCount, totalContacts] = await Promise.all([
      this.campaignContactRepository.count({
        where: { campaignId, tenantId, status: CampaignContactStatus.SENT },
      }),
      this.campaignContactRepository.count({
        where: { campaignId, tenantId, status: CampaignContactStatus.DELIVERED },
      }),
      this.campaignContactRepository.count({
        where: { campaignId, tenantId, status: CampaignContactStatus.FAILED },
      }),
      this.campaignContactRepository.count({
        where: { campaignId, tenantId, status: CampaignContactStatus.PENDING },
      }),
      this.campaignContactRepository.count({
        where: { campaignId, tenantId },
      }),
    ]);

    // Sent count includes both SENT and DELIVERED (delivered messages were also sent)
    const sentCount = sentOnlyCount + deliveredCount;

    return {
      sentCount,
      deliveredCount,
      failedCount,
      pendingCount,
      totalContacts,
    };
  }

  async launch(tenantId: string, id: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id, tenantId },
      relations: ['numberPool'],
    });
    
    if (!campaign) {
      throw new BadRequestException('Campaign not found');
    }

    console.log(`[Campaign Launch] Campaign ${id}: type=${campaign.type}, messageContent=${campaign.messageContent ? 'present' : 'missing'}, templateId=${campaign.templateId || 'missing'}, contentAiTemplateId=${campaign.contentAiTemplateId || 'missing'}, aiTemplateId=${campaign.aiTemplateId || 'missing'}`);

    // Check if campaign has contacts
    const contactCount = await this.campaignContactRepository.count({
      where: { campaignId: campaign.id, tenantId },
    });
    
    if (contactCount === 0) {
      throw new BadRequestException('Campaign must have at least one contact before launching');
    }

    // For OUTBOUND campaigns, message content, template, or Content AI template is required
    // For CONVERSATIONAL campaigns, AI template is used instead
    if (campaign.type === 'OUTBOUND') {
      const hasMessageContent = campaign.messageContent && campaign.messageContent.trim().length > 0;
      const hasTemplateId = campaign.templateId && campaign.templateId.trim().length > 0;
      const hasContentAiTemplateId = campaign.contentAiTemplateId && campaign.contentAiTemplateId.trim().length > 0;
      
      console.log(`[Campaign Launch] OUTBOUND validation: hasMessageContent=${hasMessageContent}, hasTemplateId=${hasTemplateId}, hasContentAiTemplateId=${hasContentAiTemplateId}`);
      
      if (!hasMessageContent && !hasTemplateId && !hasContentAiTemplateId) {
        throw new BadRequestException(
          'OUTBOUND campaigns require either message content, a template, or a Content AI template. ' +
          'Please add message content or select a template before launching.'
        );
      }
    }
    
    // For CONVERSATIONAL campaigns, AI template is required
    if (campaign.type === 'CONVERSATIONAL' && !campaign.aiTemplateId) {
      throw new BadRequestException(
        'CONVERSATIONAL campaigns require an AI Messenger template. ' +
        'Please select an AI Messenger template before launching.'
      );
    }

    campaign.status = CampaignStatus.RUNNING;
    campaign.startedAt = new Date();
    await this.campaignRepository.save(campaign);

    // Process campaign contacts and send SMS (with speed limiting)
    await this.processCampaignContacts(tenantId, campaign);

    return campaign;
  }

  private async processCampaignContacts(tenantId: string, campaign: Campaign): Promise<void> {
    // Get all pending campaign contacts
    const campaignContacts = await this.campaignContactRepository.find({
      where: {
        campaignId: campaign.id,
        tenantId,
        status: CampaignContactStatus.PENDING,
      },
      relations: ['contact'],
    });

    if (campaignContacts.length === 0) {
      console.log(`[Campaign ${campaign.id}] No pending contacts to process`);
      return;
    }

    console.log(`[Campaign ${campaign.id}] Processing ${campaignContacts.length} contacts`);

    // Get number pool if specified
    let numberPool: NumberPool | null = null;
    if (campaign.numberPoolId) {
      numberPool = await this.numberPoolRepository.findOne({
        where: { id: campaign.numberPoolId, tenantId },
        relations: ['numbers'],
      });
    }

    // Calculate delay between messages based on speedConfig
    const speedConfig = campaign.speedConfig || {};
    const messagesPerMinute = speedConfig.messagesPerMinute || 10;
    const messagesPerHour = speedConfig.messagesPerHour;
    const messagesPerDay = speedConfig.messagesPerDay;
    
    // Calculate delay in milliseconds
    // Default: messagesPerMinute (e.g., 10 msg/min = 6000ms delay)
    let delayMs = 60000 / messagesPerMinute; // milliseconds between messages
    
    // If hourly limit exists, ensure we don't exceed it
    if (messagesPerHour) {
      const hourlyDelay = 3600000 / messagesPerHour; // milliseconds per message for hourly limit
      delayMs = Math.max(delayMs, hourlyDelay);
    }
    
    // If daily limit exists, ensure we don't exceed it
    if (messagesPerDay) {
      const dailyDelay = 86400000 / messagesPerDay; // milliseconds per message for daily limit
      delayMs = Math.max(delayMs, dailyDelay);
    }

    // Process each contact with rate limiting
    for (let i = 0; i < campaignContacts.length; i++) {
      const campaignContact = campaignContacts[i];
      
      if (!campaignContact.contact) {
        continue;
      }

      const contact = campaignContact.contact;

      // Check if contact is opted out
      if (contact.isOptedOut) {
        campaignContact.status = CampaignContactStatus.FAILED;
        campaignContact.errorMessage = 'Contact has opted out';
        await this.campaignContactRepository.save(campaignContact);
        continue;
      }

      // Prepare message with variable replacement
      let finalMessage = campaign.messageContent || '';
      
      // Check for Content AI template first (takes highest precedence)
      if (campaign.type === 'OUTBOUND' && campaign.contentAiTemplateId) {
        try {
          const contentAiTemplate = await this.contentAiTemplateRepository.findOne({
            where: { id: campaign.contentAiTemplateId, tenantId, isActive: true },
          });

          if (contentAiTemplate) {
            if (contentAiTemplate.unique) {
              // Generate unique message for this contact
              finalMessage = await this.contentAiService.generateUniqueMessage(
                tenantId,
                campaign.contentAiTemplateId,
                {
                  contact: {
                    firstName: contact.firstName,
                    lastName: contact.lastName,
                    phoneNumber: contact.phoneNumber,
                    email: contact.email,
                    leadStatus: contact.leadStatus,
                    attributes: contact.attributes,
                  },
                },
              );
              console.log(`[Campaign ${campaign.id}] Generated unique Content AI message for contact ${contact.phoneNumber}`);
            } else {
              // Use random variation from generated variations
              finalMessage = await this.contentAiService.getRandomVariation(tenantId, campaign.contentAiTemplateId);
              console.log(`[Campaign ${campaign.id}] Using Content AI variation for contact ${contact.phoneNumber}`);
            }
          }
        } catch (error) {
          // Fall back to regular template or messageContent if Content AI fails
          console.error(`[Campaign ${campaign.id}] Content AI generation failed:`, error);
        }
      }
      
      // Load template if specified (for OUTBOUND campaigns) and Content AI wasn't used
      // Template takes precedence over messageContent if both are provided
      if (campaign.type === 'OUTBOUND' && campaign.templateId && !finalMessage) {
        const template = await this.templateRepository.findOne({
          where: { id: campaign.templateId, tenantId },
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
          console.log(`[Campaign ${campaign.id}] Using template "${template.name}" for contact ${contact.phoneNumber}`);
        } else {
          console.warn(`[Campaign ${campaign.id}] Template ${campaign.templateId} not found or has no versions, using messageContent`);
        }
      }
      
      // For conversational campaigns, use AI template if available
      if (campaign.type === 'CONVERSATIONAL' && !finalMessage) {
        // Conversational campaigns don't send initial message, they wait for incoming messages
        // Mark as pending and let the conversational AI handle it
        campaignContact.status = CampaignContactStatus.PENDING;
        await this.campaignContactRepository.save(campaignContact);
        continue;
      }
      
      if (!finalMessage) {
        console.error(`[Campaign ${campaign.id}] No message content or template found for contact ${contact.phoneNumber}`);
        campaignContact.status = CampaignContactStatus.FAILED;
        campaignContact.errorMessage = 'No message content or template available';
        await this.campaignContactRepository.save(campaignContact);
        continue;
      }
      
      // Get base URL for app (used in variables)
      // Always use app.nurtureengine.net for SMS messages (never use localhost)
      const appBaseUrl = 'https://app.nurtureengine.net';
      
      // Get appointment info for contact
      const appointmentInfo = await this.getAppointmentInfo(tenantId, contact.id);
      
      const variableMap: Record<string, string> = {
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        phoneNumber: contact.phoneNumber || '',
        email: contact.email || '',
        fullName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Contact',
        leadStatus: contact.leadStatus || '',
        appointmentTime: appointmentInfo.time || '',
        appointmentDate: appointmentInfo.date || '',
        appointmentDateTime: appointmentInfo.dateTime || '',
        appUrl: appBaseUrl,
        baseUrl: appBaseUrl,
      };

      // Replace standard variables
      Object.entries(variableMap).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
        finalMessage = finalMessage.replace(regex, String(value || ''));
      });

      // Replace custom attributes
      if (contact.attributes) {
        Object.entries(contact.attributes).forEach(([key, value]) => {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
          finalMessage = finalMessage.replace(regex, String(value || ''));
        });
      }

      // Select number from pool or use default
      let fromNumberId: string | undefined;
      if (numberPool && numberPool.numbers && numberPool.numbers.length > 0) {
        // Round-robin selection
        const activeNumbers = numberPool.numbers.filter((n) => {
          if (n.maxMessagesPerDay) {
            const today = new Date().toDateString();
            const lastReset = n.lastResetDate?.toDateString();
            if (lastReset !== today) {
              n.messagesSentToday = 0;
              n.lastResetDate = new Date();
            }
            if (n.messagesSentToday >= n.maxMessagesPerDay) {
              return false;
            }
          }
          return true;
        });

        if (activeNumbers.length > 0) {
          const index = parseInt(contact.id.replace(/-/g, ''), 16) % activeNumbers.length;
          fromNumberId = activeNumbers[index].id;
        }
      }

      // Send SMS with rate limiting
      try {
        console.log(`[Campaign ${campaign.id}] Sending SMS to ${contact.phoneNumber}: ${finalMessage.substring(0, 50)}...`);
        const result = await this.twilioService.sendSMS(
          tenantId,
          contact.phoneNumber,
          finalMessage,
          fromNumberId,
        );

        campaignContact.status = CampaignContactStatus.SENT;
        campaignContact.sentAt = new Date();
        campaignContact.twilioMessageSid = result?.sid || null;
        campaignContact.errorMessage = null;
        await this.campaignContactRepository.save(campaignContact);
        
        // Find or create conversation for this contact
        let conversation = await this.conversationRepository.findOne({
          where: { contactId: contact.id, tenantId },
          order: { createdAt: 'DESC' },
        });
        
        if (!conversation || conversation.status === ConversationStatus.CLOSED) {
          conversation = this.conversationRepository.create({
            tenantId,
            contactId: contact.id,
            status: ConversationStatus.OPEN,
            lastMessageAt: new Date(),
          });
          conversation = await this.conversationRepository.save(conversation);
        } else {
          conversation.lastMessageAt = new Date();
          conversation.status = ConversationStatus.OPEN;
          await this.conversationRepository.save(conversation);
        }
        
        // Create Message record for tracking
        const message = this.messageRepository.create({
          tenantId,
          conversationId: conversation.id,
          direction: MessageDirection.OUTBOUND,
          body: finalMessage,
          twilioMessageSid: result?.sid || null,
          status: MessageStatus.SENT,
          sentAt: new Date(),
        });
        await this.messageRepository.save(message);
        
        // Increment SMS usage count
        if (result?.sid) {
          try {
            await this.tenantLimitsService.incrementSMSUsage(tenantId, 1);
          } catch (error) {
            console.error(`[Campaign ${campaign.id}] Failed to increment SMS usage:`, error);
          }
        }
        
        console.log(`[Campaign ${campaign.id}] ✅ Successfully sent SMS to ${contact.phoneNumber} (SID: ${result?.sid || 'N/A'})`);
      } catch (error: any) {
        campaignContact.status = CampaignContactStatus.FAILED;
        campaignContact.errorMessage = error?.message || 'Failed to send SMS';
        await this.campaignContactRepository.save(campaignContact);
        console.error(`[Campaign ${campaign.id}] ❌ Failed to send SMS to ${contact.phoneNumber}:`, error?.message || error);
      }
      
      // Rate limiting: wait before sending next message (except for last one)
      if (i < campaignContacts.length - 1 && delayMs > 0) {
        console.log(`[Campaign ${campaign.id}] Waiting ${delayMs}ms before next message...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    // Check if all contacts have been processed (for OUTBOUND campaigns)
    // CONVERSATIONAL campaigns stay running until manually stopped
    if (campaign.type === CampaignType.OUTBOUND) {
      await this.checkAndCompleteCampaign(tenantId, campaign.id);
    }

    // Log summary
    const stats = await this.getCampaignStats(tenantId, campaign.id);
    console.log(`[Campaign ${campaign.id}] ✅ Campaign processing summary: ${stats.sentCount} sent, ${stats.deliveredCount} delivered, ${stats.failedCount} failed, ${stats.pendingCount} pending`);
  }

  private async checkAndCompleteCampaign(tenantId: string, campaignId: string): Promise<void> {
    try {
      const campaign = await this.campaignRepository.findOne({
        where: { id: campaignId, tenantId },
      });

      if (!campaign || campaign.status !== CampaignStatus.RUNNING) {
        return;
      }

      // Only auto-complete OUTBOUND campaigns
      // CONVERSATIONAL campaigns stay running until manually stopped
      if (campaign.type !== CampaignType.OUTBOUND) {
        return;
      }

      // Count contacts in final states (SENT, DELIVERED, FAILED, BOUNCED)
      // vs pending contacts
      const [pendingCount, finalStateCount, totalCount] = await Promise.all([
        this.campaignContactRepository.count({
          where: {
            campaignId,
            tenantId,
            status: CampaignContactStatus.PENDING,
          },
        }),
        this.campaignContactRepository.count({
          where: {
            campaignId,
            tenantId,
            status: In([
              CampaignContactStatus.SENT,
              CampaignContactStatus.DELIVERED,
              CampaignContactStatus.FAILED,
              CampaignContactStatus.BOUNCED,
            ]),
          },
        }),
        this.campaignContactRepository.count({
          where: { campaignId, tenantId },
        }),
      ]);

      // If no pending contacts and all contacts are in final states, mark as completed
      if (pendingCount === 0 && finalStateCount === totalCount && totalCount > 0) {
        campaign.status = CampaignStatus.COMPLETED;
        campaign.completedAt = new Date();
        await this.campaignRepository.save(campaign);
        console.log(`[Campaign ${campaignId}] ✅ Campaign marked as COMPLETED: all ${totalCount} contacts processed (${finalStateCount} in final state)`);
      }
    } catch (error: any) {
      console.error(`[Campaign ${campaignId}] Error checking campaign completion:`, error.message);
    }
  }

  async pause(tenantId: string, id: string): Promise<Campaign> {
    const campaign = await this.findOne(tenantId, id);
    if (!campaign) {
      throw new BadRequestException('Campaign not found');
    }

    campaign.status = CampaignStatus.PAUSED;
    await this.campaignRepository.save(campaign);

    return campaign;
  }

  async update(tenantId: string, id: string, data: Partial<Campaign>): Promise<Campaign> {
    const campaign = await this.findOne(tenantId, id);
    if (!campaign) {
      throw new BadRequestException('Campaign not found');
    }

    // Only allow editing if campaign is in DRAFT status
    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Can only edit campaigns in DRAFT status');
    }

    Object.assign(campaign, data);
    await this.campaignRepository.save(campaign);

    return this.findOne(tenantId, id);
  }

  async addContacts(
    tenantId: string,
    campaignId: string,
    contactIds: string[],
  ): Promise<void> {
    const campaign = await this.findOne(tenantId, campaignId);
    if (!campaign) {
      throw new BadRequestException('Campaign not found');
    }

    for (const contactId of contactIds) {
      const existing = await this.campaignContactRepository.findOne({
        where: { campaignId, contactId, tenantId },
      });

      if (!existing) {
        const campaignContact = this.campaignContactRepository.create({
          campaignId,
          contactId,
          tenantId,
          status: CampaignContactStatus.PENDING,
        });
        await this.campaignContactRepository.save(campaignContact);
      }
    }
  }

  private async addContactsFromSegment(
    tenantId: string,
    campaignId: string,
    segmentId: string,
  ): Promise<void> {
    const segment = await this.segmentRepository.findOne({
      where: { id: segmentId, tenantId },
      relations: ['contacts'],
    });

    if (!segment) {
      throw new BadRequestException('Segment not found');
    }

    if (!segment.contacts || segment.contacts.length === 0) {
      return;
    }

    const contactIds = segment.contacts.map((c) => c.id);
    await this.addContacts(tenantId, campaignId, contactIds);
  }

  private async addAllContacts(tenantId: string, campaignId: string): Promise<void> {
    const contacts = await this.contactRepository.find({
      where: { tenantId },
      select: ['id'],
    });

    if (contacts.length === 0) {
      return;
    }

    const contactIds = contacts.map((c) => c.id);
    await this.addContacts(tenantId, campaignId, contactIds);
  }

  async importContactsFromCsv(
    tenantId: string,
    campaignId: string,
    csvContacts: Array<{ phone: string; firstName?: string; lastName?: string; email?: string }>,
  ): Promise<{ success: number; failed: number; duplicates: number }> {
    const campaign = await this.findOne(tenantId, campaignId);
    if (!campaign) {
      throw new BadRequestException('Campaign not found');
    }

    let success = 0;
    let failed = 0;
    let duplicates = 0;

    // Batch processing: collect phone numbers and find existing contacts in bulk
    const phoneNumbers = csvContacts.map(c => c.phone);
    const existingContacts = await this.contactRepository.find({
      where: { phoneNumber: In(phoneNumbers), tenantId },
    });
    const existingContactsMap = new Map(existingContacts.map(c => [c.phoneNumber, c]));

    // Check for existing campaign contacts in bulk
    const existingContactIds = existingContacts.map(c => c.id);
    const existingCampaignContacts = existingContactIds.length > 0
      ? await this.campaignContactRepository.find({
          where: { campaignId, contactId: In(existingContactIds), tenantId },
        })
      : [];
    const existingCampaignContactsSet = new Set(existingCampaignContacts.map(cc => cc.contactId));

    // Prepare bulk inserts
    const contactsToCreate: any[] = [];
    const campaignContactsToCreate: any[] = [];
    const contactsToUpdate: any[] = [];

    for (const csvContact of csvContacts) {
      try {
        let contact = existingContactsMap.get(csvContact.phone);

        if (!contact) {
          // Prepare for bulk create
          contactsToCreate.push({
            phoneNumber: csvContact.phone,
            firstName: csvContact.firstName || '',
            lastName: csvContact.lastName || '',
            email: csvContact.email || '',
            tenantId,
          });
        } else {
          // Update existing contact if needed
          const needsUpdate = 
            (csvContact.firstName && contact.firstName !== csvContact.firstName) ||
            (csvContact.lastName && contact.lastName !== csvContact.lastName) ||
            (csvContact.email && contact.email !== csvContact.email);
          
          if (needsUpdate) {
            if (csvContact.firstName) contact.firstName = csvContact.firstName;
            if (csvContact.lastName) contact.lastName = csvContact.lastName;
            if (csvContact.email) contact.email = csvContact.email;
            contactsToUpdate.push(contact);
          }

          // Check if already in campaign
          if (existingCampaignContactsSet.has(contact.id)) {
            duplicates++;
            continue;
          }

          // Prepare campaign contact for bulk create
          campaignContactsToCreate.push({
            campaignId,
            contactId: contact.id,
            tenantId,
            status: CampaignContactStatus.PENDING,
          });
          success++;
        }
      } catch (error) {
        console.error(`Failed to process contact ${csvContact.phone}:`, error);
        failed++;
      }
    }

    // Bulk create contacts
    if (contactsToCreate.length > 0) {
      // TypeORM save() can handle plain objects directly
      const createdContacts = await this.contactRepository.save(contactsToCreate as Partial<Contact>[]);
      
      // Map created contacts by phone number for campaign contact creation
      const createdContactsMap = new Map(createdContacts.map(c => [c.phoneNumber, c]));
      
      // Add campaign contacts for newly created contacts
      for (const csvContact of csvContacts) {
        const contact = createdContactsMap.get(csvContact.phone);
        if (contact && !existingCampaignContactsSet.has(contact.id)) {
          campaignContactsToCreate.push({
            campaignId,
            contactId: contact.id,
            tenantId,
            status: CampaignContactStatus.PENDING,
          });
          success++;
        }
      }
    }

    // Bulk update contacts
    if (contactsToUpdate.length > 0) {
      await this.contactRepository.save(contactsToUpdate);
    }

    // Bulk create campaign contacts
    if (campaignContactsToCreate.length > 0) {
      // TypeORM save() can handle plain objects directly
      await this.campaignContactRepository.save(campaignContactsToCreate as Partial<CampaignContact>[]);
    }

    return { success, failed, duplicates };
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
      // Get next upcoming scheduled event for this contact
      const now = new Date();
      const events = await this.calendarService.getEvents({
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
      console.warn(`Failed to get appointment info for contact ${contactId}: ${error.message}`);
      return { time: '', date: '', dateTime: '' };
    }
  }
}

