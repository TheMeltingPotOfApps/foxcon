import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  BadRequestException,
  Get,
  Query,
} from '@nestjs/common';
import { ImessageService } from './imessage.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageDirection, MessageStatus, MessageType } from '../entities/message.entity';
import { Conversation, ConversationStatus } from '../entities/conversation.entity';
import { Contact } from '../entities/contact.entity';

/**
 * Webhook endpoint for iMessage app to receive incoming messages
 * This endpoint should be provided to the iMessage app for webhook configuration
 */
@Controller('webhooks/imessage')
export class ImessageController {
  private readonly logger = new Logger(ImessageController.name);

  constructor(
    private readonly imessageService: ImessageService,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
  ) {}

  /**
   * Webhook endpoint for receiving incoming iMessages
   * The iMessage app should POST to this endpoint when a new message is received
   * 
   * Expected payload format (based on API_DOCUMENTATION.md):
   * {
   *   "event": "new_sms",
   *   "message": {
   *     "id": "+1234567890_2024-01-01 12:00:00",
   *     "body": "Hello!",
   *     "sender_phone": "+1234567890",
   *     "sender_name": "John Doe",
   *     "receiver_phone": "+0987654321",
   *     "timestamp": "2024-01-01 12:00:00",
   *     "datetime": "2024-01-01T12:00:00",
   *     "sent_by_me": false,
   *     "account": {
   *       "login": "user@example.com",
   *       "service": "iMessage"
   *     }
   *   }
   * }
   */
  @Post('incoming')
  async handleIncomingMessage(
    @Body() payload: any,
    @Headers('x-tenant-id') tenantIdHeader?: string,
  ) {
    this.logger.log('Received incoming iMessage webhook');

    try {
      // Extract tenant ID from header or payload
      // The iMessage app should include X-Tenant-ID header when sending webhooks
      const tenantId = tenantIdHeader || payload.tenantId || payload.message?.tenantId;

      if (!tenantId) {
        this.logger.warn('No tenant ID provided in webhook. Message will not be routed.');
        return { status: 'error', message: 'Tenant ID required' };
      }

      if (!payload.message) {
        throw new BadRequestException('Message payload is required');
      }

      const messageData = payload.message;
      const senderPhone = messageData.sender_phone;
      const messageBody = messageData.body;
      const timestamp = messageData.timestamp || messageData.datetime;

      if (!senderPhone || !messageBody) {
        throw new BadRequestException('Sender phone and message body are required');
      }

      this.logger.log(`Processing incoming iMessage from ${senderPhone} for tenant ${tenantId}`);

      // Find or create contact by phone number
      let contact = await this.contactRepository.findOne({
        where: { phoneNumber: senderPhone, tenantId },
      });

      if (!contact) {
        // Create new contact
        contact = this.contactRepository.create({
          tenantId,
          phoneNumber: senderPhone,
          firstName: messageData.sender_name?.split(' ')[0] || '',
          lastName: messageData.sender_name?.split(' ').slice(1).join(' ') || '',
        });
        contact = await this.contactRepository.save(contact);
        this.logger.log(`Created new contact for ${senderPhone}`);
      }

      // Find or create conversation
      let conversation = await this.conversationRepository.findOne({
        where: { contactId: contact.id, tenantId },
        order: { createdAt: 'DESC' },
      });

      if (!conversation || conversation.status === ConversationStatus.CLOSED) {
        conversation = this.conversationRepository.create({
          tenantId,
          contactId: contact.id,
          status: ConversationStatus.OPEN,
          lastMessageAt: timestamp ? new Date(timestamp) : new Date(),
        });
        conversation = await this.conversationRepository.save(conversation);
        this.logger.log(`Created new conversation for contact ${contact.id}`);
      } else {
        conversation.lastMessageAt = timestamp ? new Date(timestamp) : new Date();
        conversation.status = ConversationStatus.OPEN;
        await this.conversationRepository.save(conversation);
      }

      // Create message record
      const message = this.messageRepository.create({
        tenantId,
        conversationId: conversation.id,
        direction: MessageDirection.INBOUND,
        body: messageBody,
        imessageId: messageData.id || null,
        messageType: MessageType.IMESSAGE,
        status: MessageStatus.DELIVERED,
        sentAt: timestamp ? new Date(timestamp) : new Date(),
      });

      await this.messageRepository.save(message);
      this.logger.log(`Saved incoming iMessage ${message.id}`);

      return {
        status: 'success',
        messageId: message.id,
        conversationId: conversation.id,
      };
    } catch (error: any) {
      this.logger.error(`Error processing incoming iMessage: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to process incoming message: ${error.message}`);
    }
  }

  /**
   * Health check endpoint for iMessage webhook
   */
  @Get('health')
  healthCheck() {
    return { status: 'ok', service: 'imessage-webhook' };
  }

  /**
   * Get webhook endpoint URL for configuration
   * This endpoint can be called to get the webhook URL to configure in the iMessage app
   */
  @Get('endpoint')
  getWebhookEndpoint(@Query('baseUrl') baseUrl?: string) {
    const defaultBaseUrl = process.env.BACKEND_URL || 'http://localhost:5002';
    const webhookUrl = `${baseUrl || defaultBaseUrl}/api/webhooks/imessage/incoming`;
    
    return {
      webhookUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': '<tenant-id>', // Should be included in webhook requests
      },
      payloadFormat: {
        event: 'new_sms',
        message: {
          id: 'string',
          body: 'string',
          sender_phone: 'string',
          sender_name: 'string',
          receiver_phone: 'string',
          timestamp: 'YYYY-MM-DD HH:MM:SS',
          datetime: 'ISO 8601 timestamp',
          sent_by_me: false,
          account: {
            login: 'string',
            service: 'iMessage',
          },
        },
      },
    };
  }
}
