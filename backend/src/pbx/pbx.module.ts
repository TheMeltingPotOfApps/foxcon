import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PbxController } from './pbx.controller';
import { PbxReportingController } from './pbx-reporting.controller';
import { PbxAuthController } from './pbx-auth.controller';
import { PbxGateway } from './pbx.gateway';
import { PbxService } from './services/pbx.service';
import { AgentExtensionsService } from './services/agent-extensions.service';
import { CallSessionsService } from './services/call-sessions.service';
import { CallRoutingService } from './services/call-routing.service';
import { PbxReportingService } from './services/pbx-reporting.service';
import { AgentExtension } from '../entities/agent-extension.entity';
import { CallQueue } from '../entities/call-queue.entity';
import { CallSession } from '../entities/call-session.entity';
import { CallLog } from '../entities/call-log.entity';
import { Contact } from '../entities/contact.entity';
import { User } from '../entities/user.entity';
import { UserTenant } from '../entities/user-tenant.entity';
import { AgentActivityLog } from '../entities/agent-activity-log.entity';
import { AsteriskModule } from '../asterisk/asterisk.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AgentExtension,
      CallQueue,
      CallSession,
      CallLog,
      Contact,
      User,
      UserTenant,
      AgentActivityLog,
    ]),
    AsteriskModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN', '15m');
        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: expiresIn as any,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [PbxController, PbxReportingController, PbxAuthController],
  providers: [
    PbxService,
    AgentExtensionsService,
    CallSessionsService,
    CallRoutingService,
    PbxReportingService,
    PbxGateway,
  ],
  exports: [
    PbxService,
    AgentExtensionsService,
    CallSessionsService,
    CallRoutingService,
    PbxReportingService,
    PbxGateway,
  ],
})
export class PbxModule {}

