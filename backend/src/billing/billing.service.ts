import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Tenant } from '../entities/tenant.entity';
import { Subscription, PlanType, SubscriptionStatus } from '../entities/subscription.entity';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
import { PaymentMethod, PaymentMethodType } from '../entities/payment-method.entity';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripe: Stripe;

  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(PaymentMethod)
    private paymentMethodRepository: Repository<PaymentMethod>,
    private configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not configured. Billing features will be disabled.');
    } else {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-11-17.clover',
      });
    }
  }

  // Plan configuration - prices should be set in Stripe dashboard
  private readonly planConfig: Record<PlanType, { priceId: string; name: string }> = {
    [PlanType.FREE]: {
      priceId: this.configService.get<string>('STRIPE_PRICE_FREE') || '',
      name: 'Free',
    },
    [PlanType.STARTER]: {
      priceId: this.configService.get<string>('STRIPE_PRICE_STARTER') || '',
      name: 'Starter',
    },
    [PlanType.PROFESSIONAL]: {
      priceId: this.configService.get<string>('STRIPE_PRICE_PROFESSIONAL') || '',
      name: 'Professional',
    },
    [PlanType.ENTERPRISE]: {
      priceId: this.configService.get<string>('STRIPE_PRICE_ENTERPRISE') || '',
      name: 'Enterprise',
    },
  };

  async getOrCreateStripeCustomer(tenantId: string): Promise<string> {
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (tenant.stripeCustomerId) {
      return tenant.stripeCustomerId;
    }

    // Create Stripe customer
    const customer = await this.stripe.customers.create({
      email: tenant.name, // You might want to use a contact email instead
      metadata: {
        tenantId: tenantId,
      },
    });

    tenant.stripeCustomerId = customer.id;
    await this.tenantRepository.save(tenant);

    return customer.id;
  }

  async createCheckoutSession(
    tenantId: string,
    planType: PlanType,
    successUrl?: string,
    cancelUrl?: string,
  ): Promise<{ url: string }> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const customerId = await this.getOrCreateStripeCustomer(tenantId);
    const plan = this.planConfig[planType];

    if (!plan.priceId) {
      throw new BadRequestException(`Price ID not configured for plan: ${planType}`);
    }

    const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5001';
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${baseUrl}/settings/billing?success=true`,
      cancel_url: cancelUrl || `${baseUrl}/settings/billing?canceled=true`,
      metadata: {
        tenantId: tenantId,
        planType: planType,
      },
    });

    return { url: session.url || '' };
  }

  async createPortalSession(tenantId: string, returnUrl?: string): Promise<{ url: string }> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (!tenant || !tenant.stripeCustomerId) {
      throw new NotFoundException('Stripe customer not found');
    }

    const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5001';
    const session = await this.stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: returnUrl || `${baseUrl}/settings/billing`,
    });

    return { url: session.url };
  }

  async getSubscription(tenantId: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async getInvoices(tenantId: string): Promise<Invoice[]> {
    return this.invoiceRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async getPaymentMethods(tenantId: string): Promise<PaymentMethod[]> {
    return this.paymentMethodRepository.find({
      where: { tenantId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async cancelSubscription(tenantId: string, cancelAtPeriodEnd: boolean = true): Promise<Subscription> {
    const subscription = await this.getSubscription(tenantId);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const stripeSubscription = await this.stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: cancelAtPeriodEnd,
      },
    );

    subscription.cancelAtPeriodEnd = cancelAtPeriodEnd;
    if (cancelAtPeriodEnd) {
      subscription.canceledAt = new Date();
    }
    subscription.status = this.mapStripeStatus(stripeSubscription.status);
    await this.subscriptionRepository.save(subscription);

    return subscription;
  }

  async handleWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case 'invoice.created':
          await this.handleInvoiceCreated(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.finalized':
          await this.handleInvoiceFinalized(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_action_required':
          await this.handleInvoicePaymentActionRequired(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.upcoming':
          await this.handleInvoiceUpcoming(event.data.object as Stripe.Invoice);
          break;
        case 'payment_method.attached':
          await this.handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
          break;
        case 'payment_method.detached':
          await this.handlePaymentMethodDetached(event.data.object as Stripe.PaymentMethod);
          break;
        case 'customer.updated':
          await this.handleCustomerUpdated(event.data.object as Stripe.Customer);
          break;
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        default:
          this.logger.log(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Error handling webhook event ${event.type}:`, error);
      throw error;
    }
  }

  private async handleSubscriptionUpdate(stripeSubscription: Stripe.Subscription): Promise<void> {
    const tenantId = stripeSubscription.metadata?.tenantId;
    if (!tenantId) {
      this.logger.warn('Subscription update missing tenantId metadata');
      return;
    }

    let subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (!subscription) {
      subscription = new Subscription();
      subscription.stripeSubscriptionId = stripeSubscription.id;
      subscription.tenantId = tenantId;
    }

    subscription.stripeCustomerId = typeof stripeSubscription.customer === 'string' 
      ? stripeSubscription.customer 
      : stripeSubscription.customer.id;
    subscription.status = this.mapStripeStatus(stripeSubscription.status);
    subscription.currentPeriodStart = new Date((stripeSubscription as any).current_period_start * 1000);
    subscription.currentPeriodEnd = new Date((stripeSubscription as any).current_period_end * 1000);
    subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end || false;

    if (stripeSubscription.items?.data?.[0]?.price?.id) {
      subscription.stripePriceId = stripeSubscription.items.data[0].price.id;
      // Map plan type from price ID
      subscription.planType = this.mapPriceIdToPlanType(subscription.stripePriceId);
    }

    // If plan type is in metadata, use it
    if (stripeSubscription.metadata?.planType) {
      subscription.planType = stripeSubscription.metadata.planType as PlanType;
    }

    await this.subscriptionRepository.save(subscription);

    // Update tenant billing info
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (tenant) {
      tenant.stripeCustomerId = typeof stripeSubscription.customer === 'string'
        ? stripeSubscription.customer
        : stripeSubscription.customer.id;
      if (!tenant.billing) {
        tenant.billing = {};
      }
      tenant.billing.subscriptionId = subscription.id;
      tenant.billing.planType = subscription.planType;
      await this.tenantRepository.save(tenant);
    }
  }

  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (subscription) {
      subscription.status = SubscriptionStatus.CANCELED;
      subscription.canceledAt = new Date();
      await this.subscriptionRepository.save(subscription);
    }
  }

  private async handleInvoicePaid(stripeInvoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = typeof (stripeInvoice as any).subscription === 'string' 
      ? (stripeInvoice as any).subscription 
      : (stripeInvoice as any).subscription?.id;
    const tenantId = stripeInvoice.metadata?.tenantId || (subscriptionId ? await this.getTenantIdFromSubscription(subscriptionId) : null);
    if (!tenantId) {
      this.logger.warn('Invoice paid missing tenantId metadata');
      return;
    }

    let invoice = await this.invoiceRepository.findOne({
      where: { stripeInvoiceId: stripeInvoice.id },
    });

    if (!invoice) {
      invoice = new Invoice();
      invoice.stripeInvoiceId = stripeInvoice.id;
      invoice.tenantId = tenantId;
    }

    invoice.stripeCustomerId = stripeInvoice.customer as string;
    invoice.status = InvoiceStatus.PAID;
    invoice.amount = stripeInvoice.amount_paid / 100; // Convert from cents
    invoice.amountPaid = stripeInvoice.amount_paid / 100;
    invoice.currency = stripeInvoice.currency;
    invoice.invoicePdf = stripeInvoice.invoice_pdf || null;
    invoice.hostedInvoiceUrl = stripeInvoice.hosted_invoice_url || null;
    invoice.paidAt = stripeInvoice.status_transitions?.paid_at
      ? new Date(stripeInvoice.status_transitions.paid_at * 1000)
      : new Date();

    if (stripeInvoice.lines?.data) {
      invoice.lineItems = stripeInvoice.lines.data.map((line) => ({
        description: line.description || '',
        amount: (line.amount || 0) / 100,
        quantity: line.quantity || 1,
      }));
    }

    await this.invoiceRepository.save(invoice);
  }

  private async handleInvoicePaymentFailed(stripeInvoice: Stripe.Invoice): Promise<void> {
    const tenantId = stripeInvoice.metadata?.tenantId;
    if (!tenantId) {
      return;
    }

    let invoice = await this.invoiceRepository.findOne({
      where: { stripeInvoiceId: stripeInvoice.id },
    });

    if (!invoice) {
      invoice = new Invoice();
      invoice.stripeInvoiceId = stripeInvoice.id;
      invoice.tenantId = tenantId;
    }

    invoice.status = InvoiceStatus.UNCOLLECTIBLE;
    invoice.amount = stripeInvoice.amount_due / 100;
    await this.invoiceRepository.save(invoice);
  }

  private async handlePaymentMethodAttached(stripePaymentMethod: Stripe.PaymentMethod): Promise<void> {
    const customerId = stripePaymentMethod.customer as string;
    const tenant = await this.tenantRepository.findOne({
      where: { stripeCustomerId: customerId },
    });

    if (!tenant) {
      return;
    }

    let paymentMethod = await this.paymentMethodRepository.findOne({
      where: { stripePaymentMethodId: stripePaymentMethod.id },
    });

    if (!paymentMethod) {
      paymentMethod = new PaymentMethod();
      paymentMethod.stripePaymentMethodId = stripePaymentMethod.id;
      paymentMethod.tenantId = tenant.id;
    }

    paymentMethod.stripeCustomerId = customerId;
    paymentMethod.type =
      stripePaymentMethod.type === 'card' ? PaymentMethodType.CARD : PaymentMethodType.BANK_ACCOUNT;

    if (stripePaymentMethod.card) {
      paymentMethod.cardDetails = {
        brand: stripePaymentMethod.card.brand,
        last4: stripePaymentMethod.card.last4,
        expMonth: stripePaymentMethod.card.exp_month,
        expYear: stripePaymentMethod.card.exp_year,
      };
    }

    // Check if this is the default payment method
    const customer = await this.stripe.customers.retrieve(customerId);
    if (customer && !customer.deleted && 'invoice_settings' in customer && customer.invoice_settings?.default_payment_method === stripePaymentMethod.id) {
      // Unset other default methods
      await this.paymentMethodRepository.update(
        { tenantId: tenant.id, isDefault: true },
        { isDefault: false },
      );
      paymentMethod.isDefault = true;
    }

    await this.paymentMethodRepository.save(paymentMethod);
  }

  private async getTenantIdFromSubscription(subscriptionId: string): Promise<string | null> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: subscriptionId },
    });
    return subscription?.tenantId || null;
  }

  private mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    const statusMap: Partial<Record<Stripe.Subscription.Status, SubscriptionStatus>> = {
      active: SubscriptionStatus.ACTIVE,
      canceled: SubscriptionStatus.CANCELED,
      past_due: SubscriptionStatus.PAST_DUE,
      unpaid: SubscriptionStatus.UNPAID,
      trialing: SubscriptionStatus.TRIALING,
      incomplete: SubscriptionStatus.INCOMPLETE,
      incomplete_expired: SubscriptionStatus.INCOMPLETE_EXPIRED,
    };
    return statusMap[status] || SubscriptionStatus.INCOMPLETE;
  }

  private mapPriceIdToPlanType(priceId: string): PlanType {
    const freePriceId = this.configService.get<string>('STRIPE_PRICE_FREE');
    const starterPriceId = this.configService.get<string>('STRIPE_PRICE_STARTER');
    const professionalPriceId = this.configService.get<string>('STRIPE_PRICE_PROFESSIONAL');
    const enterprisePriceId = this.configService.get<string>('STRIPE_PRICE_ENTERPRISE');

    if (priceId === freePriceId) return PlanType.FREE;
    if (priceId === starterPriceId) return PlanType.STARTER;
    if (priceId === professionalPriceId) return PlanType.PROFESSIONAL;
    if (priceId === enterprisePriceId) return PlanType.ENTERPRISE;

    return PlanType.FREE; // Default
  }

  private async handleInvoiceCreated(stripeInvoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = typeof (stripeInvoice as any).subscription === 'string' 
      ? (stripeInvoice as any).subscription 
      : (stripeInvoice as any).subscription?.id;
    const tenantId = stripeInvoice.metadata?.tenantId || (subscriptionId ? await this.getTenantIdFromSubscription(subscriptionId) : null);
    if (!tenantId) {
      this.logger.warn('Invoice created missing tenantId metadata');
      return;
    }

    let invoice = await this.invoiceRepository.findOne({
      where: { stripeInvoiceId: stripeInvoice.id },
    });

    if (!invoice) {
      invoice = new Invoice();
      invoice.stripeInvoiceId = stripeInvoice.id;
      invoice.tenantId = tenantId;
    }

    invoice.stripeCustomerId = stripeInvoice.customer as string;
    invoice.status = InvoiceStatus.DRAFT;
    invoice.amount = stripeInvoice.amount_due / 100;
    invoice.currency = stripeInvoice.currency;
    invoice.dueDate = stripeInvoice.due_date ? new Date(stripeInvoice.due_date * 1000) : null;

    if (stripeInvoice.lines?.data) {
      invoice.lineItems = stripeInvoice.lines.data.map((line) => ({
        description: line.description || '',
        amount: (line.amount || 0) / 100,
        quantity: line.quantity || 1,
      }));
    }

    await this.invoiceRepository.save(invoice);
  }

  private async handleInvoiceFinalized(stripeInvoice: Stripe.Invoice): Promise<void> {
    const invoice = await this.invoiceRepository.findOne({
      where: { stripeInvoiceId: stripeInvoice.id },
    });

    if (invoice) {
      invoice.status = InvoiceStatus.OPEN;
      invoice.invoicePdf = stripeInvoice.invoice_pdf || null;
      invoice.hostedInvoiceUrl = stripeInvoice.hosted_invoice_url || null;
      await this.invoiceRepository.save(invoice);
    }
  }

  private async handleInvoicePaymentActionRequired(stripeInvoice: Stripe.Invoice): Promise<void> {
    const invoice = await this.invoiceRepository.findOne({
      where: { stripeInvoiceId: stripeInvoice.id },
    });

    if (invoice) {
      invoice.status = InvoiceStatus.OPEN;
      await this.invoiceRepository.save(invoice);
    }
  }

  private async handleInvoiceUpcoming(stripeInvoice: Stripe.Invoice): Promise<void> {
    // Log upcoming invoice for notification purposes
    const subscriptionId = typeof (stripeInvoice as any).subscription === 'string' 
      ? (stripeInvoice as any).subscription 
      : (stripeInvoice as any).subscription?.id;
    const tenantId = stripeInvoice.metadata?.tenantId || (subscriptionId ? await this.getTenantIdFromSubscription(subscriptionId) : null);
    
    if (tenantId) {
      this.logger.log(`Upcoming invoice for tenant ${tenantId}: ${stripeInvoice.id}, amount: ${stripeInvoice.amount_due / 100}`);
    }
  }

  private async handlePaymentMethodDetached(stripePaymentMethod: Stripe.PaymentMethod): Promise<void> {
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { stripePaymentMethodId: stripePaymentMethod.id },
    });

    if (paymentMethod) {
      await this.paymentMethodRepository.remove(paymentMethod);
    }
  }

  private async handleCustomerUpdated(stripeCustomer: Stripe.Customer): Promise<void> {
    const tenant = await this.tenantRepository.findOne({
      where: { stripeCustomerId: stripeCustomer.id },
    });

    if (tenant) {
      // Update tenant metadata if needed
      // You can sync customer metadata to tenant here
      await this.tenantRepository.save(tenant);
    }
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const tenantId = session.metadata?.tenantId;
    if (!tenantId) {
      this.logger.warn('Checkout session completed missing tenantId metadata');
      return;
    }

    // The subscription will be created/updated via subscription.created/updated webhooks
    // This handler can be used for additional post-checkout logic
    this.logger.log(`Checkout session completed for tenant ${tenantId}, session: ${session.id}`);
  }
}

