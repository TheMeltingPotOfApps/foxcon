import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  LeadIngestionEndpoint,
  IngestionActionType,
  IngestionAction,
  ParameterMapping,
} from '../entities/lead-ingestion-endpoint.entity';
import { CreateIngestionEndpointDto } from './dto/create-ingestion-endpoint.dto';
import { Contact } from '../entities/contact.entity';
import { CampaignContact } from '../entities/campaign-contact.entity';
import { JourneyContact, JourneyContactStatus } from '../entities/journey-contact.entity';
import { Campaign } from '../entities/campaign.entity';
import { Journey } from '../entities/journey.entity';
import { PhoneFormatter } from '../utils/phone-formatter';
import * as crypto from 'crypto';
import { JourneysService } from '../journeys/journeys.service';

@Injectable()
export class LeadIngestionService {
  private readonly logger = new Logger(LeadIngestionService.name);

  constructor(
    @InjectRepository(LeadIngestionEndpoint)
    private endpointRepository: Repository<LeadIngestionEndpoint>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(CampaignContact)
    private campaignContactRepository: Repository<CampaignContact>,
    @InjectRepository(JourneyContact)
    private journeyContactRepository: Repository<JourneyContact>,
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(Journey)
    private journeyRepository: Repository<Journey>,
    private readonly journeysService: JourneysService,
  ) {}

  async create(
    tenantId: string,
    dto: CreateIngestionEndpointDto,
  ): Promise<LeadIngestionEndpoint> {
    // Check if endpointKey already exists
    const existing = await this.endpointRepository.findOne({
      where: { endpointKey: dto.endpointKey },
    });
    if (existing) {
      throw new BadRequestException('Endpoint key already exists');
    }

    // Generate API key if not provided
    const apiKey = dto.apiKey || crypto.randomBytes(32).toString('hex');

    const endpoint = this.endpointRepository.create({
      ...dto,
      tenantId,
      apiKey,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    return this.endpointRepository.save(endpoint);
  }

  async findAll(tenantId: string): Promise<LeadIngestionEndpoint[]> {
    return this.endpointRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<LeadIngestionEndpoint> {
    const endpoint = await this.endpointRepository.findOne({
      where: { id, tenantId },
    });

    if (!endpoint) {
      throw new NotFoundException('Endpoint not found');
    }

    return endpoint;
  }

  async findByKey(endpointKey: string): Promise<LeadIngestionEndpoint> {
    const endpoint = await this.endpointRepository.findOne({
      where: { endpointKey, isActive: true },
    });

    if (!endpoint) {
      throw new NotFoundException('Endpoint not found or inactive');
    }

    return endpoint;
  }

  async update(
    tenantId: string,
    id: string,
    dto: Partial<CreateIngestionEndpointDto>,
  ): Promise<LeadIngestionEndpoint> {
    const endpoint = await this.findOne(tenantId, id);

    // Check endpointKey uniqueness if being updated
    if (dto.endpointKey && dto.endpointKey !== endpoint.endpointKey) {
      const existing = await this.endpointRepository.findOne({
        where: { endpointKey: dto.endpointKey },
      });
      if (existing) {
        throw new BadRequestException('Endpoint key already exists');
      }
    }

    Object.assign(endpoint, dto);
    return this.endpointRepository.save(endpoint);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const endpoint = await this.findOne(tenantId, id);
    await this.endpointRepository.remove(endpoint);
  }

  async ingestLead(
    endpointKey: string,
    data: Record<string, any>,
    apiKey?: string,
    clientIp?: string,
  ): Promise<{ success: boolean; contactId?: string; message: string }> {
    const endpoint = await this.findByKey(endpointKey);

    // Verify API key if configured
    if (endpoint.apiKey) {
      if (!apiKey) {
        throw new UnauthorizedException('API key required. Please include X-API-Key header.');
      }
      if (apiKey !== endpoint.apiKey) {
        throw new UnauthorizedException('Invalid API key');
      }
    }

    // Check IP whitelist if configured
    if (endpoint.metadata?.ipWhitelist && clientIp) {
      if (!endpoint.metadata.ipWhitelist.includes(clientIp)) {
        throw new UnauthorizedException('IP address not whitelisted');
      }
    }

    // TODO: Implement rate limiting

    endpoint.requestCount += 1;
    endpoint.lastRequestAt = new Date();

    try {
      // Map incoming parameters to contact fields
      const contactData: any = {
        tenantId: endpoint.tenantId,
      };

      // Process parameter mappings
      for (const mapping of endpoint.parameterMappings) {
        const value = data[mapping.paramName] ?? mapping.defaultValue;

        if (mapping.required && (value === undefined || value === null || value === '')) {
          throw new BadRequestException(
            `Required parameter '${mapping.paramName}' is missing`,
          );
        }

        if (value !== undefined && value !== null && value !== '') {
          // Map to contact field
          if (mapping.contactField === 'phoneNumber') {
            // Format phone number to E.164 format
            try {
              contactData.phoneNumber = PhoneFormatter.formatToE164(String(value));
            } catch (error: any) {
              throw new BadRequestException(
                `Invalid phone number format for parameter '${mapping.paramName}': ${error.message}`,
              );
            }
          } else if (mapping.contactField === 'attributes') {
            // Store in attributes
            if (!contactData.attributes) contactData.attributes = {};
            contactData.attributes[mapping.paramName] = value;
          } else {
            contactData[mapping.contactField] = value;
          }
        }
      }

      // Create or find contact
      let contact: Contact;
      if (contactData.phoneNumber) {
        // Try to find existing contact by phone
        contact = await this.contactRepository.findOne({
          where: {
            phoneNumber: contactData.phoneNumber,
            tenantId: endpoint.tenantId,
          },
        });

        if (contact) {
          // Update existing contact
          Object.assign(contact, contactData);
          contact = await this.contactRepository.save(contact);
        } else {
          // Create new contact
          const newContact = this.contactRepository.create({
            tenantId: endpoint.tenantId,
            phoneNumber: contactData.phoneNumber,
            email: contactData.email || null,
            firstName: contactData.firstName || null,
            lastName: contactData.lastName || null,
            attributes: contactData.attributes || null,
            hasConsent: true,
            isOptedOut: false,
            leadStatus: contactData.leadStatus || null,
          });
          contact = await this.contactRepository.save(newContact);
        }
      } else {
        throw new BadRequestException('Phone number is required');
      }

      // Execute actions
      for (const action of endpoint.actions) {
        await this.executeAction(endpoint.tenantId, contact.id, action);
      }

      endpoint.successCount += 1;
      await this.endpointRepository.save(endpoint);

      return {
        success: true,
        contactId: contact.id,
        message: 'Lead ingested successfully',
      };
    } catch (error) {
      endpoint.failureCount += 1;
      await this.endpointRepository.save(endpoint);

      throw error;
    }
  }

  private async executeAction(
    tenantId: string,
    contactId: string,
    action: IngestionAction,
  ): Promise<void> {
    switch (action.type) {
      case IngestionActionType.CREATE_CONTACT:
        // Contact already created in ingestLead
        break;

      case IngestionActionType.ADD_TO_CAMPAIGN:
        if (!action.config.campaignId) {
          throw new BadRequestException('Campaign ID required for ADD_TO_CAMPAIGN action');
        }
        const campaign = await this.campaignRepository.findOne({
          where: { id: action.config.campaignId, tenantId },
        });
        if (!campaign) {
          throw new BadRequestException('Campaign not found');
        }

        const existingCampaignContact = await this.campaignContactRepository.findOne({
          where: { campaignId: campaign.id, contactId, tenantId },
        });

        if (!existingCampaignContact) {
          const campaignContact = this.campaignContactRepository.create({
            campaignId: campaign.id,
            contactId,
            tenantId,
          });
          await this.campaignContactRepository.save(campaignContact);
        }
        break;

      case IngestionActionType.REMOVE_FROM_CAMPAIGN:
        if (!action.config.campaignId) {
          throw new BadRequestException('Campaign ID required for REMOVE_FROM_CAMPAIGN action');
        }
        await this.campaignContactRepository.delete({
          campaignId: action.config.campaignId,
          contactId,
          tenantId,
        });
        break;

      case IngestionActionType.ADD_TO_JOURNEY:
        if (!action.config.journeyId) {
          throw new BadRequestException('Journey ID required for ADD_TO_JOURNEY action');
        }

        // Use the central JourneysService enrollment flow so that
        // ingested leads are not only enrolled but also start journey execution
        await this.journeysService.enrollContact(tenantId, action.config.journeyId, {
          contactId,
          enrollmentSource: 'webhook',
          enrollmentData: {
            source: 'lead_ingestion',
            ingestionActionType: IngestionActionType.ADD_TO_JOURNEY,
          },
        });
        break;

      case IngestionActionType.REMOVE_FROM_JOURNEY:
        if (!action.config.journeyId) {
          throw new BadRequestException('Journey ID required for REMOVE_FROM_JOURNEY action');
        }
        // Use the central JourneysService removal flow for proper validation and cleanup
        await this.journeysService.removeContact(tenantId, action.config.journeyId, contactId, false);
        break;

      case IngestionActionType.PAUSE_IN_JOURNEY:
        if (!action.config.journeyId) {
          throw new BadRequestException('Journey ID required for PAUSE_IN_JOURNEY action');
        }
        // Use the central JourneysService pause flow for proper validation
        await this.journeysService.removeContact(tenantId, action.config.journeyId, contactId, true);
        break;

      case IngestionActionType.UPDATE_CONTACT_STATUS:
        if (!action.config.leadStatus) {
          throw new BadRequestException('Lead status required for UPDATE_CONTACT_STATUS action');
        }
        await this.contactRepository.update(
          { id: contactId, tenantId },
          { leadStatus: action.config.leadStatus },
        );
        break;

      default:
        throw new BadRequestException(`Unknown action type: ${action.type}`);
    }
  }
}

