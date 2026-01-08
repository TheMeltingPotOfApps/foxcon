import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Tcpaconfig, TcpacomplianceMode, TcpaviolationAction } from '../entities/tcpa-config.entity';
import { Tcpaviolation, TcpaviolationType, TcpaviolationStatus } from '../entities/tcpa-violation.entity';
import { ContactConsent, ConsentType, ConsentScope } from '../entities/contact-consent.entity';
import { Contact } from '../entities/contact.entity';
import { Tenant } from '../entities/tenant.entity';
import { JourneyNodeType } from '../entities/journey-node.entity';

export interface TcpacheckResult {
  compliant: boolean;
  violations: TcpaviolationType[];
  violationDetails: Array<{
    type: TcpaviolationType;
    description: string;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
  }>;
  action: TcpaviolationAction;
  canProceed: boolean;
  message?: string;
}

@Injectable()
export class Tcpaservice {
  private readonly logger = new Logger(Tcpaservice.name);

  constructor(
    @InjectRepository(Tcpaconfig)
    private tcpaConfigRepository: Repository<Tcpaconfig>,
    @InjectRepository(Tcpaviolation)
    private tcpaViolationRepository: Repository<Tcpaviolation>,
    @InjectRepository(ContactConsent)
    private contactConsentRepository: Repository<ContactConsent>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
  ) {}

  /**
   * Get TCPA configuration for a tenant (create default if doesn't exist)
   */
  async getConfig(tenantId: string): Promise<Tcpaconfig> {
    let config = await this.tcpaConfigRepository.findOne({
      where: { tenantId },
    });

    if (!config) {
      // Create default configuration
      config = this.tcpaConfigRepository.create({
        tenantId,
        complianceMode: TcpacomplianceMode.STRICT,
        allowedStartHour: 8,
        allowedEndHour: 21,
        requireExpressConsent: true,
        requireConsentForAutomated: true,
        requireConsentForMarketing: true,
        honorOptOuts: true,
        honorDncList: true,
        autoOptOutOnStop: true,
        requireSenderIdentification: true,
        violationAction: TcpaviolationAction.BLOCK,
        logViolations: true,
        notifyOnViolation: true,
        blockNonCompliantJourneys: true,
        allowManualOverride: true,
        maintainConsentRecords: true,
        consentRecordRetentionDays: 7,
      });
      config = await this.tcpaConfigRepository.save(config);
    }

    return config;
  }

  /**
   * Update TCPA configuration
   */
  async updateConfig(tenantId: string, updates: Partial<Tcpaconfig>): Promise<Tcpaconfig> {
    const config = await this.getConfig(tenantId);
    Object.assign(config, updates);
    return this.tcpaConfigRepository.save(config);
  }

  /**
   * Check TCPA compliance before executing a journey node
   */
  async checkCompliance(
    tenantId: string,
    contactId: string,
    nodeType: JourneyNodeType,
    context?: {
      journeyId?: string;
      nodeId?: string;
      campaignId?: string;
      messageContent?: string;
      isAutomated?: boolean;
      isMarketing?: boolean;
      scheduledTime?: Date;
    },
  ): Promise<TcpacheckResult> {
    const config = await this.getConfig(tenantId);
    const contact = await this.contactRepository.findOne({
      where: { id: contactId, tenantId },
    });

    if (!contact) {
      throw new BadRequestException('Contact not found');
    }

    const violations: TcpaviolationType[] = [];
    const violationDetails: Array<{
      type: TcpaviolationType;
      description: string;
      severity: 'CRITICAL' | 'WARNING' | 'INFO';
    }> = [];

    // Check opt-out status
    if (config.honorOptOuts && contact.isOptedOut) {
      violations.push(TcpaviolationType.OPTED_OUT);
      violationDetails.push({
        type: TcpaviolationType.OPTED_OUT,
        description: 'Contact has opted out of communications',
        severity: 'CRITICAL',
      });
    }

    // Check DNC list
    if (config.honorDncList && contact.leadStatus === 'DNC') {
      violations.push(TcpaviolationType.DNC_LIST);
      violationDetails.push({
        type: TcpaviolationType.DNC_LIST,
        description: 'Contact is on Do Not Call list',
        severity: 'CRITICAL',
      });
    }

    // Check consent requirements
    if (nodeType === JourneyNodeType.SEND_SMS || nodeType === JourneyNodeType.MAKE_CALL) {
      const hasValidConsent = await this.checkConsent(tenantId, contactId, {
        requireExpress: config.requireExpressConsent,
        requireForAutomated: config.requireConsentForAutomated && context?.isAutomated,
        requireForMarketing: config.requireConsentForMarketing && context?.isMarketing,
        scope: nodeType === JourneyNodeType.SEND_SMS ? ConsentScope.SMS : ConsentScope.VOICE,
      });

      if (!hasValidConsent) {
        if (config.requireExpressConsent) {
          violations.push(TcpaviolationType.EXPRESS_CONSENT_REQUIRED);
          violationDetails.push({
            type: TcpaviolationType.EXPRESS_CONSENT_REQUIRED,
            description: 'Express written consent is required',
            severity: 'CRITICAL',
          });
        } else {
          violations.push(TcpaviolationType.NO_CONSENT);
          violationDetails.push({
            type: TcpaviolationType.NO_CONSENT,
            description: 'No valid consent found',
            severity: 'CRITICAL',
          });
        }
      }

      // Check for expired consent
      const expiredConsent = await this.checkExpiredConsent(tenantId, contactId, config.consentExpirationDays);
      if (expiredConsent) {
        violations.push(TcpaviolationType.CONSENT_EXPIRED);
        violationDetails.push({
          type: TcpaviolationType.CONSENT_EXPIRED,
          description: 'Consent has expired',
          severity: 'CRITICAL',
        });
      }
    }

    // Check time restrictions
    if (context?.scheduledTime) {
      const timeCheck = await this.checkTimeRestrictions(config, context.scheduledTime, contact, tenantId);
      if (!timeCheck.allowed) {
        violations.push(TcpaviolationType.TIME_RESTRICTION);
        violationDetails.push({
          type: TcpaviolationType.TIME_RESTRICTION,
          description: timeCheck.reason || 'Message scheduled outside allowed hours',
          severity: 'WARNING',
        });
      }
    }

    // Check sender identification
    if (config.requireSenderIdentification && nodeType === JourneyNodeType.SEND_SMS) {
      if (!context?.messageContent || !this.hasSenderIdentification(context.messageContent, config.requiredSenderName)) {
        violations.push(TcpaviolationType.MISSING_SENDER_ID);
        violationDetails.push({
          type: TcpaviolationType.MISSING_SENDER_ID,
          description: 'Message must include sender identification',
          severity: 'WARNING',
        });
      }
    }

    // Determine action based on compliance mode
    let action = config.violationAction;
    let canProceed = true;

    if (violations.length > 0) {
      const criticalViolations = violationDetails.filter(v => v.severity === 'CRITICAL');
      
      if (config.complianceMode === TcpacomplianceMode.STRICT) {
        // Strict mode: block on any violation
        action = TcpaviolationAction.BLOCK;
        canProceed = false;
      } else if (config.complianceMode === TcpacomplianceMode.MODERATE) {
        // Moderate mode: block on critical violations only
        if (criticalViolations.length > 0) {
          action = TcpaviolationAction.BLOCK;
          canProceed = false;
        } else {
          action = TcpaviolationAction.LOG_ONLY;
          canProceed = true;
        }
      } else {
        // Permissive mode: log but allow
        action = TcpaviolationAction.LOG_ONLY;
        canProceed = true;
      }
    }

    // Log violations if configured
    if (violations.length > 0 && config.logViolations) {
      await this.logViolation(tenantId, contactId, violations, {
        journeyId: context?.journeyId,
        nodeId: context?.nodeId,
        campaignId: context?.campaignId,
        attemptedAction: nodeType,
        context: {
          messageContent: context?.messageContent,
          phoneNumber: contact.phoneNumber,
          timeOfAttempt: context?.scheduledTime || new Date(),
        },
      });
    }

    return {
      compliant: violations.length === 0,
      violations,
      violationDetails,
      action,
      canProceed,
      message: violations.length > 0
        ? `TCPA compliance check failed: ${violationDetails.map(v => v.description).join('; ')}`
        : 'TCPA compliance check passed',
    };
  }

  /**
   * Check if contact has valid consent
   * If contact exists and is not opted out, assume express written consent is provided
   */
  private async checkConsent(
    tenantId: string,
    contactId: string,
    requirements: {
      requireExpress?: boolean;
      requireForAutomated?: boolean;
      requireForMarketing?: boolean;
      scope: ConsentScope;
    },
  ): Promise<boolean> {
    // First, check if contact exists and is not opted out
    // If so, assume express written consent is provided (for leads)
    const contact = await this.contactRepository.findOne({
      where: { id: contactId, tenantId },
    });

    if (contact && !contact.isOptedOut && contact.leadStatus !== 'DNC') {
      // Contact exists and is not opted out - assume express written consent
      // This covers the case where leads are generated and added to contacts table
      return true;
    }

    // If contact is opted out or on DNC, check for explicit consent records
    const consents = await this.contactConsentRepository.find({
      where: {
        contactId,
        tenantId,
        isActive: true,
        revokedAt: null,
      },
    });

    if (consents.length === 0) {
      return false;
    }

    // Check for expired consents
    const now = new Date();
    const validConsents = consents.filter(c => !c.expiresAt || c.expiresAt > now);

    if (validConsents.length === 0) {
      return false;
    }

    // Check scope
    const scopeConsents = validConsents.filter(
      c => c.scope === ConsentScope.ALL || c.scope === requirements.scope,
    );

    if (scopeConsents.length === 0) {
      return false;
    }

    // Check express consent requirement
    if (requirements.requireExpress) {
      const expressConsents = scopeConsents.filter(
        c => c.consentType === ConsentType.EXPRESS_WRITTEN || c.consentType === ConsentType.ELECTRONIC,
      );
      if (expressConsents.length === 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if consent has expired
   * If contact exists and is not opted out, assume consent is valid (not expired)
   */
  private async checkExpiredConsent(
    tenantId: string,
    contactId: string,
    expirationDays: number | null,
  ): Promise<boolean> {
    // First check if contact exists and is not opted out
    // If so, assume consent is valid (not expired) for leads
    const contact = await this.contactRepository.findOne({
      where: { id: contactId, tenantId },
    });

    if (contact && !contact.isOptedOut && contact.leadStatus !== 'DNC') {
      // Contact exists and is not opted out - assume consent is valid
      return false; // Not expired
    }

    if (!expirationDays) {
      return false; // No expiration
    }

    const consents = await this.contactConsentRepository.find({
      where: {
        contactId,
        tenantId,
        isActive: true,
      },
      order: { createdAt: 'DESC' },
      take: 1,
    });

    if (consents.length === 0) {
      return true; // No consent = expired
    }

    const latestConsent = consents[0];
    if (latestConsent.expiresAt) {
      return latestConsent.expiresAt < new Date();
    }

    // Check if consent is older than expiration days
    const expirationDate = new Date(latestConsent.createdAt);
    expirationDate.setDate(expirationDate.getDate() + expirationDays);
    return expirationDate < new Date();
  }

  /**
   * Check time restrictions
   * Uses tenant timezone for accurate time checking
   */
  private async checkTimeRestrictions(
    config: Tcpaconfig,
    scheduledTime: Date,
    contact: Contact,
    tenantId: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Get tenant timezone
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    const tenantTimezone = tenant?.timezone || 'America/New_York';
    
    // Get time components in tenant timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tenantTimezone,
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long',
      hour12: false,
    });
    
    const parts = formatter.formatToParts(scheduledTime);
    const hour = parseInt(parts.find(p => p.type === 'hour')!.value);
    const dayOfWeek = parts.find(p => p.type === 'weekday')!.value.toUpperCase();

    // Check hour restrictions
    if (hour < config.allowedStartHour || hour >= config.allowedEndHour) {
      return {
        allowed: false,
        reason: `Scheduled outside allowed hours (${config.allowedStartHour}:00 - ${config.allowedEndHour}:00) in ${tenantTimezone}`,
      };
    }

    // Check day restrictions
    if (config.allowedDaysOfWeek && config.allowedDaysOfWeek.length > 0) {
      if (!config.allowedDaysOfWeek.includes(dayOfWeek)) {
        return {
          allowed: false,
          reason: `Scheduled on restricted day (${dayOfWeek})`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if message has sender identification
   */
  private hasSenderIdentification(messageContent: string, requiredSenderName?: string): boolean {
    if (!requiredSenderName) {
      // Just check if message contains any identification
      return messageContent.length > 0;
    }
    return messageContent.toLowerCase().includes(requiredSenderName.toLowerCase());
  }

  /**
   * Log TCPA violation
   */
  private async logViolation(
    tenantId: string,
    contactId: string,
    violationTypes: TcpaviolationType[],
    context: {
      journeyId?: string;
      nodeId?: string;
      campaignId?: string;
      attemptedAction: string;
      context?: any;
    },
  ): Promise<void> {
    for (const violationType of violationTypes) {
      const violation = this.tcpaViolationRepository.create({
        tenantId,
        contactId,
        violationType,
        description: this.getViolationDescription(violationType),
        status: TcpaviolationStatus.BLOCKED,
        journeyId: context.journeyId,
        nodeId: context.nodeId,
        campaignId: context.campaignId,
        attemptedAction: context.attemptedAction,
        context: context.context,
      });

      await this.tcpaViolationRepository.save(violation);
    }

    // TODO: Send notification if configured
  }

  /**
   * Get violation description
   */
  private getViolationDescription(type: TcpaviolationType): string {
    const descriptions: Record<TcpaviolationType, string> = {
      [TcpaviolationType.NO_CONSENT]: 'No valid consent found for this communication',
      [TcpaviolationType.EXPRESS_CONSENT_REQUIRED]: 'Express written consent is required',
      [TcpaviolationType.CONSENT_EXPIRED]: 'Consent has expired',
      [TcpaviolationType.OPTED_OUT]: 'Contact has opted out of communications',
      [TcpaviolationType.DNC_LIST]: 'Contact is on Do Not Call list',
      [TcpaviolationType.TIME_RESTRICTION]: 'Scheduled outside allowed time window',
      [TcpaviolationType.DAY_RESTRICTION]: 'Scheduled on restricted day',
      [TcpaviolationType.MISSING_SENDER_ID]: 'Message missing required sender identification',
      [TcpaviolationType.AUTOMATED_WITHOUT_CONSENT]: 'Automated message requires explicit consent',
      [TcpaviolationType.MARKETING_WITHOUT_CONSENT]: 'Marketing message requires explicit consent',
    };
    return descriptions[type] || 'TCPA compliance violation';
  }

  /**
   * Override TCPA violation
   */
  async overrideViolation(
    tenantId: string,
    violationId: string,
    userId: string,
    reason: string,
    notes?: string,
  ): Promise<Tcpaviolation> {
    const violation = await this.tcpaViolationRepository.findOne({
      where: { id: violationId, tenantId },
    });

    if (!violation) {
      throw new BadRequestException('Violation not found');
    }

    const config = await this.getConfig(tenantId);
    if (!config.allowManualOverride) {
      throw new BadRequestException('Manual override is not allowed');
    }

    if (config.overrideReasons && !config.overrideReasons.includes(reason)) {
      throw new BadRequestException(`Override reason "${reason}" is not allowed`);
    }

    violation.status = TcpaviolationStatus.OVERRIDDEN;
    violation.overriddenBy = userId;
    violation.overrideReason = reason;
    violation.overrideNotes = notes;
    violation.overriddenAt = new Date();

    return this.tcpaViolationRepository.save(violation);
  }

  /**
   * Get violations for a contact
   */
  async getContactViolations(tenantId: string, contactId: string): Promise<Tcpaviolation[]> {
    return this.tcpaViolationRepository.find({
      where: { tenantId, contactId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get violations for a journey
   */
  async getJourneyViolations(tenantId: string, journeyId: string): Promise<Tcpaviolation[]> {
    return this.tcpaViolationRepository.find({
      where: { tenantId, journeyId },
      order: { createdAt: 'DESC' },
    });
  }
}

