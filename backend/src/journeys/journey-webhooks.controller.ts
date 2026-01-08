import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JourneysService } from './journeys.service';
import { WebhookLeadDto } from './dto/webhook-lead.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { Contact } from '../entities/contact.entity';
import { Journey } from '../entities/journey.entity';

@Controller('webhooks/journeys')
export class JourneyWebhooksController {
  constructor(
    private readonly journeysService: JourneysService,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(Journey)
    private journeyRepository: Repository<Journey>,
  ) {}

  @Post('lead-ingestion')
  @UseGuards(TenantGuard)
  async leadIngestion(
    @TenantId() tenantId: string,
    @Body() dto: WebhookLeadDto,
  ) {
    // Find or create contact
    let contact = await this.contactRepository.findOne({
      where: { phoneNumber: dto.phoneNumber, tenantId },
    });

    if (!contact) {
      contact = this.contactRepository.create({
        phoneNumber: dto.phoneNumber,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        attributes: dto.attributes || {},
        hasConsent: true,
        tenantId,
      });
      contact = await this.contactRepository.save(contact);
    } else {
      // Update existing contact
      if (dto.email) contact.email = dto.email;
      if (dto.firstName) contact.firstName = dto.firstName;
      if (dto.lastName) contact.lastName = dto.lastName;
      if (dto.attributes) {
        contact.attributes = { ...contact.attributes, ...dto.attributes };
      }
      contact = await this.contactRepository.save(contact);
    }

    // Auto-enroll into journeys if specified
    const enrollments = [];
    if (dto.autoEnrollJourneyIds && dto.autoEnrollJourneyIds.length > 0) {
      for (const journeyId of dto.autoEnrollJourneyIds) {
        try {
          const journeyContact = await this.journeysService.enrollContact(tenantId, journeyId, {
            contactId: contact.id,
            enrollmentSource: 'webhook',
            enrollmentData: dto.metadata,
          });
          enrollments.push({ journeyId, success: true, journeyContactId: journeyContact.id });
        } catch (error) {
          enrollments.push({ journeyId, success: false, error: error.message });
        }
      }
    }

    return {
      success: true,
      contact: {
        id: contact.id,
        phoneNumber: contact.phoneNumber,
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
      },
      enrollments,
    };
  }

  @Post('remove-lead/:journeyId')
  @UseGuards(TenantGuard)
  async removeLead(
    @TenantId() tenantId: string,
    @Param('journeyId', ParseUUIDPipe) journeyId: string,
    @Body() body: { contactId?: string; phoneNumber?: string; pause?: boolean },
  ) {
    if (!body.contactId && !body.phoneNumber) {
      throw new BadRequestException('Either contactId or phoneNumber is required');
    }

    let contactId = body.contactId;

    if (!contactId && body.phoneNumber) {
      const contact = await this.contactRepository.findOne({
        where: { phoneNumber: body.phoneNumber, tenantId },
      });
      if (!contact) {
        throw new BadRequestException('Contact not found');
      }
      contactId = contact.id;
    }

    await this.journeysService.removeContact(tenantId, journeyId, contactId, body.pause || false);

    return {
      success: true,
      message: body.pause ? 'Lead paused in journey' : 'Lead removed from journey',
    };
  }

  @Post('check-removal/:journeyId')
  @UseGuards(TenantGuard)
  async checkRemoval(
    @TenantId() tenantId: string,
    @Param('journeyId', ParseUUIDPipe) journeyId: string,
    @Body() body: { contactId?: string; phoneNumber?: string; payload?: Record<string, any> },
  ) {
    if (!body.contactId && !body.phoneNumber) {
      throw new BadRequestException('Either contactId or phoneNumber is required');
    }

    let contactId = body.contactId;

    if (!contactId && body.phoneNumber) {
      const contact = await this.contactRepository.findOne({
        where: { phoneNumber: body.phoneNumber, tenantId },
      });
      if (!contact) {
        throw new BadRequestException('Contact not found');
      }
      contactId = contact.id;
    }

    const shouldRemove = await this.journeysService.checkRemovalCriteriaForWebhook(
      tenantId,
      journeyId,
      contactId,
      body.payload || {},
    );

    if (shouldRemove) {
      await this.journeysService.removeContact(tenantId, journeyId, contactId, false);
      return {
        success: true,
        removed: true,
        message: 'Contact removed from journey due to removal criteria',
      };
    }

    return {
      success: true,
      removed: false,
      message: 'Contact does not match removal criteria',
    };
  }

  @Post('removal-webhook/:journeyId/:webhookToken')
  async removalWebhook(
    @Param('journeyId', ParseUUIDPipe) journeyId: string,
    @Param('webhookToken') webhookToken: string,
    @Body() payload: Record<string, any>,
  ) {
    // Find journey by ID (no tenant guard, but token provides security)
    const journey = await this.journeyRepository.findOne({
      where: { id: journeyId },
    });
    
    if (!journey) {
      throw new BadRequestException('Journey not found');
    }

    const expectedToken = journey.removalCriteria?.webhookToken;
    if (!expectedToken || expectedToken !== webhookToken) {
      throw new BadRequestException('Invalid webhook token');
    }

    const tenantId = journey.tenantId;

    // Find phone number in payload based on configured field
    const webhookPayloadField = journey.removalCriteria?.webhookPayloadField || 'phoneNumber';
    const phoneNumber = payload[webhookPayloadField] || payload.phoneNumber || payload.phone;

    if (!phoneNumber) {
      throw new BadRequestException(`Phone number not found in payload field: ${webhookPayloadField}`);
    }

    // Find contact by phone number
    const contact = await this.contactRepository.findOne({
      where: { phoneNumber: String(phoneNumber), tenantId },
    });

    if (!contact) {
      return {
        success: false,
        message: 'Contact not found for provided phone number',
      };
    }

    // Check removal criteria
    const shouldRemove = await this.journeysService.checkRemovalCriteriaForWebhook(
      tenantId,
      journeyId,
      contact.id,
      payload,
    );

    if (shouldRemove) {
      await this.journeysService.removeContact(tenantId, journeyId, contact.id, false);
      return {
        success: true,
        removed: true,
        message: 'Contact removed from journey due to removal criteria',
        contactId: contact.id,
      };
    }

    return {
      success: true,
      removed: false,
      message: 'Contact does not match removal criteria',
    };
  }
}

