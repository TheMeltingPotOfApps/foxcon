import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PricingPlansService } from './pricing-plans.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../entities/user-role.enum';
import { PricingPlan } from '../entities/pricing-plan.entity';

@Controller('pricing-plans')
export class PricingPlansController {
  constructor(private readonly pricingPlansService: PricingPlansService) {}

  @Get()
  async findAll() {
    return this.pricingPlansService.findActive();
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async findAllForAdmin() {
    return this.pricingPlansService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async findOne(@Param('id') id: string) {
    return this.pricingPlansService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async create(@Body() data: Partial<PricingPlan>) {
    return this.pricingPlansService.create(data);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async update(@Param('id') id: string, @Body() updates: Partial<PricingPlan>) {
    return this.pricingPlansService.update(id, updates);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async delete(@Param('id') id: string) {
    await this.pricingPlansService.delete(id);
    return { success: true };
  }

  @Post(':id/set-default')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async setDefault(@Param('id') id: string) {
    return this.pricingPlansService.setDefault(id);
  }
}

