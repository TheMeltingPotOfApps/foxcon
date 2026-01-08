import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ImessageService } from './imessage.service';
import { ImessageController } from './imessage.controller';
import { ConfigModule as AppConfigModule } from '../config/config.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from '../entities/message.entity';
import { Conversation } from '../entities/conversation.entity';
import { Contact } from '../entities/contact.entity';

@Module({
  imports: [
    ConfigModule,
    AppConfigModule,
    TypeOrmModule.forFeature([Message, Conversation, Contact]),
  ],
  controllers: [ImessageController],
  providers: [ImessageService],
  exports: [ImessageService],
})
export class ImessageModule {}
