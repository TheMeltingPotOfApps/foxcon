import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { User } from '../../entities/user.entity';
import { Listing } from './listing.entity';

@Entity('marketplace_custom_endpoints')
export class MarketplaceCustomEndpoint extends BaseEntity {
  @Column('uuid')
  marketerId: string;

  @Column('uuid')
  listingId: string;

  @Column({ unique: true })
  endpointKey: string;

  @Column()
  apiKey: string;

  @Column({ type: 'jsonb' })
  parameterMappings: Array<{
    paramName: string;
    contactField: string;
    required?: boolean;
    defaultValue?: any;
  }>;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'marketerId' })
  marketer: User;

  @ManyToOne(() => Listing)
  @JoinColumn({ name: 'listingId' })
  listing: Listing;
}

