import {
  Entity,
  Column,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';

@Entity('content_ai_templates')
export class ContentAiTemplate extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  exampleMessages: string[]; // 3-10 example SMS messages

  @Column({ type: 'jsonb', nullable: true })
  generatedVariations: string[]; // 5 generated variations

  @Column({ type: 'float', default: 0.7 })
  creativity: number; // 0.0 to 1.0, controls AI creativity

  @Column({ default: false })
  unique: boolean; // If true, generate unique message for each send

  @Column({ type: 'jsonb', nullable: true })
  config: {
    // Rate limiting for unique generation
    maxUniqueGenerationsPerHour?: number;
    maxUniqueGenerationsPerDay?: number;
    // Additional settings
    maxLength?: number; // Max characters per message
    preserveVariables?: boolean; // Whether to preserve {{variables}} in generated messages
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastUsedAt: Date;
}

