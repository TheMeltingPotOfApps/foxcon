import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, ConversationStatus } from '../entities/conversation.entity';
import { Message, MessageDirection, MessageStatus, MessageType } from '../entities/message.entity';
import { Contact } from '../entities/contact.entity';
import { TwilioService } from '../twilio/twilio.service';
import { TenantLimitsService } from '../tenant-limits/tenant-limits.service';
import { ImessageService } from '../imessage/imessage.service';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    private twilioService: TwilioService,
    private tenantLimitsService: TenantLimitsService,
    private imessageService: ImessageService,
  ) {}

  async findAll(tenantId: string, filters?: { status?: string; contactId?: string }): Promise<Conversation[]> {
    const where: any = { tenantId };
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.contactId) {
      where.contactId = filters.contactId;
    }

    const conversations = await this.conversationRepository.find({
      where,
      relations: ['contact'],
      order: { lastMessageAt: 'DESC', createdAt: 'DESC' },
    });

    // Get message counts for each conversation
    const conversationsWithCounts = await Promise.all(
      conversations.map(async (conv) => {
        const messageCount = await this.messageRepository.count({
          where: { conversationId: conv.id, tenantId },
        });
        return {
          ...conv,
          messageCount,
        };
      }),
    );

    return conversationsWithCounts;
  }

  async findOne(tenantId: string, id: string): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id, tenantId },
      relations: ['contact', 'messages'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Sort messages by createdAt ascending
    if (conversation.messages) {
      conversation.messages.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }

    return conversation;
  }

  async sendMessage(
    tenantId: string,
    conversationId: string,
    body: string,
    messageType: MessageType = MessageType.SMS,
  ): Promise<Message> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, tenantId },
      relations: ['contact'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const contact = await this.contactRepository.findOne({
      where: { id: conversation.contactId, tenantId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // Check if contact is opted out
    if (contact.isOptedOut) {
      throw new Error('Contact has opted out');
    }

    let twilioMessageSid: string | null = null;
    let imessageId: string | null = null;
    let status = MessageStatus.FAILED;

    // Send via iMessage (Send Blue) or SMS
    if (messageType === MessageType.IMESSAGE) {
      try {
        const result = await this.imessageService.sendToConversation(
          tenantId,
          contact.phoneNumber,
          body,
        );
        imessageId = result?.contact_id || result?.id || null;
        status = imessageId ? MessageStatus.SENT : MessageStatus.FAILED;
      } catch (error) {
        console.error('Failed to send iMessage:', error);
        status = MessageStatus.FAILED;
      }
    } else {
      // Get a Twilio number for this tenant (you might want to use a number pool)
      const twilioNumbers = await this.twilioService.getNumbers(tenantId);
      if (!twilioNumbers || !twilioNumbers.data || twilioNumbers.data.length === 0) {
        throw new Error('No Twilio numbers configured for this tenant');
      }

      // Use the first available number (or implement number pool logic)
      const fromNumber = twilioNumbers.data[0];

      // Send SMS via Twilio
      try {
        const result = await this.twilioService.sendSMS(
          tenantId,
          contact.phoneNumber,
          body,
          fromNumber.id,
        );
        twilioMessageSid = result?.sid || null;
        status = twilioMessageSid ? MessageStatus.SENT : MessageStatus.FAILED;
      } catch (error) {
        // Log error but still save the message as failed
        console.error('Failed to send SMS:', error);
        status = MessageStatus.FAILED;
      }

      // Increment SMS usage count if message was sent successfully
      if (twilioMessageSid) {
        try {
          await this.tenantLimitsService.incrementSMSUsage(tenantId, 1);
        } catch (error) {
          console.error('Failed to increment SMS usage:', error);
        }
      }
    }

    // Save message
    const message = this.messageRepository.create({
      tenantId,
      conversationId: conversation.id,
      direction: MessageDirection.OUTBOUND,
      body,
      twilioMessageSid,
      imessageId,
      messageType,
      status,
      sentAt: new Date(),
    });
    const savedMessage = await this.messageRepository.save(message);

    // Update conversation
    conversation.lastMessageAt = new Date();
    conversation.status = ConversationStatus.OPEN;
    await this.conversationRepository.save(conversation);

    return savedMessage;
  }

  async closeConversation(tenantId: string, id: string): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id, tenantId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    conversation.status = ConversationStatus.CLOSED;
    return this.conversationRepository.save(conversation);
  }
}

