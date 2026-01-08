import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { ListingService } from '../services/listing.service';
import { CreateListingDto } from '../dto/create-listing.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ListingStatus } from '../entities/listing.entity';

@Controller('nurture-leads/listings')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ListingController {
  constructor(private readonly listingService: ListingService) {}

  @Post()
  async create(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateListingDto,
  ) {
    return this.listingService.create(tenantId, user.userId || user.sub, dto);
  }

  @Get()
  async findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: ListingStatus,
    @Query('marketerId') marketerId?: string,
    @Query('industry') industry?: string,
    @Query('isVerified') isVerified?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listingService.findAll(
      tenantId,
      {
        status,
        marketerId,
        industry,
        isVerified: isVerified === 'true' ? true : isVerified === 'false' ? false : undefined,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      },
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get(':id')
  async findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.listingService.findOne(tenantId, id);
  }

  @Put(':id')
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: Partial<CreateListingDto>,
  ) {
    return this.listingService.update(tenantId, id, user.userId || user.sub, dto);
  }

  @Post(':id/publish')
  async publish(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.listingService.publish(tenantId, id, user.userId || user.sub);
  }

  @Post(':id/pause')
  async pause(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.listingService.pause(tenantId, id, user.userId || user.sub);
  }

  @Delete(':id')
  async delete(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    await this.listingService.delete(tenantId, id, user.userId || user.sub);
    return { success: true };
  }

  @Get(':id/metrics')
  async getMetrics(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.listingService.getMetrics(tenantId, id);
  }
}

