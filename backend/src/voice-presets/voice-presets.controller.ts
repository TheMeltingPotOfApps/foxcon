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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { VoicePresetsService } from './voice-presets.service';
import { CreateVoicePresetDto, UpdateVoicePresetDto } from './dto/create-voice-preset.dto';

@Controller('voice-presets')
@UseGuards(JwtAuthGuard, TenantGuard)
export class VoicePresetsController {
  constructor(private readonly voicePresetsService: VoicePresetsService) {}

  @Post()
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateVoicePresetDto,
  ) {
    return this.voicePresetsService.create(tenantId, dto);
  }

  @Get()
  async findAll(@TenantId() tenantId: string) {
    return this.voicePresetsService.findAll(tenantId);
  }

  @Get('default')
  async findDefault(@TenantId() tenantId: string) {
    return this.voicePresetsService.findDefault(tenantId);
  }

  @Get(':id')
  async findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.voicePresetsService.findOne(tenantId, id);
  }

  @Put(':id')
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVoicePresetDto,
  ) {
    return this.voicePresetsService.update(tenantId, id, dto);
  }

  @Put(':id/set-default')
  async setDefault(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.voicePresetsService.setDefault(tenantId, id);
  }

  @Delete(':id')
  async delete(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.voicePresetsService.delete(tenantId, id);
    return { message: 'Voice preset deleted successfully' };
  }
}
