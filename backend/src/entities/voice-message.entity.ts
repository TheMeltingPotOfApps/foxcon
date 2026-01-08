import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Contact } from './contact.entity';
import { Campaign } from './campaign.entity';
import { VoiceTemplate } from './voice-template.entity';
import { GeneratedAudio } from './generated-audio.entity';

export enum VoiceMessageStatus {
  PENDING = 'PENDING',
  GENERATING = 'GENERATING',
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

@Entity('voice_messages')
export class VoiceMessage extends BaseEntity {
  @Column('uuid')
  contactId: string;

  @Column('uuid', { nullable: true })
  campaignId: string;

  @Column('uuid')
  voiceTemplateId: string;

  @Column('uuid', { nullable: true })
  generatedAudioId: string;

  @Column({
    type: 'enum',
    enum: VoiceMessageStatus,
    default: VoiceMessageStatus.PENDING,
  })
  status: VoiceMessageStatus;

  @Column({ type: 'jsonb', nullable: true })
  variableValues: Record<string, string>; // Variable values used for this contact

  @Column({ nullable: true })
  audioUrl: string; // Final audio URL sent to contact

  @Column({ nullable: true })
  twilioMessageSid: string; // Twilio message SID if sent via Twilio

  @Column({ nullable: true })
  sentAt: Date;

  @Column({ nullable: true })
  failedAt: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    creditsUsed?: number;
    generationTime?: number;
    sendTime?: number;
  };

  @ManyToOne(() => Contact)
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @ManyToOne(() => Campaign, { nullable: true })
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;

  @ManyToOne(() => VoiceTemplate)
  @JoinColumn({ name: 'voiceTemplateId' })
  voiceTemplate: VoiceTemplate;

  @ManyToOne(() => GeneratedAudio, { nullable: true })
  @JoinColumn({ name: 'generatedAudioId' })
  generatedAudio: GeneratedAudio;
}

