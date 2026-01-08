import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AmiService } from './ami.service';
import { AmiEventListenerService } from './ami-event-listener.service';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { AsteriskSoundService } from './asterisk-sound.service';
import { AsteriskSoundController } from './asterisk-sound.controller';
import { DidsService } from './dids.service';
import { DidsController } from './dids.controller';
import { CallLog } from '../entities/call-log.entity';
import { AsteriskDid } from '../entities/asterisk-did.entity';
import { Tenant } from '../entities/tenant.entity';
import { TwilioNumber } from '../entities/twilio-number.entity';
import { Contact } from '../entities/contact.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CallLog, AsteriskDid, Tenant, TwilioNumber, Contact]),
  ],
  controllers: [CallsController, AsteriskSoundController, DidsController],
  providers: [AmiService, AmiEventListenerService, CallsService, AsteriskSoundService, DidsService],
  exports: [AmiService, AmiEventListenerService, CallsService, AsteriskSoundService, DidsService],
})
export class AsteriskModule {}

