import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactVisit } from '../entities/contact-visit.entity';
import { Contact } from '../entities/contact.entity';

@Injectable()
export class ContactVisitsService {
  constructor(
    @InjectRepository(ContactVisit)
    private contactVisitRepository: Repository<ContactVisit>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
  ) {}

  async trackVisit(data: {
    contactId: string;
    eventTypeId?: string;
    tenantId: string;
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    metadata?: Record<string, any>;
  }): Promise<ContactVisit> {
    // Verify contact exists and belongs to tenant
    const contact = await this.contactRepository.findOne({
      where: { id: data.contactId, tenantId: data.tenantId },
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    const visit = this.contactVisitRepository.create({
      ...data,
    });

    return await this.contactVisitRepository.save(visit);
  }

  async getContactVisits(contactId: string, tenantId: string): Promise<ContactVisit[]> {
    return await this.contactVisitRepository.find({
      where: { contactId, tenantId },
      relations: ['eventType'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateVisitWithScheduledEvent(
    visitId: string,
    scheduledEventAt: Date,
  ): Promise<ContactVisit> {
    const visit = await this.contactVisitRepository.findOne({ where: { id: visitId } });
    if (!visit) {
      throw new Error('Visit not found');
    }

    visit.scheduledEventAt = scheduledEventAt;
    return await this.contactVisitRepository.save(visit);
  }
}

