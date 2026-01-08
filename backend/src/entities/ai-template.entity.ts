import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Tenant } from './tenant.entity';

@Entity('ai_templates')
export class AiTemplate extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  config: {
    purpose?: string[]; // ['provide_information', 'drive_lead_submissions', 'schedule_calendar', 'drive_phone_calls']
    productInfo?: string;
    serviceInfo?: string;
    qualificationGuidelines?: string;
    brandTonality?: string;
    welcomeMessage?: string;
    customInstructions?: string;
    businessName?: string;
    phoneNumber?: string; // Phone number to provide when driving phone calls
  };

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}

