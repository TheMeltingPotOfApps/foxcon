import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Contact } from '../entities/contact.entity';
import { ContactTag } from '../entities/contact-tag.entity';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { CampaignContact } from '../entities/campaign-contact.entity';
import { JourneyContact } from '../entities/journey-contact.entity';
import { Campaign } from '../entities/campaign.entity';
import { Journey } from '../entities/journey.entity';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(ContactTag)
    private tagRepository: Repository<ContactTag>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(CampaignContact)
    private campaignContactRepository: Repository<CampaignContact>,
    @InjectRepository(JourneyContact)
    private journeyContactRepository: Repository<JourneyContact>,
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(Journey)
    private journeyRepository: Repository<Journey>,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(tenantId: string, data: Partial<Contact>): Promise<any> {
    // Map frontend fields to backend fields
    const contactData: any = {
      tenantId,
      phoneNumber: (data as any).phone || (data as any).phoneNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      hasConsent: (data as any).hasConsent ?? (data as any).optedIn ?? true,
      isOptedOut: (data as any).isOptedOut ?? false,
      leadStatus: data.leadStatus,
    };

    // Handle custom attributes (city, state, country, and any other custom fields)
    const attributes: Record<string, any> = {};
    if ((data as any).city) attributes.city = (data as any).city;
    if ((data as any).state) attributes.state = (data as any).state;
    if ((data as any).country) attributes.country = (data as any).country;
    
    // Add any custom attributes passed directly
    if ((data as any).attributes && typeof (data as any).attributes === 'object') {
      Object.assign(attributes, (data as any).attributes);
    }

    // Add any other fields that aren't standard Contact fields to attributes
    const standardFields = ['phone', 'phoneNumber', 'firstName', 'lastName', 'email', 'hasConsent', 'optedIn', 'isOptedOut', 'optedOut', 'leadStatus', 'attributes', 'city', 'state', 'country'];
    Object.keys(data).forEach((key) => {
      if (!standardFields.includes(key) && data[key as keyof Contact] !== undefined) {
        attributes[key] = (data as any)[key];
      }
    });

    if (Object.keys(attributes).length > 0) {
      contactData.attributes = attributes;
    }

    const createdContact = this.contactRepository.create(contactData);
    const savedContact = await this.contactRepository.save(createdContact);
    // TypeORM save can return array, but we know we're saving a single entity
    const contact = Array.isArray(savedContact) ? savedContact[0] : savedContact;
    return this.mapContactToFrontend(contact);
  }

  async findAll(
    tenantId: string,
    page: number = 1,
    limit: number = 50,
    sortBy: string = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
    search?: string,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    // Enforce maximum limit to prevent performance issues
    const maxLimit = 100;
    const enforcedLimit = Math.min(limit, maxLimit);
    const skip = (page - 1) * enforcedLimit;
    
    // Build base query for counting total (without grouping)
    const countQueryBuilder = this.contactRepository
      .createQueryBuilder('contact')
      .where('contact."tenantId" = :tenantId', { tenantId });

    // Build query builder with journey action count
    const queryBuilder = this.contactRepository
      .createQueryBuilder('contact')
      .leftJoin(
        'journey_contacts',
        'jc',
        'jc."contactId" = contact.id AND jc."tenantId" = :tenantId',
      )
      .where('contact."tenantId" = :tenantId', { tenantId })
      .groupBy('contact.id')
      .select([
        'contact.id',
        'contact.firstName',
        'contact.lastName',
        'contact.phoneNumber',
        'contact.email',
        'contact.leadStatus',
        'contact.isOptedOut',
        'contact.createdAt',
        'contact.updatedAt',
        'contact.attributes',
      ])
      .addSelect('COUNT(DISTINCT jc.id)', 'journeyActionsCount');

    // Add search filter if provided
    if (search) {
      const searchCondition = '(contact."firstName" ILIKE :search OR contact."lastName" ILIKE :search OR contact."phoneNumber" ILIKE :search OR contact.email ILIKE :search)';
      queryBuilder.andWhere(searchCondition, { search: `%${search}%` });
      countQueryBuilder.andWhere(searchCondition, { search: `%${search}%` });
    }

    // Get total count before pagination
    const total = await countQueryBuilder.getCount();

    // Handle sorting
    const validSortFields: Record<string, string> = {
      createdAt: 'contact."createdAt"',
      firstName: 'contact."firstName"',
      lastName: 'contact."lastName"',
      email: 'contact.email',
      leadStatus: 'contact."leadStatus"',
      journeyActions: 'journeyActionsCount',
    };

    const sortField = validSortFields[sortBy] || validSortFields.createdAt;
    queryBuilder.orderBy(sortField, sortOrder);

    // Apply pagination - ensure limit is enforced
    queryBuilder.skip(skip).take(enforcedLimit);

    // Execute query
    const results = await queryBuilder.getRawMany();
    
    // Double-check: ensure we don't return more than the limit
    const limitedResults = results.slice(0, enforcedLimit);

    // Get contact IDs to fetch tags separately
    const contactIds = limitedResults.map((row) => row.contact_id);
    const contactsWithTags = contactIds.length > 0
      ? await this.contactRepository.find({
          where: { id: In(contactIds), tenantId },
      relations: ['tags'],
        })
      : [];

    // Create a map of contacts with tags
    const contactsMap = new Map<string, Contact>();
    contactsWithTags.forEach((contact) => {
      contactsMap.set(contact.id, contact);
    });

    // Transform results to include journey actions count and map to frontend format
    const mappedContacts = limitedResults.map((row) => {
      const contact = contactsMap.get(row.contact_id);
      const contactData = contact || {
        id: row.contact_id,
        firstName: row.contact_firstName,
        lastName: row.contact_lastName,
        phoneNumber: row.contact_phoneNumber,
        email: row.contact_email,
        leadStatus: row.contact_leadStatus,
        isOptedOut: row.contact_isOptedOut,
        createdAt: row.contact_createdAt,
        updatedAt: row.contact_updatedAt,
        attributes: row.contact_attributes,
        tags: [],
      } as Contact;

      const mapped = this.mapContactToFrontend(contactData);
      (mapped as any).journeyActionsCount = parseInt(row.journeyActionsCount) || 0;
      return mapped;
    });

    return {
      data: mappedContacts,
      total,
      page,
      limit: enforcedLimit,
    };
  }

  async findOne(tenantId: string, id: string): Promise<any> {
    const contact = await this.contactRepository.findOne({
      where: { id, tenantId },
      relations: ['tags'],
    });
    if (!contact) return null;
    return this.mapContactToFrontend(contact);
  }

  private mapContactToFrontend(contact: Contact): any {
    const mapped: any = {
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phoneNumber,
      phoneNumber: contact.phoneNumber, // Include phoneNumber for consistency
      email: contact.email,
      hasConsent: contact.hasConsent,
      optedOut: contact.isOptedOut,
      leadStatus: contact.leadStatus,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
      tenantId: contact.tenantId, // Include tenantId for verification
    };

    // Map attributes to individual fields if they exist
    if (contact.attributes) {
      if (contact.attributes.city) mapped.city = contact.attributes.city;
      if (contact.attributes.state) mapped.state = contact.attributes.state;
      if (contact.attributes.country) mapped.country = contact.attributes.country;
      // Include all other attributes
      mapped.attributes = contact.attributes;
    }

    // Include marketplace fields if present
    if (contact.marketplaceListingId) {
      mapped.marketplaceListingId = contact.marketplaceListingId;
    }
    if (contact.marketplaceSubscriptionId) {
      mapped.marketplaceSubscriptionId = contact.marketplaceSubscriptionId;
    }
    if (contact.marketplaceDistributionId) {
      mapped.marketplaceDistributionId = contact.marketplaceDistributionId;
    }
    if (contact.marketplaceMetadata) {
      mapped.marketplaceMetadata = contact.marketplaceMetadata;
    }

    return mapped;
  }

  async update(
    tenantId: string,
    id: string,
    data: Partial<Contact>,
  ): Promise<Contact> {
    await this.contactRepository.update({ id, tenantId }, data);
    return this.findOne(tenantId, id);
  }

  async updateStatus(
    tenantId: string,
    id: string,
    leadStatus: string,
  ): Promise<any> {
    const contact = await this.contactRepository.findOne({
      where: { id, tenantId },
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    const oldStatus = contact.leadStatus;
    contact.leadStatus = leadStatus;
    const updated = await this.contactRepository.save(contact);

    // Emit event for marketplace sync
    this.eventEmitter.emit('contact.leadStatus.updated', {
      tenantId,
      contactId: id,
      oldStatus,
      newStatus: leadStatus,
      contact: updated,
    });

    return this.mapContactToFrontend(updated);
  }

  async getTimeline(tenantId: string, contactId: string) {
    const contact = await this.findOne(tenantId, contactId);
    if (!contact) {
      throw new Error('Contact not found');
    }

    // Get all conversations with messages
    const conversations = await this.conversationRepository.find({
      where: { contactId, tenantId },
      relations: ['messages'],
      order: { createdAt: 'DESC' },
    });

    // Get all campaign contacts
    const campaignContacts = await this.campaignContactRepository.find({
      where: { contactId, tenantId },
      relations: ['campaign'],
      order: { createdAt: 'DESC' },
    });

    // Get all journey contacts
    const journeyContacts = await this.journeyContactRepository.find({
      where: { contactId, tenantId },
      relations: ['journey'],
      order: { createdAt: 'DESC' },
    });

    // Build timeline events
    const timeline: any[] = [];

    // Add conversations
    conversations.forEach((conv) => {
      timeline.push({
        type: 'conversation_started',
        date: conv.createdAt,
        data: {
          conversationId: conv.id,
          status: conv.status,
        },
      });

      conv.messages?.forEach((msg) => {
        timeline.push({
          type: 'message',
          date: msg.createdAt,
          data: {
            conversationId: conv.id,
            direction: msg.direction,
            body: msg.body,
            status: msg.status,
            messageId: msg.id,
          },
        });
      });
    });

    // Add campaign events
    campaignContacts.forEach((cc) => {
      timeline.push({
        type: 'campaign_added',
        date: cc.createdAt,
        data: {
          campaignId: cc.campaignId,
          campaignName: cc.campaign?.name,
          status: cc.status,
          sentAt: cc.sentAt,
          deliveredAt: cc.deliveredAt,
        },
      });
    });

    // Add journey events
    journeyContacts.forEach((jc) => {
      timeline.push({
        type: 'journey_enrolled',
        date: jc.enrolledAt || jc.createdAt,
        data: {
          journeyId: jc.journeyId,
          journeyName: jc.journey?.name,
          status: jc.status,
          completedAt: jc.completedAt,
          pausedAt: jc.pausedAt,
        },
      });
    });

    // Sort by date
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      contact,
      timeline,
      stats: {
        totalMessages: timeline.filter((t) => t.type === 'message').length,
        totalCampaigns: campaignContacts.length,
        totalJourneys: journeyContacts.length,
        totalConversations: conversations.length,
      },
    };
  }

  async findByPhone(tenantId: string, phoneNumber: string): Promise<Contact | null> {
    return await this.contactRepository.findOne({
      where: { phoneNumber, tenantId },
    });
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.contactRepository.delete({ id, tenantId });
  }
}

