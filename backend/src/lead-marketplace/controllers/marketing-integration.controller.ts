import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { MarketingIntegrationService } from '../services/marketing-integration.service';
import { CreateIntegrationDto } from '../dto/create-integration.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('nurture-leads/integrations')
@UseGuards(JwtAuthGuard, TenantGuard)
export class MarketingIntegrationController {
  constructor(private readonly integrationService: MarketingIntegrationService) {}

  @Post()
  async create(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateIntegrationDto,
  ) {
    return this.integrationService.create(
      tenantId,
      user.userId || user.sub,
      dto.platform,
      dto.accessToken,
      dto.refreshToken,
      dto.platformAccountId,
      dto.metadata,
    );
  }

  @Get()
  async findAll(@TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.integrationService.findAll(tenantId, user.userId || user.sub);
  }

  @Get(':id')
  async findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.integrationService.findOne(tenantId, id);
  }

  @Delete(':id')
  async disconnect(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    await this.integrationService.disconnect(tenantId, id, user.userId || user.sub);
    return { success: true };
  }
}

