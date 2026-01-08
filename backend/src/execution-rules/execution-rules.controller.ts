import { Controller, Get, Put, Body, UseGuards, Logger } from '@nestjs/common';
import { ExecutionRulesService } from './execution-rules.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { ExecutionRules } from '../entities/execution-rules.entity';

@Controller('execution-rules')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ExecutionRulesController {
  private readonly logger = new Logger(ExecutionRulesController.name);

  constructor(private readonly executionRulesService: ExecutionRulesService) {}

  @Get()
  async getExecutionRules(@TenantId() tenantId: string): Promise<ExecutionRules> {
    try {
      return await this.executionRulesService.getExecutionRules(tenantId);
    } catch (error) {
      this.logger.error(`Error getting execution rules: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Put()
  async updateExecutionRules(
    @TenantId() tenantId: string,
    @Body() updates: Partial<ExecutionRules>,
  ): Promise<ExecutionRules> {
    try {
      return await this.executionRulesService.updateExecutionRules(tenantId, updates);
    } catch (error) {
      this.logger.error(`Error updating execution rules: ${error.message}`, error.stack);
      throw error;
    }
  }
}

