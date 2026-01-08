import {
  Entity,
  Column,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';

export enum IngestionActionType {
  CREATE_CONTACT = 'CREATE_CONTACT',
  ADD_TO_CAMPAIGN = 'ADD_TO_CAMPAIGN',
  REMOVE_FROM_CAMPAIGN = 'REMOVE_FROM_CAMPAIGN',
  ADD_TO_JOURNEY = 'ADD_TO_JOURNEY',
  REMOVE_FROM_JOURNEY = 'REMOVE_FROM_JOURNEY',
  PAUSE_IN_JOURNEY = 'PAUSE_IN_JOURNEY',
  UPDATE_CONTACT_STATUS = 'UPDATE_CONTACT_STATUS',
}

export interface IngestionAction {
  type: IngestionActionType;
  config: {
    campaignId?: string;
    journeyId?: string;
    leadStatus?: string;
    [key: string]: any;
  };
}

export interface ParameterMapping {
  paramName: string; // Parameter name from incoming request
  contactField: string; // Field name in Contact entity (phoneNumber, email, firstName, etc.)
  required: boolean;
  defaultValue?: any;
}

@Entity('lead_ingestion_endpoints')
export class LeadIngestionEndpoint extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ unique: true })
  endpointKey: string; // Unique key for the endpoint URL: /api/ingest/{endpointKey}

  @Column({ type: 'jsonb' })
  parameterMappings: ParameterMapping[]; // Allowed parameters and their mappings

  @Column({ type: 'jsonb' })
  actions: IngestionAction[]; // Actions to execute on ingestion

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  apiKey: string; // Optional API key for authentication

  @Column({ default: 0 })
  requestCount: number;

  @Column({ default: 0 })
  successCount: number;

  @Column({ default: 0 })
  failureCount: number;

  @Column({ nullable: true })
  lastRequestAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    ipWhitelist?: string[];
    rateLimit?: {
      requestsPerMinute?: number;
      requestsPerHour?: number;
    };
  };
}

