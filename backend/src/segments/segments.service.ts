import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Segment } from '../entities/segment.entity';
import { Contact } from '../entities/contact.entity';

@Injectable()
export class SegmentsService {
  constructor(
    @InjectRepository(Segment)
    private segmentRepository: Repository<Segment>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
  ) {}

  async create(tenantId: string, data: { name: string; description?: string; criteria?: any; continuousInclusion?: boolean }): Promise<Segment> {
    const segment = this.segmentRepository.create({
      ...data,
      tenantId,
      filterCriteria: data.criteria || {},
      continuousInclusion: data.continuousInclusion || false,
    });
    const saved = await this.segmentRepository.save(segment);
    
    // Apply filter criteria to find matching contacts and add them to segment
    await this.applyFilterCriteria(tenantId, saved.id, saved.filterCriteria);
    
    return this.findOne(tenantId, saved.id);
  }

  async findAll(tenantId: string): Promise<Segment[]> {
    const segments = await this.segmentRepository.find({
      where: { tenantId },
      relations: ['contacts'],
      order: { createdAt: 'DESC' },
    });

    return segments.map((segment) => ({
      ...segment,
      contactCount: segment.contacts?.length || 0,
    })) as any[];
  }

  async findOne(tenantId: string, id: string): Promise<Segment> {
    const segment = await this.segmentRepository.findOne({
      where: { id, tenantId },
      relations: ['contacts'],
    });

    if (!segment) {
      throw new NotFoundException('Segment not found');
    }

    return {
      ...segment,
      contactCount: segment.contacts?.length || 0,
    } as any;
  }

  async update(
    tenantId: string,
    id: string,
    data: { name?: string; description?: string; criteria?: any; continuousInclusion?: boolean },
  ): Promise<Segment> {
    const segment = await this.findOne(tenantId, id);
    
    if (data.name !== undefined) segment.name = data.name;
    if (data.description !== undefined) segment.description = data.description;
    if (data.continuousInclusion !== undefined) segment.continuousInclusion = data.continuousInclusion;
    if (data.criteria !== undefined) {
      segment.filterCriteria = data.criteria;
      // Reapply filter criteria
      await this.applyFilterCriteria(tenantId, id, data.criteria);
    }

    await this.segmentRepository.save(segment);
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const segment = await this.findOne(tenantId, id);
    await this.segmentRepository.remove(segment);
  }

  async countMatchingContacts(tenantId: string, criteria: any): Promise<number> {
    const queryBuilder = this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.tenantId = :tenantId', { tenantId });

    this.applyCriteriaToQuery(queryBuilder, criteria);

    return queryBuilder.getCount();
  }

  private applyCriteriaToQuery(queryBuilder: any, criteria: any): void {
    // Handle status filter (isOptedOut)
    if (criteria.status !== undefined && criteria.status !== 'all') {
      // status: 'active' means isOptedOut = false, 'optedOut' means isOptedOut = true
      if (criteria.status === 'active') {
        queryBuilder.andWhere('contact.isOptedOut = :isOptedOut', { isOptedOut: false });
      } else if (criteria.status === 'optedOut') {
        queryBuilder.andWhere('contact.isOptedOut = :isOptedOut', { isOptedOut: true });
      }
    }

    // Handle statusNotIn filter (exclude contacts with these statuses)
    if (criteria.statusNotIn && Array.isArray(criteria.statusNotIn) && criteria.statusNotIn.length > 0) {
      const statusConditions: string[] = [];
      const params: any = {};
      
      criteria.statusNotIn.forEach((status: string, index: number) => {
        if (status === 'active') {
          statusConditions.push(`contact.isOptedOut = :statusNotInActive${index}`);
          params[`statusNotInActive${index}`] = false;
        } else if (status === 'optedOut') {
          statusConditions.push(`contact.isOptedOut = :statusNotInOptedOut${index}`);
          params[`statusNotInOptedOut${index}`] = true;
        }
      });
      
      if (statusConditions.length > 0) {
        queryBuilder.andWhere(`NOT (${statusConditions.join(' OR ')})`, params);
      }
    }

    // Legacy support for optedOut boolean
    if (criteria.optedOut !== undefined && criteria.status === undefined) {
      queryBuilder.andWhere('contact.isOptedOut = :optedOut', { optedOut: criteria.optedOut });
    }

    if (criteria.hasConsent !== undefined) {
      queryBuilder.andWhere('contact.hasConsent = :hasConsent', { hasConsent: criteria.hasConsent });
    }

    // Handle leadStatus filter
    if (criteria.leadStatus) {
      queryBuilder.andWhere('contact.leadStatus = :leadStatus', { leadStatus: criteria.leadStatus });
    }

    // Handle leadStatusNotIn filter (exclude contacts with these lead statuses)
    if (criteria.leadStatusNotIn && Array.isArray(criteria.leadStatusNotIn) && criteria.leadStatusNotIn.length > 0) {
      queryBuilder.andWhere('(contact.leadStatus IS NULL OR contact.leadStatus NOT IN (:...leadStatusNotIn))', {
        leadStatusNotIn: criteria.leadStatusNotIn,
      });
    }

    // Handle lead age filtering (based on createdAt)
    if (criteria.leadAge) {
      const now = new Date();
      
      if (criteria.leadAge.minDays !== undefined) {
        const minDate = new Date(now);
        minDate.setDate(minDate.getDate() - criteria.leadAge.minDays);
        queryBuilder.andWhere('contact.createdAt >= :minDate', { minDate });
      }
      
      if (criteria.leadAge.maxDays !== undefined) {
        const maxDate = new Date(now);
        maxDate.setDate(maxDate.getDate() - criteria.leadAge.maxDays);
        queryBuilder.andWhere('contact.createdAt <= :maxDate', { maxDate });
      }
      
      if (criteria.leadAge.createdAfter) {
        queryBuilder.andWhere('contact.createdAt >= :createdAfter', {
          createdAfter: new Date(criteria.leadAge.createdAfter),
        });
      }
      
      if (criteria.leadAge.createdBefore) {
        queryBuilder.andWhere('contact.createdAt <= :createdBefore', {
          createdBefore: new Date(criteria.leadAge.createdBefore),
        });
      }
    }

    // Handle not in journey filter
    if (criteria.notInJourney === true) {
      // Contact is not in any journey
      queryBuilder.andWhere(
        `contact.id NOT IN (
          SELECT DISTINCT "contactId" FROM journey_contacts WHERE "tenantId" = contact."tenantId"
        )`,
      );
    } else if (criteria.notInJourneyIds && Array.isArray(criteria.notInJourneyIds) && criteria.notInJourneyIds.length > 0) {
      // Contact is not in specific journeys
      queryBuilder.andWhere(
        `contact.id NOT IN (
          SELECT DISTINCT "contactId" FROM journey_contacts 
          WHERE "journeyId" IN (:...notInJourneyIds) AND "tenantId" = contact."tenantId"
        )`,
        { notInJourneyIds: criteria.notInJourneyIds },
      );
    }

    if (criteria.tags && Array.isArray(criteria.tags) && criteria.tags.length > 0) {
      queryBuilder
        .leftJoin('contact.tags', 'tag')
        .andWhere('tag.name IN (:...tags)', { tags: criteria.tags });
    }

    if (criteria.attributes && typeof criteria.attributes === 'object') {
      // Filter by attributes using JSONB queries
      Object.entries(criteria.attributes).forEach(([key, value]) => {
        queryBuilder.andWhere(`contact.attributes->>'${key}' = :attrValue`, { attrValue: String(value) });
      });
    }
  }

  private async applyFilterCriteria(tenantId: string, segmentId: string, criteria: any): Promise<void> {
    // Build query based on filter criteria
    const queryBuilder = this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.tenantId = :tenantId', { tenantId });

    this.applyCriteriaToQuery(queryBuilder, criteria);

    // Apply limit if specified
    if (criteria.limit && typeof criteria.limit === 'number' && criteria.limit > 0) {
      queryBuilder.limit(criteria.limit);
    }

    // Order by createdAt descending (newest first) if limit is applied, otherwise no specific order
    if (criteria.limit) {
      queryBuilder.orderBy('contact.createdAt', 'DESC');
    }

    const matchingContacts = await queryBuilder.getMany();

    // Get the segment with contacts relation
    const segment = await this.segmentRepository.findOne({
      where: { id: segmentId, tenantId },
      relations: ['contacts'],
    });

    if (!segment) return;

    // For continuous inclusion, add new contacts without removing existing ones
    // For set audience, replace all contacts
    if (segment.continuousInclusion) {
      // Add only contacts that aren't already in the segment
      const existingContactIds = new Set(segment.contacts?.map(c => c.id) || []);
      const newContacts = matchingContacts.filter(c => !existingContactIds.has(c.id));
      segment.contacts = [...(segment.contacts || []), ...newContacts];
    } else {
      // Replace all contacts (set audience)
      segment.contacts = matchingContacts;
    }
    
    await this.segmentRepository.save(segment);
  }

  // Method to check and add contacts to segments with continuous inclusion
  async processContinuousInclusionSegments(tenantId?: string): Promise<void> {
    const whereClause: any = { continuousInclusion: true };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const segments = await this.segmentRepository.find({
      where: whereClause,
      relations: ['contacts'],
    });

    for (const segment of segments) {
      if (!segment.filterCriteria) continue;
      
      // Reapply filter criteria to find new matching contacts
      await this.applyFilterCriteria(segment.tenantId, segment.id, segment.filterCriteria);
    }
  }
}

