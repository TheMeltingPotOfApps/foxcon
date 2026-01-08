import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CustomEndpointService } from '../services/custom-endpoint.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('nurture-leads/endpoints')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CustomEndpointController {
  constructor(private readonly customEndpointService: CustomEndpointService) {}

  @Post()
  async create(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() body: {
      listingId: string;
      parameterMappings: Array<{
        paramName: string;
        contactField: string;
        required?: boolean;
        defaultValue?: any;
      }>;
    },
  ) {
    return this.customEndpointService.create(
      tenantId,
      user.userId || user.sub,
      body.listingId,
      body.parameterMappings,
    );
  }

  @Get()
  async findAll(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param('listingId') listingId?: string,
  ) {
    return this.customEndpointService.findAll(tenantId, user.userId || user.sub, listingId);
  }

  @Get(':id')
  async findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.customEndpointService.findOne(tenantId, id);
  }

  @Put(':id')
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() data: Partial<{
      isActive: boolean;
      parameterMappings: Array<{
        paramName: string;
        contactField: string;
        required?: boolean;
        defaultValue?: any;
      }>;
    }>,
  ) {
    return this.customEndpointService.update(tenantId, id, user.userId || user.sub, data);
  }

  @Post(':id/regenerate-key')
  async regenerateApiKey(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const apiKey = await this.customEndpointService.regenerateApiKey(
      tenantId,
      id,
      user.userId || user.sub,
    );
    return { apiKey };
  }

  @Delete(':id')
  async delete(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    await this.customEndpointService.delete(tenantId, id, user.userId || user.sub);
    return { success: true };
  }
}

