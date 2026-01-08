import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

export enum TcpaviolationAction {
  BLOCK = 'BLOCK', // Block the execution completely
  LOG_ONLY = 'LOG_ONLY', // Log violation but allow execution
  PAUSE_JOURNEY = 'PAUSE_JOURNEY', // Pause the journey for this contact
  SKIP_NODE = 'SKIP_NODE', // Skip the violating node but continue journey
}

export enum TcpacomplianceMode {
  STRICT = 'STRICT', // Enforce all TCPA rules strictly
  MODERATE = 'MODERATE', // Enforce critical rules, warn on others
  PERMISSIVE = 'PERMISSIVE', // Log violations but allow execution
}

@Entity('tcpa_configs')
export class Tcpaconfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  tenantId: string;

  @Column({
    type: 'enum',
    enum: TcpacomplianceMode,
    default: TcpacomplianceMode.STRICT,
  })
  complianceMode: TcpacomplianceMode;

  // Time restrictions (local time for contact)
  @Column({ type: 'integer', default: 8 })
  allowedStartHour: number; // 8 AM default

  @Column({ type: 'integer', default: 21 })
  allowedEndHour: number; // 9 PM default

  @Column({ type: 'simple-array', nullable: true })
  allowedDaysOfWeek: string[]; // ['MONDAY', 'TUESDAY', ...] - null means all days

  // Consent requirements
  @Column({ default: true })
  requireExpressConsent: boolean; // Require explicit written consent

  @Column({ default: true })
  requireConsentForAutomated: boolean; // Require consent for automated messages

  @Column({ default: true })
  requireConsentForMarketing: boolean; // Require consent for marketing messages

  @Column({ nullable: true })
  consentExpirationDays: number; // Consent expires after X days (null = never expires)

  // Opt-out handling
  @Column({ default: true })
  honorOptOuts: boolean; // Automatically honor STOP/UNSUBSCRIBE

  @Column({ default: true })
  honorDncList: boolean; // Honor Do Not Call list

  @Column({ default: true })
  autoOptOutOnStop: boolean; // Automatically opt out on STOP keyword

  // Identification requirements
  @Column({ default: true })
  requireSenderIdentification: boolean; // Require sender name/company in messages

  @Column({ nullable: true })
  requiredSenderName: string; // Required sender name/company

  // Violation handling
  @Column({
    type: 'enum',
    enum: TcpaviolationAction,
    default: TcpaviolationAction.BLOCK,
  })
  violationAction: TcpaviolationAction;

  @Column({ default: true })
  logViolations: boolean; // Log all TCPA violations

  @Column({ default: true })
  notifyOnViolation: boolean; // Send notification on violation

  @Column({ type: 'simple-array', nullable: true })
  violationNotificationEmails: string[]; // Email addresses to notify

  // Journey execution controls
  @Column({ default: true })
  blockNonCompliantJourneys: boolean; // Block journey execution if TCPA non-compliant

  @Column({ default: true })
  allowManualOverride: boolean; // Allow admins to manually override TCPA blocks

  @Column({ type: 'jsonb', nullable: true })
  overrideReasons: string[]; // Allowed override reasons (e.g., ['EXPRESS_CONSENT', 'ESTABLISHED_BUSINESS'])

  // Record keeping
  @Column({ default: true })
  maintainConsentRecords: boolean; // Maintain detailed consent records

  @Column({ default: 7 })
  consentRecordRetentionDays: number; // How long to keep consent records (years)

  // Custom rules
  @Column({ type: 'jsonb', nullable: true })
  customRules: {
    stateSpecificRules?: Record<string, any>; // State-specific TCPA rules
    industrySpecificRules?: Record<string, any>; // Industry-specific rules
    exemptions?: string[]; // Exemptions (e.g., ['HEALTHCARE', 'FINANCIAL'])
  };

  @OneToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

