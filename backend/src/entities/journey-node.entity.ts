import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Journey } from './journey.entity';
import { JourneyNodeExecution } from './journey-node-execution.entity';

export enum JourneyNodeType {
  SEND_SMS = 'SEND_SMS',
  ADD_TO_CAMPAIGN = 'ADD_TO_CAMPAIGN',
  REMOVE_FROM_CAMPAIGN = 'REMOVE_FROM_CAMPAIGN',
  EXECUTE_WEBHOOK = 'EXECUTE_WEBHOOK',
  TIME_DELAY = 'TIME_DELAY',
  CONDITION = 'CONDITION',
  WEIGHTED_PATH = 'WEIGHTED_PATH',
  MAKE_CALL = 'MAKE_CALL',
  UPDATE_CONTACT_STATUS = 'UPDATE_CONTACT_STATUS',
}

export enum TimeDelayUnit {
  MINUTES = 'MINUTES',
  HOURS = 'HOURS',
  DAYS = 'DAYS',
}

@Entity('journey_nodes')
export class JourneyNode extends BaseEntity {
  @Column('uuid')
  journeyId: string;

  @Column({
    type: 'enum',
    enum: JourneyNodeType,
  })
  type: JourneyNodeType;

  @Column({ type: 'float' })
  positionX: number;

  @Column({ type: 'float' })
  positionY: number;

  @Column({ type: 'jsonb' })
  config: {
    // For SEND_SMS
    messageContent?: string;
    templateId?: string;
    contentAiTemplateId?: string;
    numberPoolId?: string; // Number pool for SEND_SMS (Twilio)
    eventTypeId?: string; // Event type ID for calendar booking link

    // For ADD_TO_CAMPAIGN / REMOVE_FROM_CAMPAIGN
    campaignId?: string;

    // For EXECUTE_WEBHOOK
    webhookId?: string;
    webhookUrl?: string;
    webhookMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    webhookHeaders?: Record<string, string>;
    webhookBody?: string;
    webhookRetries?: number; // Number of retry attempts (default: 3)
    webhookRetryDelay?: number; // Delay between retries in ms (default: 1000)
    webhookTimeout?: number; // Request timeout in ms (default: 30000)
    webhookResponseHandling?: {
      successField?: string; // Field in response that indicates success
      errorField?: string; // Field in response that contains error message
      extractFields?: string[]; // Fields to extract from response and store in contact attributes
    };

    // For TIME_DELAY
    delayValue?: number;
    delayUnit?: TimeDelayUnit;
    delayAtTime?: string; // HH:mm format for specific time delays

    // For MAKE_CALL
    audioFile?: string; // Asterisk audio file name (ivr_file)
    voiceTemplateId?: string; // Voice template ID for generated audio
    didPoolType?: 'MC' | 'Twilio'; // DID pool type - determines which trunk to use (MC or Twilio)
    didId?: string; // Specific Asterisk DID ID
    didSegment?: string; // DID segment name (e.g., "twilio-main") - selects from segment if didId not specified
    transferNumber?: string; // Transfer destination number
    enableVmFile?: boolean; // Enable voicemail file (ivr_vm_file)
    recordCall?: boolean; // Whether to record the call
    // Legacy fields (for backward compatibility)
    voiceMessageUrl?: string; // URL to audio file or TwiML (deprecated)

    // For CONDITION
    branches?: Array<{
      id: string;
      label: string;
      condition: {
        field: string; // e.g., 'contact.firstName', 'contact.attributes.city', 'message.received', 'journey.status'
        operator: 'equals' | 'contains' | 'not_equals' | 'greater_than' | 'less_than' | 'exists' | 'not_exists';
        value?: any;
        campaignId?: string; // For message.receivedInCampaign condition
      };
      nextNodeId?: string;
    }>;
    defaultBranch?: {
      nextNodeId?: string;
    };

    // For WEIGHTED_PATH
    paths?: Array<{
      id: string;
      label: string;
      percentage: number; // 0-100
      nextNodeId?: string;
    }>;

    // For UPDATE_CONTACT_STATUS
    leadStatus?: string; // LeadStatus enum value: SOLD, DNC, CONTACT_MADE, PAUSED

    // For day markers in journey templates
    day?: number; // Day number for multi-day journey templates
  };

  @Column({ type: 'jsonb', nullable: true })
  connections: {
    // Legacy single output (for backward compatibility)
    nextNodeId?: string;
    conditions?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
    // New multiple outputs structure: { [outcome]: nextNodeId }
    // Outcomes vary by node type:
    // - SEND_SMS: success, failed, opted_out, reply
    // - MAKE_CALL: success, failed, answered, no_answer, busy
    // - ADD_TO_CAMPAIGN, REMOVE_FROM_CAMPAIGN, EXECUTE_WEBHOOK, UPDATE_CONTACT_STATUS: success, failed
    // - TIME_DELAY: completed
    // - CONDITION, WEIGHTED_PATH: handled via config.branches/paths
    outputs?: Record<string, string>;
  };

  @ManyToOne(() => Journey, (journey) => journey.nodes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'journeyId' })
  journey: Journey;

  @OneToMany(() => JourneyNodeExecution, (execution) => execution.node)
  executions: JourneyNodeExecution[];
}

