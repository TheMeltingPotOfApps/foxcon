import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { ContactVisitsService } from './contact-visits.service';
import { Contact } from '../entities/contact.entity';
import { ContactTag } from '../entities/contact-tag.entity';
import { ContactVisit } from '../entities/contact-visit.entity';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { CampaignContact } from '../entities/campaign-contact.entity';
import { JourneyContact } from '../entities/journey-contact.entity';
import { Campaign } from '../entities/campaign.entity';
import { Journey } from '../entities/journey.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contact,
      ContactTag,
      ContactVisit,
      Conversation,
      Message,
      CampaignContact,
      JourneyContact,
      Campaign,
      Journey,
    ]),
    EventEmitterModule,
  ],
  controllers: [ContactsController],
  providers: [ContactsService, ContactVisitsService],
  exports: [ContactsService, ContactVisitsService],
})
export class ContactsModule {}

