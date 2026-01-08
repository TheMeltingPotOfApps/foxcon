import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { BillingUsage, BillingUsageType } from '../entities/billing-usage.entity';
import { Tenant } from '../entities/tenant.entity';
import { Subscription } from '../entities/subscription.entity';

@Injectable()
export class BillingUsageService {
  private readonly logger = new Logger(BillingUsageService.name);
  private stripe: Stripe;

  constructor(
    @InjectRepository(BillingUsage)
    private billingUsageRepository: Repository<BillingUsage>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    private configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-11-17.clover',
      });
    }
  }

  /**
   * Track a billable usage event
   */
  async trackUsage(data: {
    tenantId: string;
    usageType: BillingUsageType;
    quantity?: number;
    userId?: string;
    resourceId?: string;
    resourceType?: string;
    metadata?: Record<string, any>;
  }): Promise<BillingUsage> {
    const usage = this.billingUsageRepository.create({
      tenantId: data.tenantId,
      usageType: data.usageType,
      quantity: data.quantity || 1,
      userId: data.userId,
      resourceId: data.resourceId,
      resourceType: data.resourceType,
      metadata: data.metadata || {},
      billingPeriod: this.getCurrentBillingPeriod(),
    });

    // Get subscription to link usage to Stripe subscription item
    const subscription = await this.subscriptionRepository.findOne({
      where: { tenantId: data.tenantId },
      order: { createdAt: 'DESC' },
    });

    if (subscription?.stripeSubscriptionId && this.stripe) {
      try {
        // Get subscription items from Stripe
        const stripeSubscription = await this.stripe.subscriptions.retrieve(
          subscription.stripeSubscriptionId,
        );
        if (stripeSubscription.items?.data?.[0]?.id) {
          usage.stripeSubscriptionItemId = stripeSubscription.items.data[0].id;
        }
      } catch (error) {
        this.logger.warn(`Failed to get Stripe subscription for tenant ${data.tenantId}:`, error);
      }
    }

    return await this.billingUsageRepository.save(usage);
  }

  /**
   * Sync usage to Stripe billing meters (for usage-based billing)
   */
  async syncUsageToStripe(
    tenantId: string,
    usageType: BillingUsageType,
    startDate?: Date,
    endDate?: Date,
  ): Promise<number> {
    if (!this.stripe) {
      this.logger.warn('Stripe not configured, skipping usage sync');
      return 0;
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });

    if (!subscription?.stripeSubscriptionId) {
      this.logger.warn(`No active subscription found for tenant ${tenantId}`);
      return 0;
    }

    // Get meter ID for this usage type from config or metadata
    const meterId = await this.getMeterId(usageType);
    if (!meterId) {
      this.logger.warn(`No meter ID configured for usage type ${usageType}`);
      return 0;
    }

    // Query unsynced usage
    const query: any = {
      tenantId,
      usageType,
      syncedToStripe: false,
    };

    if (startDate && endDate) {
      query.createdAt = Between(startDate, endDate);
    } else {
      query.createdAt = LessThanOrEqual(endDate || new Date());
    }

    const unsyncedUsage = await this.billingUsageRepository.find({
      where: query,
      order: { createdAt: 'ASC' },
      take: 1000, // Process in batches
    });

    if (unsyncedUsage.length === 0) {
      return 0;
    }

    // Aggregate usage by day
    const usageByDay = new Map<string, number>();
    for (const usage of unsyncedUsage) {
      const day = usage.createdAt.toISOString().split('T')[0];
      const current = usageByDay.get(day) || 0;
      usageByDay.set(day, current + Number(usage.quantity));
    }

    let syncedCount = 0;

    // Create meter events for each day
    // Note: Stripe billing meters API structure varies by version
    // This feature requires Stripe billing meters to be set up in your Stripe dashboard
    // For now, we'll log usage but not sync to Stripe until the correct API method is confirmed
    this.logger.warn(
      `Usage sync to Stripe meters is not yet fully implemented. ` +
      `Usage tracking is working (${unsyncedUsage.length} records tracked), but syncing to Stripe billing meters requires ` +
      `implementing the correct Stripe API method for your Stripe API version. ` +
      `See Stripe documentation for billing.meterEvents or billing.meterEventSessions API.`
    );

    // Mark usage as tracked (but not yet synced to Stripe)
    // When Stripe meter sync is implemented, uncomment and use the correct API:
    /*
    for (const [day, quantity] of usageByDay.entries()) {
      try {
        // Example API calls (adjust based on your Stripe API version):
        // Option 1: Using meterEventSessions
        // const session = await this.stripe.billing.meterEventSessions.create({
        //   meter: meterId,
        //   identifier: tenantId,
        // });
        // const event = await this.stripe.billing.meterEvents.create({
        //   event_name: meterId,
        //   identifier: tenantId,
        //   payload: { value: quantity },
        //   timestamp: Math.floor(new Date(day).getTime() / 1000),
        // });
        
        const dayStart = new Date(day);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        await this.billingUsageRepository.update(
          {
            tenantId,
            usageType,
            createdAt: Between(dayStart, dayEnd),
            syncedToStripe: false,
          },
          {
            syncedToStripe: true,
            syncedAt: new Date(),
            stripeEventId: event.id,
          },
        );

        syncedCount += quantity;
      } catch (error) {
        this.logger.error(`Failed to sync usage for ${day}:`, error);
      }
    }
    */

    // Return 0 since we're not actually syncing yet
    // Once implemented, return syncedCount
    return 0;
  }

  /**
   * Get usage summary for a tenant
   */
  async getUsageSummary(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Record<BillingUsageType, number>> {
    const query: any = { tenantId };
    if (startDate && endDate) {
      query.createdAt = Between(startDate, endDate);
    }

    const usageRecords = await this.billingUsageRepository.find({
      where: query,
    });

    const summary: Record<string, number> = {};
    for (const usage of usageRecords) {
      summary[usage.usageType] = (summary[usage.usageType] || 0) + Number(usage.quantity);
    }

    return summary as Record<BillingUsageType, number>;
  }

  /**
   * Get usage by type for a tenant
   */
  async getUsageByType(
    tenantId: string,
    usageType: BillingUsageType,
    startDate?: Date,
    endDate?: Date,
  ): Promise<BillingUsage[]> {
    const query: any = { tenantId, usageType };
    if (startDate && endDate) {
      query.createdAt = Between(startDate, endDate);
    }

    return await this.billingUsageRepository.find({
      where: query,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get current billing period (YYYY-MM format)
   */
  private getCurrentBillingPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Get Stripe meter ID for a usage type
   * This should be configured in environment variables or database
   */
  private async getMeterId(usageType: BillingUsageType): Promise<string | null> {
    // Map usage types to meter IDs (configure these in Stripe dashboard)
    const meterIdMap: Partial<Record<BillingUsageType, string>> = {
      [BillingUsageType.SMS_SENT]: this.configService.get<string>('STRIPE_METER_SMS_SENT'),
      [BillingUsageType.CALL_DURATION_SECONDS]: this.configService.get<string>(
        'STRIPE_METER_CALL_DURATION',
      ),
      [BillingUsageType.AI_MESSAGE_GENERATED]: this.configService.get<string>(
        'STRIPE_METER_AI_MESSAGE',
      ),
      [BillingUsageType.AI_VOICE_GENERATED]: this.configService.get<string>(
        'STRIPE_METER_AI_VOICE',
      ),
    };

    return meterIdMap[usageType] || null;
  }
}

