import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TwilioService } from '../twilio/twilio.service';
import { AiGenerationService } from '../ai/ai-generation.service';
import { AiTemplatesService } from '../ai-templates/ai-templates.service';
import { AiEventCreationService } from '../ai/ai-event-creation.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TenantLimitsService } from '../tenant-limits/tenant-limits.service';
import { NotificationType } from '../entities/notification.entity';
import { Contact, LeadStatus } from '../entities/contact.entity';
import { Conversation, ConversationStatus } from '../entities/conversation.entity';
import { Message, MessageDirection, MessageStatus } from '../entities/message.entity';
import { TwilioNumber } from '../entities/twilio-number.entity';
import { Campaign, CampaignType, CampaignStatus } from '../entities/campaign.entity';
import { CampaignContact, CampaignContactStatus } from '../entities/campaign-contact.entity';
import { JourneyContact } from '../entities/journey-contact.entity';
import { UserTenant } from '../entities/user-tenant.entity';

@Injectable()
export class TwilioWebhooksService {
  private readonly logger = new Logger(TwilioWebhooksService.name);

  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(TwilioNumber)
    private twilioNumberRepository: Repository<TwilioNumber>,
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(CampaignContact)
    private campaignContactRepository: Repository<CampaignContact>,
    @InjectRepository(JourneyContact)
    private journeyContactRepository: Repository<JourneyContact>,
    @InjectRepository(UserTenant)
    private userTenantRepository: Repository<UserTenant>,
    private readonly twilioService: TwilioService,
    private readonly aiGenerationService: AiGenerationService,
    private readonly aiTemplatesService: AiTemplatesService,
    private readonly aiEventCreationService: AiEventCreationService,
    private readonly notificationsService: NotificationsService,
    private readonly tenantLimitsService: TenantLimitsService,
  ) {}

  async handleInboundMessage(body: any) {
    try {
      this.logger.log(`Inbound message from ${body.From} to ${body.To}`);

      const toPhoneNumber = body.To;
      const fromPhoneNumber = body.From;
      const messageBody = body.Body;
      const messageSid = body.MessageSid;

      // Find tenant by phone number (TwilioNumber)
      const twilioNumber = await this.twilioNumberRepository.findOne({
        where: { phoneNumber: toPhoneNumber },
      });

      if (!twilioNumber) {
        this.logger.warn(`No TwilioNumber found for ${toPhoneNumber}`);
        return { status: 'ok' }; // Return ok to Twilio even if we can't process
      }

      const tenantId = twilioNumber.tenantId;

      // Find or create contact
      let contact = await this.contactRepository.findOne({
        where: { phoneNumber: fromPhoneNumber, tenantId },
      });

      if (!contact) {
        contact = this.contactRepository.create({
          tenantId,
          phoneNumber: fromPhoneNumber,
          hasConsent: true,
        });
        contact = await this.contactRepository.save(contact);
        this.logger.log(`Created new contact: ${contact.id}`);
      }

      // Check for STOP/UNSUBSCRIBE keywords
      const messageText = (messageBody || '').toUpperCase().trim();
      if (messageText === 'STOP' || messageText === 'UNSUBSCRIBE' || messageText === 'STOPALL') {
        contact.isOptedOut = true;
        contact.optedOutAt = new Date();
        await this.contactRepository.save(contact);
        this.logger.log(`Contact ${contact.id} opted out`);
        return { status: 'ok' };
      }

      // Find or create conversation
      let conversation = await this.conversationRepository.findOne({
        where: { contactId: contact.id, tenantId },
        order: { createdAt: 'DESC' },
      });

      // If conversation exists but is closed, create a new one
      if (conversation && conversation.status === ConversationStatus.CLOSED) {
        conversation = null;
      }

      if (!conversation) {
        conversation = this.conversationRepository.create({
          tenantId,
          contactId: contact.id,
          status: ConversationStatus.OPEN,
          lastMessageAt: new Date(),
        });
        conversation = await this.conversationRepository.save(conversation);
        this.logger.log(`Created new conversation: ${conversation.id}`);
      } else {
        // Update last message time
        conversation.lastMessageAt = new Date();
        conversation.status = ConversationStatus.OPEN; // Reopen if closed
        await this.conversationRepository.save(conversation);
      }

      // Save message
      const message = this.messageRepository.create({
        tenantId,
        conversationId: conversation.id,
        direction: MessageDirection.INBOUND,
        body: messageBody,
        twilioMessageSid: messageSid,
        status: MessageStatus.DELIVERED,
        sentAt: new Date(),
      });
      await this.messageRepository.save(message);
      this.logger.log(`Saved inbound message: ${message.id}`);

      // Update contact status to CONTACT_MADE when they reply to a text message
      if (contact.leadStatus !== LeadStatus.SOLD && contact.leadStatus !== LeadStatus.CONTACT_MADE) {
        contact.leadStatus = LeadStatus.CONTACT_MADE;
        await this.contactRepository.save(contact);
        this.logger.log(`[TwilioWebhook] Updated contact ${contact.id} status to CONTACT_MADE (phone: ${fromPhoneNumber}) - replied to message`);
      }

      // Create notifications for SMS replies
      await this.createReplyNotifications(tenantId, conversation, contact, message, messageBody);

      // Trigger AI reply if configured
      await this.handleAiReply(tenantId, conversation, contact, messageBody);

      return { status: 'ok' };
    } catch (error) {
      this.logger.error(`Error handling inbound message: ${error.message}`, error.stack);
      return { status: 'ok' }; // Always return ok to Twilio to prevent retries
    }
  }

  async handleStatusUpdate(body: any) {
    try {
      this.logger.log(`Status update for message ${body.MessageSid}: ${body.MessageStatus}`);

      const messageSid = body.MessageSid;
      const status = body.MessageStatus;
      const errorCode = body.ErrorCode;

      // Find message by Twilio SID
      const message = await this.messageRepository.findOne({
        where: { twilioMessageSid: messageSid },
        relations: ['conversation'],
      });

      if (message) {
        // Map Twilio status to our MessageStatus enum
        let messageStatus: MessageStatus = MessageStatus.SENT;
        if (status === 'delivered') {
          messageStatus = MessageStatus.DELIVERED;
        } else if (status === 'failed' || status === 'undelivered') {
          messageStatus = MessageStatus.FAILED;
        } else if (status === 'read') {
          messageStatus = MessageStatus.READ;
        }

        message.status = messageStatus;
        await this.messageRepository.save(message);
        this.logger.log(`Updated message ${message.id} status to ${messageStatus}`);

        // If this is an outbound message, update campaign contact status
        if (message.direction === MessageDirection.OUTBOUND && message.conversation) {
          // Try to find campaign contact by message SID first
          let campaignContact = await this.campaignContactRepository.findOne({
            where: {
              tenantId: message.tenantId,
              twilioMessageSid: messageSid,
            },
            relations: ['campaign'],
          });

          // If not found by SID, try to find by contact ID and most recent campaign
          if (!campaignContact) {
            campaignContact = await this.campaignContactRepository.findOne({
              where: {
                contactId: message.conversation.contactId,
                tenantId: message.tenantId,
              },
              relations: ['campaign'],
              order: { createdAt: 'DESC' },
            });
          }

          if (campaignContact) {
            // Update campaign contact status based on message status
            if (status === 'delivered') {
              campaignContact.status = CampaignContactStatus.DELIVERED;
              campaignContact.deliveredAt = new Date();
              // Update message SID if not already set
              if (!campaignContact.twilioMessageSid) {
                campaignContact.twilioMessageSid = messageSid;
              }
            } else if (status === 'failed' || status === 'undelivered') {
              campaignContact.status = CampaignContactStatus.FAILED;
              campaignContact.errorMessage = errorCode ? `Twilio error: ${errorCode}` : 'Message delivery failed';
              // Update message SID if not already set
              if (!campaignContact.twilioMessageSid) {
                campaignContact.twilioMessageSid = messageSid;
              }
            }

            await this.campaignContactRepository.save(campaignContact);
            this.logger.log(`Updated campaign contact ${campaignContact.id} status to ${campaignContact.status} for campaign ${campaignContact.campaignId}`);

            // Check if campaign should be marked as completed
            await this.checkAndCompleteCampaign(message.tenantId, campaignContact.campaignId);
          } else {
            this.logger.debug(`No campaign contact found for message SID ${messageSid} or contact ${message.conversation.contactId}`);
          }
        }
      } else {
        this.logger.warn(`Message not found for SID: ${messageSid}`);
      }

      return { status: 'ok' };
    } catch (error) {
      this.logger.error(`Error handling status update: ${error.message}`, error.stack);
      return { status: 'ok' };
    }
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

      // Count pending contacts
      const pendingCount = await this.campaignContactRepository.count({
        where: {
          campaignId,
          tenantId,
          status: CampaignContactStatus.PENDING,
        },
      });

      // If no pending contacts and campaign has contacts, mark as completed
      if (pendingCount === 0) {
        const totalCount = await this.campaignContactRepository.count({
          where: { campaignId, tenantId },
        });

        if (totalCount > 0) {
          campaign.status = CampaignStatus.COMPLETED;
          campaign.completedAt = new Date();
          await this.campaignRepository.save(campaign);
          this.logger.log(`Campaign ${campaignId} marked as COMPLETED: all ${totalCount} contacts processed`);
        }
      }
    } catch (error) {
      this.logger.error(`Error checking campaign completion: ${error.message}`, error.stack);
    }
  }

  private async handleAiReply(
    tenantId: string,
    conversation: Conversation,
    contact: Contact,
    incomingMessage: string,
  ): Promise<void> {
    try {
      this.logger.log(`[AI Reply] Processing AI reply for contact ${contact.id} (${contact.phoneNumber})`);
      
      // First, check if contact is already enrolled in a campaign
      let campaignContact = await this.campaignContactRepository.findOne({
        where: { contactId: contact.id, tenantId },
        relations: ['campaign'],
        order: { createdAt: 'DESC' },
      });

      let campaign: Campaign | null = null;
      let aiTemplateId: string | null = null;

      // If contact is already enrolled, use that campaign
      if (campaignContact && campaignContact.campaign) {
        campaign = campaignContact.campaign;
        this.logger.log(`[AI Reply] Found existing campaign contact for campaign ${campaign.id} (type: ${campaign.type})`);
      } else {
        // For CONVERSATIONAL campaigns, auto-enroll contacts when they send their first message
        // Find all running CONVERSATIONAL campaigns with AI enabled for this tenant
        const conversationalCampaigns = await this.campaignRepository.find({
          where: {
            tenantId,
            type: CampaignType.CONVERSATIONAL,
            status: CampaignStatus.RUNNING,
            aiEnabled: true,
          },
        });

        this.logger.log(`[AI Reply] Found ${conversationalCampaigns.length} running CONVERSATIONAL campaigns with AI enabled`);

        // Find the first campaign with an AI template that matches
        for (const convCampaign of conversationalCampaigns) {
          if (convCampaign.aiTemplateId) {
            // Check if contact is already enrolled in this campaign
            const existingEnrollment = await this.campaignContactRepository.findOne({
              where: {
                campaignId: convCampaign.id,
                contactId: contact.id,
                tenantId,
              },
            });

            if (!existingEnrollment) {
              // Auto-enroll contact in this CONVERSATIONAL campaign
              campaignContact = this.campaignContactRepository.create({
                tenantId,
                campaignId: convCampaign.id,
                contactId: contact.id,
                status: CampaignContactStatus.PENDING, // PENDING for CONVERSATIONAL campaigns
              });
              campaignContact = await this.campaignContactRepository.save(campaignContact);
              this.logger.log(`[AI Reply] Auto-enrolled contact ${contact.id} in CONVERSATIONAL campaign ${convCampaign.id}`);
            } else {
              campaignContact = existingEnrollment;
            }

            campaign = convCampaign;
            break; // Use the first matching campaign
          }
        }
      }

      // Check if we have a valid campaign with AI enabled
      if (campaign && campaign.aiEnabled && campaign.aiTemplateId) {
        // Check if campaign is running
        if (campaign.status === CampaignStatus.RUNNING) {
          aiTemplateId = campaign.aiTemplateId;
          this.logger.log(`[AI Reply] Using AI template ${aiTemplateId} from campaign ${campaign.id} (type: ${campaign.type})`);
        } else {
          this.logger.debug(`[AI Reply] Campaign ${campaign.id} is not running (status: ${campaign.status})`);
        }
      } else {
        this.logger.debug(`[AI Reply] No valid AI-enabled campaign found for contact ${contact.id}`);
      }

      // If no campaign found or campaign doesn't have AI, don't send AI reply
      if (!aiTemplateId) {
        this.logger.debug(`[AI Reply] No AI template configured for contact ${contact.id}, skipping AI reply`);
        return;
      }

      // Load AI template
      const aiTemplate = await this.aiTemplatesService.findOne(tenantId, aiTemplateId);
      if (!aiTemplate) {
        this.logger.warn(`[AI Reply] AI template ${aiTemplateId} not found`);
        return;
      }
      
      if (!aiTemplate.isActive) {
        this.logger.warn(`[AI Reply] AI template ${aiTemplateId} is inactive`);
        return;
      }

      this.logger.log(`[AI Reply] Loaded AI template "${aiTemplate.name}" (ID: ${aiTemplateId})`);

      // Get conversation history (last 20 messages for context)
      const conversationMessages = await this.messageRepository.find({
        where: { conversationId: conversation.id, tenantId },
        order: { sentAt: 'ASC' },
        take: 20,
      });

      this.logger.log(`[AI Reply] Found ${conversationMessages.length} messages in conversation history`);

      // Build conversation history for AI
      const history = conversationMessages.map((msg) => ({
        role: msg.direction === MessageDirection.INBOUND ? 'user' as const : 'assistant' as const,
        content: msg.body,
      }));

      // Add the current incoming message if not already in history
      if (history.length === 0 || history[history.length - 1].content !== incomingMessage) {
        history.push({
          role: 'user' as const,
          content: incomingMessage,
        });
      }

      this.logger.log(`[AI Reply] Generating AI reply with ${history.length} messages in history`);

      // Check if message is a scheduling request (e.g., "call me in 5 mins")
      const schedulingKeywords = ['call me', 'schedule', 'book', 'appointment', 'meeting', 'call', 'in ', 'minutes', 'hours', 'tomorrow'];
      const isSchedulingRequest = schedulingKeywords.some(keyword => 
        incomingMessage.toLowerCase().includes(keyword.toLowerCase())
      );

      if (isSchedulingRequest && aiTemplateId) {
        try {
          const eventResult = await this.aiEventCreationService.parseAndCreateEvent(
            tenantId,
            contact,
            incomingMessage,
            aiTemplateId,
          );

          if (eventResult.success && eventResult.suggestedTime) {
            const timeStr = eventResult.suggestedTime.toLocaleString();
            const aiReply = `Great! I've scheduled ${aiTemplate.name || 'an event'} for ${timeStr}. You'll receive a confirmation shortly.`;
            
            // Send confirmation
            await this.twilioService.sendSMS(tenantId, contact.phoneNumber, aiReply);
            
            // Save confirmation message
            const confirmationMessage = this.messageRepository.create({
              tenantId,
              conversationId: conversation.id,
              direction: MessageDirection.OUTBOUND,
              body: aiReply,
              status: MessageStatus.SENT,
              sentAt: new Date(),
            });
            await this.messageRepository.save(confirmationMessage);
            
            this.logger.log(`[AI Event] Created event ${eventResult.eventId} for contact ${contact.id}`);
            return; // Don't generate regular AI reply
          }
        } catch (error: any) {
          this.logger.error(`[AI Event] Failed to create event: ${error.message}`, error.stack);
          // Continue with regular AI reply if event creation fails
        }
      }

      // Generate AI reply
      let aiReply: string;
      try {
        aiReply = await this.aiGenerationService.generateAiReply(
          aiTemplate.config,
          history,
          {
            firstName: contact.firstName,
            lastName: contact.lastName,
            phoneNumber: contact.phoneNumber,
            email: contact.email,
            leadStatus: contact.leadStatus,
            attributes: contact.attributes,
          },
        );
        this.logger.log(`[AI Reply] Generated reply: ${aiReply.substring(0, 50)}...`);
      } catch (error: any) {
        this.logger.error(`[AI Reply] Failed to generate AI reply: ${error.message}`, error.stack);
        return;
      }

      if (!aiReply || aiReply.trim().length === 0) {
        this.logger.warn(`[AI Reply] Generated empty reply, skipping send`);
        return;
      }

      // Send AI reply via Twilio
      let result: any;
      try {
        result = await this.twilioService.sendSMS(
          tenantId,
          contact.phoneNumber,
          aiReply,
          undefined, // Use default number
        );
        
        // Increment SMS usage count if message was sent successfully
        if (result?.sid) {
          try {
            await this.tenantLimitsService.incrementSMSUsage(tenantId, 1);
          } catch (error) {
            this.logger.error(`Failed to increment SMS usage for AI reply:`, error);
          }
        }
        
        this.logger.log(`[AI Reply] Sent SMS via Twilio (SID: ${result?.sid || 'N/A'})`);
      } catch (error: any) {
        this.logger.error(`[AI Reply] Failed to send SMS via Twilio: ${error.message}`, error.stack);
        return;
      }

      // Save AI reply message
      const replyMessage = this.messageRepository.create({
        tenantId,
        conversationId: conversation.id,
        direction: MessageDirection.OUTBOUND,
        body: aiReply,
        twilioMessageSid: result?.sid || null,
        status: MessageStatus.SENT,
        sentAt: new Date(),
      });
      await this.messageRepository.save(replyMessage);
      this.logger.log(`[AI Reply] Saved AI reply message ${replyMessage.id}`);

      // Update conversation last message time
      conversation.lastMessageAt = new Date();
      await this.conversationRepository.save(conversation);

      // Update campaign contact if exists
      if (campaignContact) {
        campaignContact.status = CampaignContactStatus.PENDING; // Keep as PENDING for CONVERSATIONAL campaigns
        await this.campaignContactRepository.save(campaignContact);
      }

      this.logger.log(`[AI Reply] ✅ Successfully generated and sent AI reply for conversation ${conversation.id}`);
    } catch (error: any) {
      this.logger.error(`[AI Reply] ❌ Failed to handle AI reply: ${error.message}`, error.stack);
      // Don't throw - we don't want to break the webhook handler
    }
  }

  private async createReplyNotifications(
    tenantId: string,
    conversation: Conversation,
    contact: Contact,
    message: Message,
    messageBody: string,
  ): Promise<void> {
    try {
      // Find campaign contact if exists
      const campaignContact = await this.campaignContactRepository.findOne({
        where: { contactId: contact.id, tenantId },
        relations: ['campaign'],
        order: { createdAt: 'DESC' },
      });

      // Find journey contact if exists
      const journeyContact = await this.journeyContactRepository.findOne({
        where: { contactId: contact.id, tenantId },
        relations: ['journey'],
        order: { createdAt: 'DESC' },
      });

      // Get all users in the tenant
      const userTenants = await this.userTenantRepository.find({
        where: { tenantId, isActive: true },
      });

      const contactName = contact.firstName || contact.lastName || contact.phoneNumber;
      const messagePreview = messageBody.length > 50 ? messageBody.substring(0, 50) + '...' : messageBody;

      // Create notifications for each user based on their preferences
      for (const userTenant of userTenants) {
        const userId = userTenant.userId;

        // Check conversation-level preferences
        const conversationPrefs = await this.notificationsService.getPreferences(tenantId, userId, {
          conversationId: conversation.id,
        });
        const globalPrefs = await this.notificationsService.getPreferences(tenantId, userId);

        // Determine notification type and check if should notify
        let notificationType: NotificationType | null = null;
        let shouldNotify = false;

        if (campaignContact?.campaign) {
          const campaignPrefs = await this.notificationsService.getPreferences(tenantId, userId, {
            campaignId: campaignContact.campaign.id,
          });
          shouldNotify = await this.notificationsService.shouldNotify(
            tenantId,
            userId,
            NotificationType.CAMPAIGN_REPLY,
            { campaignId: campaignContact.campaign.id },
          );
          if (shouldNotify) {
            notificationType = NotificationType.CAMPAIGN_REPLY;
          }
        } else if (journeyContact?.journey) {
          shouldNotify = await this.notificationsService.shouldNotify(
            tenantId,
            userId,
            NotificationType.JOURNEY_REPLY,
            { journeyId: journeyContact.journey.id },
          );
          if (shouldNotify) {
            notificationType = NotificationType.JOURNEY_REPLY;
          }
        } else {
          // Check conversation message preferences
          shouldNotify = await this.notificationsService.shouldNotify(
            tenantId,
            userId,
            NotificationType.CONVERSATION_MESSAGE,
            { conversationId: conversation.id },
          );
          if (shouldNotify) {
            notificationType = NotificationType.CONVERSATION_MESSAGE;
          }
        }

        // Fallback to SMS reply preference if no specific preference found
        if (!shouldNotify) {
          shouldNotify = await this.notificationsService.shouldNotify(
            tenantId,
            userId,
            NotificationType.SMS_REPLY,
          );
          if (shouldNotify) {
            notificationType = NotificationType.SMS_REPLY;
          }
        }

        if (shouldNotify && notificationType) {
          await this.notificationsService.createNotification({
            tenantId,
            userId,
            type: notificationType,
            title: `New message from ${contactName}`,
            message: messagePreview,
            metadata: {
              campaignId: campaignContact?.campaign?.id,
              journeyId: journeyContact?.journey?.id,
              contactId: contact.id,
              conversationId: conversation.id,
              messageId: message.id,
            },
          });
        }
      }
    } catch (error: any) {
      this.logger.error(`Error creating reply notifications: ${error.message}`, error.stack);
      // Don't throw - we don't want to break the webhook handler
    }
  }
}

