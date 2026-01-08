import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from '../../entities/contact.entity';
import { LeadDistribution, DistributionStatus } from '../entities/lead-distribution.entity';
import { ListingMetrics } from '../entities/listing-metrics.entity';

export interface LeadQualityMetrics {
  listingId: string;
  totalLeads: number;
  contactRate: number;
  dncRate: number;
  soldRate: number;
  averageResponseTime: number;
  qualityScore: number; // 0-100
}

@Injectable()
export class LeadQualityService {
  private readonly logger = new Logger(LeadQualityService.name);

  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(LeadDistribution)
    private distributionRepository: Repository<LeadDistribution>,
    @InjectRepository(ListingMetrics)
    private metricsRepository: Repository<ListingMetrics>,
  ) {}

  async calculateLeadQuality(tenantId: string, listingId: string): Promise<LeadQualityMetrics> {
    // Get all distributions for this listing
    const distributions = await this.distributionRepository.find({
      where: { tenantId, listingId },
    });

    if (distributions.length === 0) {
      return {
        listingId,
        totalLeads: 0,
        contactRate: 0,
        dncRate: 0,
        soldRate: 0,
        averageResponseTime: 0,
        qualityScore: 0,
      };
    }

    // Get contacts for these distributions
    const contactIds = distributions.map((d) => d.contactId).filter((id) => id);
    const contacts = contactIds.length > 0
      ? await this.contactRepository.find({
          where: { tenantId, id: contactIds as any },
        })
      : [];

    // Calculate metrics
    const totalLeads = distributions.length;
    const contactedLeads = contacts.filter((c) => c.marketplaceMetadata?.contactedAt).length;
    const dncLeads = contacts.filter((c) => c.isOptedOut).length;
    const soldLeads = contacts.filter((c) => c.marketplaceMetadata?.sold).length;

    const contactRate = totalLeads > 0 ? (contactedLeads / totalLeads) * 100 : 0;
    const dncRate = totalLeads > 0 ? (dncLeads / totalLeads) * 100 : 0;
    const soldRate = totalLeads > 0 ? (soldLeads / totalLeads) * 100 : 0;

    // Calculate average response time (time from distribution to first contact)
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    distributions.forEach((distribution) => {
      const contact = contacts.find((c) => c.id === distribution.contactId);
      if (contact?.marketplaceMetadata?.contactedAt && distribution.createdAt) {
        const responseTime = new Date(contact.marketplaceMetadata.contactedAt).getTime() -
          new Date(distribution.createdAt).getTime();
        if (responseTime > 0) {
          totalResponseTime += responseTime;
          responseTimeCount++;
        }
      }
    });

    const averageResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;

    // Calculate quality score (weighted formula)
    // Higher contact rate = better, lower DNC rate = better, higher sold rate = better
    const qualityScore = Math.min(
      100,
      Math.max(
        0,
        contactRate * 0.4 + // 40% weight on contact rate
        (100 - dncRate) * 0.3 + // 30% weight on low DNC rate
        soldRate * 0.3, // 30% weight on sold rate
      ),
    );

    return {
      listingId,
      totalLeads,
      contactRate: Math.round(contactRate * 10) / 10,
      dncRate: Math.round(dncRate * 10) / 10,
      soldRate: Math.round(soldRate * 10) / 10,
      averageResponseTime: Math.round(averageResponseTime / 1000 / 60), // Convert to minutes
      qualityScore: Math.round(qualityScore * 10) / 10,
    };
  }

  async validateLead(contactData: {
    phoneNumber?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Phone number validation
    if (!contactData.phoneNumber) {
      errors.push('Phone number is required');
    } else {
      // Basic phone validation (remove non-digits and check length)
      const cleanedPhone = contactData.phoneNumber.replace(/\D/g, '');
      if (cleanedPhone.length < 10) {
        errors.push('Phone number must be at least 10 digits');
      }
    }

    // Email validation (optional but validate format if provided)
    if (contactData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactData.email)) {
      errors.push('Invalid email format');
    }

    // Name validation (at least first name recommended)
    if (!contactData.firstName && !contactData.lastName) {
      errors.push('At least first name or last name is recommended');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async updateListingMetricsWithQuality(tenantId: string, listingId: string): Promise<void> {
    const qualityMetrics = await this.calculateLeadQuality(tenantId, listingId);

    let metrics = await this.metricsRepository.findOne({
      where: { tenantId, listingId },
    });

    if (!metrics) {
      metrics = this.metricsRepository.create({
        tenantId,
        listingId,
        totalLeadsDelivered: qualityMetrics.totalLeads,
        contactRate: qualityMetrics.contactRate,
        dncRate: qualityMetrics.dncRate,
        soldCount: Math.round((qualityMetrics.soldRate / 100) * qualityMetrics.totalLeads),
      });
    } else {
      metrics.totalLeadsDelivered = qualityMetrics.totalLeads;
      metrics.contactRate = qualityMetrics.contactRate;
      metrics.dncRate = qualityMetrics.dncRate;
      metrics.soldCount = Math.round((qualityMetrics.soldRate / 100) * qualityMetrics.totalLeads);
    }

    await this.metricsRepository.save(metrics);
  }

  async getQualityScoreForListing(tenantId: string, listingId: string): Promise<number> {
    const metrics = await this.calculateLeadQuality(tenantId, listingId);
    return metrics.qualityScore;
  }
}


