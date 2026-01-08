import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { Contact } from '../entities/contact.entity';
import { TwilioModule } from '../twilio/twilio.module';
import { TenantLimitsModule } from '../tenant-limits/tenant-limits.module';
import { ImessageModule } from '../imessage/imessage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, Contact]),
    TwilioModule,
    TenantLimitsModule,
    ImessageModule,
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}

