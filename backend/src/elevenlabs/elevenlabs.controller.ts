import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ElevenLabsService } from './elevenlabs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('elevenlabs')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ElevenLabsController {
  constructor(private readonly elevenLabsService: ElevenLabsService) {}

  @Get('voices')
  async getVoices() {
    return this.elevenLabsService.getVoices();
  }

  @Get('voices/:id')
  async getVoice(@Param('id') id: string) {
    return this.elevenLabsService.getVoice(id);
  }
}

