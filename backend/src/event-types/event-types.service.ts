import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventType, EventAction } from '../entities/event-type.entity';

@Injectable()
export class EventTypesService {
  constructor(
    @InjectRepository(EventType)
    private eventTypeRepository: Repository<EventType>,
  ) {}

  async create(tenantId: string, data: Partial<EventType>): Promise<EventType> {
    const eventType = this.eventTypeRepository.create({
      ...data,
      tenantId,
    });
    return this.eventTypeRepository.save(eventType);
  }

  async findAll(tenantId: string): Promise<EventType[]> {
    return this.eventTypeRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<EventType> {
    const eventType = await this.eventTypeRepository.findOne({
      where: { id, tenantId },
    });

    if (!eventType) {
      throw new NotFoundException('Event type not found');
    }

    return eventType;
  }

  async findOnePublic(id: string): Promise<EventType> {
    const eventType = await this.eventTypeRepository.findOne({
      where: { id },
    });

    if (!eventType) {
      throw new NotFoundException('Event type not found');
    }

    return eventType;
  }

  async findByAiTemplate(tenantId: string, aiTemplateId: string): Promise<EventType[]> {
    return this.eventTypeRepository.find({
      where: { tenantId, aiTemplateId, isActive: true },
    });
  }

  async update(tenantId: string, id: string, data: Partial<EventType>): Promise<EventType> {
    const eventType = await this.findOne(tenantId, id);
    Object.assign(eventType, data);
    return this.eventTypeRepository.save(eventType);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const eventType = await this.findOne(tenantId, id);
    await this.eventTypeRepository.remove(eventType);
  }

  async executeActions(tenantId: string, actions: EventAction[], contactId: string, eventId: string): Promise<void> {
    // This will be called when an event is scheduled
    // Actions will be executed by the calendar service
    // Implementation will be added when integrating with journeys/contacts
  }
}

