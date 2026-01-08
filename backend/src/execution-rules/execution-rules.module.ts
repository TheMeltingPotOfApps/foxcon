import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExecutionRules } from '../entities/execution-rules.entity';
import { Tenant } from '../entities/tenant.entity';
import { ExecutionRulesService } from './execution-rules.service';
import { ExecutionRulesController } from './execution-rules.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ExecutionRules, Tenant])],
  controllers: [ExecutionRulesController],
  providers: [ExecutionRulesService],
  exports: [ExecutionRulesService],
})
export class ExecutionRulesModule {}

