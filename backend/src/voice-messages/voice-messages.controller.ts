import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { VoiceMessagesService } from './voice-messages.service';
import { CreateVoiceTemplateDto } from './dto/create-voice-template.dto';
import { GenerateVoiceCampaignDto } from './dto/generate-voice-campaign.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('voice-messages')
@UseGuards(JwtAuthGuard, TenantGuard)
export class VoiceMessagesController {
  constructor(private readonly voiceMessagesService: VoiceMessagesService) {}

  @Post('templates')
  createTemplate(@TenantId() tenantId: string, @Body() dto: CreateVoiceTemplateDto) {
    return this.voiceMessagesService.createTemplate(tenantId, dto);
  }

  @Get('templates')
  findAllTemplates(@TenantId() tenantId: string) {
    return this.voiceMessagesService.findAllTemplates(tenantId);
  }

  @Get('templates/:id')
  findTemplate(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.voiceMessagesService.findTemplate(tenantId, id);
  }

  @Post('campaigns/calculate-cost')
  calculateCost(
    @TenantId() tenantId: string,
    @Body()
    body: {
      campaignId: string;
      segmentId: string;
      voiceTemplateId: string;
    },
  ) {
    return this.voiceMessagesService.calculateCampaignCost(
      tenantId,
      body.campaignId,
      body.segmentId,
      body.voiceTemplateId,
    );
  }

  @Post('campaigns/generate')
  generateCampaign(@TenantId() tenantId: string, @Body() dto: GenerateVoiceCampaignDto) {
    return this.voiceMessagesService.generateVoiceCampaign(tenantId, dto);
  }

  @Post('templates/:id/preview')
  async previewTemplate(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { variableValues?: Record<string, string> },
  ) {
    return this.voiceMessagesService.previewTemplate(tenantId, id, body.variableValues || {});
  }

  @Get('generated-audio/:id/stream')
  async streamGeneratedAudio(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    return this.voiceMessagesService.streamGeneratedAudio(tenantId, id, res);
  }

  @Get('generated-audio/:id')
  async getGeneratedAudio(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.voiceMessagesService.getGeneratedAudio(tenantId, id);
  }
}

