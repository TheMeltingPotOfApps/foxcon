import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from '../entities/template.entity';
import { Tenant } from '../entities/tenant.entity';
import { Message } from '../entities/message.entity';

export interface ComplianceCheck {
  rule: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ComplianceResult {
  templateId: string;
  templateName: string;
  tenantId: string;
  tenantName: string;
  overallStatus: 'compliant' | 'non_compliant' | 'needs_review';
  complianceScore: number; // 0-100
  checks: ComplianceCheck[];
  lastChecked: Date;
}

export interface TenantComplianceSummary {
  tenantId: string;
  tenantName: string;
  overallStatus: 'compliant' | 'non_compliant' | 'needs_review';
  complianceScore: number;
  totalTemplates: number;
  compliantTemplates: number;
  nonCompliantTemplates: number;
  needsReviewTemplates: number;
  lastChecked: Date;
  issues: {
    critical: number;
    warnings: number;
    info: number;
  };
}

@Injectable()
export class ComplianceService {
  constructor(
    @InjectRepository(Template)
    private templateRepository: Repository<Template>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  /**
   * Check SMS compliance standards
   * Based on TCPA, CAN-SPAM, and carrier guidelines
   */
  async checkTemplateCompliance(template: Template): Promise<ComplianceCheck[]> {
    const checks: ComplianceCheck[] = [];
    
    // Get the latest template version content
    const templateWithVersions = await this.templateRepository.findOne({
      where: { id: template.id },
      relations: ['versions'],
    });
    
    // Get the latest version's content
    const latestVersion = templateWithVersions?.versions?.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    
    const content = latestVersion?.content || template.name || '';

    // 1. Opt-out requirement (TCPA/CAN-SPAM)
    if (!content.toLowerCase().includes('stop') && 
        !content.toLowerCase().includes('unsubscribe') &&
        !content.toLowerCase().includes('opt-out') &&
        !content.toLowerCase().includes('opt out')) {
      checks.push({
        rule: 'opt_out_required',
        passed: false,
        message: 'SMS must include opt-out instructions (STOP, UNSUBSCRIBE, or OPT-OUT)',
        severity: 'error',
      });
    } else {
      checks.push({
        rule: 'opt_out_required',
        passed: true,
        message: 'Opt-out instructions found',
        severity: 'info',
      });
    }

    // 2. Message length (SMS 160 character limit, or 1600 for concatenated)
    const length = content.length;
    if (length > 1600) {
      checks.push({
        rule: 'message_length',
        passed: false,
        message: `Message exceeds maximum length (${length}/1600 characters). May be split into multiple messages.`,
        severity: 'warning',
      });
    } else if (length > 160) {
      checks.push({
        rule: 'message_length',
        passed: true,
        message: `Message will be split into multiple SMS (${length} characters)`,
        severity: 'info',
      });
    } else {
      checks.push({
        rule: 'message_length',
        passed: true,
        message: `Message length is optimal (${length}/160 characters)`,
        severity: 'info',
      });
    }

    // 3. Prohibited content (carrier guidelines)
    const prohibitedWords = ['free', 'win', 'winner', 'prize', 'congratulations'];
    const hasProhibitedContent = prohibitedWords.some(word => 
      content.toLowerCase().includes(word)
    );
    if (hasProhibitedContent) {
      checks.push({
        rule: 'prohibited_content',
        passed: false,
        message: 'Message contains words that may trigger carrier filtering (free, win, prize, etc.)',
        severity: 'warning',
      });
    } else {
      checks.push({
        rule: 'prohibited_content',
        passed: true,
        message: 'No prohibited content detected',
        severity: 'info',
      });
    }

    // 4. URL shorteners (some carriers block these)
    const urlShortenerPattern = /(bit\.ly|tinyurl|goo\.gl|t\.co|ow\.ly)/i;
    if (urlShortenerPattern.test(content)) {
      checks.push({
        rule: 'url_shorteners',
        passed: false,
        message: 'URL shorteners may be blocked by carriers. Use full URLs when possible.',
        severity: 'warning',
      });
    } else {
      checks.push({
        rule: 'url_shorteners',
        passed: true,
        message: 'No URL shorteners detected',
        severity: 'info',
      });
    }

    // 5. Required sender identification
    if (!template.name && content.length < 50) {
      checks.push({
        rule: 'sender_identification',
        passed: false,
        message: 'Message should identify the sender or business name',
        severity: 'warning',
      });
    } else {
      checks.push({
        rule: 'sender_identification',
        passed: true,
        message: 'Sender identification appears adequate',
        severity: 'info',
      });
    }

    // 6. Frequency disclosure (if applicable)
    if (content.toLowerCase().includes('daily') || 
        content.toLowerCase().includes('weekly') ||
        content.toLowerCase().includes('monthly')) {
      checks.push({
        rule: 'frequency_disclosure',
        passed: true,
        message: 'Message frequency is disclosed',
        severity: 'info',
      });
    }

    // 7. Link safety (check for suspicious URLs)
    const urlPattern = /https?:\/\/[^\s]+/gi;
    const urls = content.match(urlPattern) || [];
    const suspiciousDomains = ['bit.ly', 'tinyurl.com', 't.co'];
    const hasSuspiciousUrls = urls.some(url => 
      suspiciousDomains.some(domain => url.includes(domain))
    );
    if (hasSuspiciousUrls) {
      checks.push({
        rule: 'link_safety',
        passed: false,
        message: 'Message contains shortened URLs that may be flagged',
        severity: 'warning',
      });
    }

    // 8. All caps check (may trigger spam filters)
    const capsRatio = (content.match(/[A-Z]/g) || []).length / Math.max(content.length, 1);
    if (capsRatio > 0.5 && content.length > 20) {
      checks.push({
        rule: 'excessive_caps',
        passed: false,
        message: 'Excessive use of capital letters may trigger spam filters',
        severity: 'warning',
      });
    } else {
      checks.push({
        rule: 'excessive_caps',
        passed: true,
        message: 'Capitalization is appropriate',
        severity: 'info',
      });
    }

    // 9. Special characters (may cause encoding issues)
    const specialCharPattern = /[^\w\s@.,!?\-:;()]/g;
    const specialChars = content.match(specialCharPattern) || [];
    if (specialChars.length > 5) {
      checks.push({
        rule: 'special_characters',
        passed: false,
        message: 'Excessive special characters may cause encoding issues',
        severity: 'warning',
      });
    }

    // 10. Phone number format (should not include phone numbers in content)
    const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/;
    if (phonePattern.test(content)) {
      checks.push({
        rule: 'phone_in_content',
        passed: false,
        message: 'Phone numbers in message content may violate carrier policies',
        severity: 'warning',
      });
    }

    return checks;
  }

  /**
   * Calculate compliance score and status
   */
  calculateComplianceStatus(checks: ComplianceCheck[]): {
    status: 'compliant' | 'non_compliant' | 'needs_review';
    score: number;
  } {
    const totalChecks = checks.length;
    const errorCount = checks.filter(c => c.severity === 'error' && !c.passed).length;
    const warningCount = checks.filter(c => c.severity === 'warning' && !c.passed).length;
    const passedCount = checks.filter(c => c.passed).length;

    // Calculate score (errors = -20, warnings = -5, passed = +10)
    let score = 100;
    score -= errorCount * 20;
    score -= warningCount * 5;
    score = Math.max(0, Math.min(100, score));

    let status: 'compliant' | 'non_compliant' | 'needs_review';
    if (errorCount > 0) {
      status = 'non_compliant';
    } else if (warningCount > 2) {
      status = 'needs_review';
    } else {
      status = 'compliant';
    }

    return { status, score };
  }

  /**
   * Check a single template for compliance
   */
  async checkTemplate(templateId: string): Promise<ComplianceResult> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
      relations: ['versions'],
    });

    if (!template) {
      throw new Error('Template not found');
    }

    const checks = await this.checkTemplateCompliance(template);
    const { status, score } = this.calculateComplianceStatus(checks);

    // Fetch tenant name separately
    const tenant = await this.tenantRepository.findOne({
      where: { id: template.tenantId },
    });

    return {
      templateId: template.id,
      templateName: template.name,
      tenantId: template.tenantId,
      tenantName: tenant?.name || 'Unknown',
      overallStatus: status,
      complianceScore: score,
      checks,
      lastChecked: new Date(),
    };
  }

  /**
   * Check all templates for a tenant
   */
  async checkTenantTemplates(tenantId: string): Promise<ComplianceResult[]> {
    const templates = await this.templateRepository.find({
      where: { tenantId },
      relations: ['versions'],
    });

    // Fetch tenant name once
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });
    const tenantName = tenant?.name || 'Unknown';

    const results: ComplianceResult[] = [];
    for (const template of templates) {
      const checks = await this.checkTemplateCompliance(template);
      const { status, score } = this.calculateComplianceStatus(checks);

      results.push({
        templateId: template.id,
        templateName: template.name,
        tenantId: template.tenantId,
        tenantName,
        overallStatus: status,
        complianceScore: score,
        checks,
        lastChecked: new Date(),
      });
    }

    return results;
  }

  /**
   * Get tenant compliance summary
   */
  async getTenantComplianceSummary(tenantId: string): Promise<TenantComplianceSummary> {
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    const results = await this.checkTenantTemplates(tenantId);

    const totalTemplates = results.length;
    const compliantTemplates = results.filter(r => r.overallStatus === 'compliant').length;
    const nonCompliantTemplates = results.filter(r => r.overallStatus === 'non_compliant').length;
    const needsReviewTemplates = results.filter(r => r.overallStatus === 'needs_review').length;

    // Calculate overall score
    const avgScore = totalTemplates > 0
      ? results.reduce((sum, r) => sum + r.complianceScore, 0) / totalTemplates
      : 100;

    // Count issues
    const allChecks = results.flatMap(r => r.checks);
    const critical = allChecks.filter(c => c.severity === 'error' && !c.passed).length;
    const warnings = allChecks.filter(c => c.severity === 'warning' && !c.passed).length;
    const info = allChecks.filter(c => c.severity === 'info').length;

    // Determine overall status
    let overallStatus: 'compliant' | 'non_compliant' | 'needs_review';
    if (nonCompliantTemplates > 0) {
      overallStatus = 'non_compliant';
    } else if (needsReviewTemplates > 0 || avgScore < 80) {
      overallStatus = 'needs_review';
    } else {
      overallStatus = 'compliant';
    }

    return {
      tenantId,
      tenantName: tenant?.name || 'Unknown',
      overallStatus,
      complianceScore: Math.round(avgScore),
      totalTemplates,
      compliantTemplates,
      nonCompliantTemplates,
      needsReviewTemplates,
      lastChecked: new Date(),
      issues: {
        critical,
        warnings,
        info,
      },
    };
  }

  /**
   * Get compliance summary for all tenants
   */
  async getAllTenantsCompliance(): Promise<TenantComplianceSummary[]> {
    const tenants = await this.tenantRepository.find({
      where: { isActive: true },
    });

    const summaries: TenantComplianceSummary[] = [];
    for (const tenant of tenants) {
      const summary = await this.getTenantComplianceSummary(tenant.id);
      summaries.push(summary);
    }

    return summaries.sort((a, b) => b.complianceScore - a.complianceScore);
  }
}

