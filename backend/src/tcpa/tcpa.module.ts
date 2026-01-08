import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tcpaservice } from './tcpa.service';
import { Tcpacontroller } from './tcpa.controller';
import { Tcpaconfig } from '../entities/tcpa-config.entity';
import { Tcpaviolation } from '../entities/tcpa-violation.entity';
import { ContactConsent } from '../entities/contact-consent.entity';
import { Contact } from '../entities/contact.entity';
import { Tenant } from '../entities/tenant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tcpaconfig, Tcpaviolation, ContactConsent, Contact, Tenant]),
  ],
  controllers: [Tcpacontroller],
  providers: [Tcpaservice],
  exports: [Tcpaservice],
})
export class Tcpamodule {}

