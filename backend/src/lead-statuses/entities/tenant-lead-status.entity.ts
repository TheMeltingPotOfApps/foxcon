import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Tenant } from '../../entities/tenant.entity';

@Entity('tenant_lead_statuses')
@Index(['tenantId', 'name'], { unique: true })
export class TenantLeadStatus extends BaseEntity {
  @Column('uuid', { nullable: false })
  override tenantId: string; // Override BaseEntity's nullable tenantId to make it required

  @Column()
  name: string; // Display name (e.g., "New Lead", "Qualified", "Closed")

  @Column({ nullable: true })
  description: string; // Optional description

  @Column({ nullable: true })
  color: string; // Hex color code for UI display (e.g., "#3B82F6")

  @Column({ type: 'int', default: 0 })
  displayOrder: number; // Order for display in dropdowns and lists

  @Column({ default: true })
  isActive: boolean; // Whether this status is active and can be used

  @Column({ default: false })
  isSystem: boolean; // System statuses cannot be deleted (e.g., default statuses)

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    // Additional metadata for the status
    icon?: string; // Icon name for UI
    category?: string; // Category grouping (e.g., "Active", "Inactive", "Closed")
    [key: string]: any;
  };

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}

