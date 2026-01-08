import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Message } from '../entities/message.entity';
import { CallLog } from '../entities/call-log.entity';
import { Campaign } from '../entities/campaign.entity';
import { Conversation } from '../entities/conversation.entity';
import { Contact } from '../entities/contact.entity';
import { JourneyNodeExecution } from '../entities/journey-node-execution.entity';
import { JourneyContact } from '../entities/journey-contact.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Message,
      CallLog,
      Campaign,
      Conversation,
      Contact,
      JourneyNodeExecution,
      JourneyContact,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}

