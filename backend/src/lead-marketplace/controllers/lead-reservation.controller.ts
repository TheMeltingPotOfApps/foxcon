import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { LeadReservationService } from '../services/lead-reservation.service';
import { PurchaseReservationsDto } from '../dto/purchase-reservations.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('nurture-leads/reservations')
@UseGuards(JwtAuthGuard, TenantGuard)
export class LeadReservationController {
  constructor(private readonly leadReservationService: LeadReservationService) {}

  @Get('balance')
  async getBalance(@TenantId() tenantId: string, @CurrentUser() user: any) {
    const balance = await this.leadReservationService.getBalance(tenantId, user.userId || user.sub);
    return { balance };
  }

  @Post('purchase')
  async purchase(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: PurchaseReservationsDto,
  ) {
    const reservation = await this.leadReservationService.purchase(
      tenantId,
      user.userId || user.sub,
      dto.usdAmount,
      dto.metadata,
    );
    return reservation;
  }

  @Get('transactions')
  async getTransactions(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.leadReservationService.getTransactions(
      tenantId,
      user.userId || user.sub,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
    return result;
  }
}

