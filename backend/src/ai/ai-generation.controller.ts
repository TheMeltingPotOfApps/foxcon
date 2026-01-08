import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiGenerationService } from './ai-generation.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('ai-generation')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AiGenerationController {
  constructor(private readonly aiGenerationService: AiGenerationService) {}

  @Post('generate-template-config')
  async generateTemplateConfig(@Body() body: { businessCategory: string }) {
    if (!body.businessCategory || !body.businessCategory.trim()) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Business category is required',
        },
      };
    }

    try {
      const config = await this.aiGenerationService.generateAiTemplateConfig(
        body.businessCategory.trim(),
      );
      return {
        success: true,
        config,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'GENERATION_ERROR',
          message: error.message || 'Failed to generate AI template configuration',
        },
      };
    }
  }

  @Post('generate-sms-variations')
  async generateSmsVariations(@Body() body: { sampleSms: string }) {
    if (!body.sampleSms || !body.sampleSms.trim()) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Sample SMS is required',
        },
      };
    }

    try {
      const variations = await this.aiGenerationService.generateSmsVariations(
        body.sampleSms.trim(),
      );
      return {
        success: true,
        variations,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'GENERATION_ERROR',
          message: error.message || 'Failed to generate SMS variations',
        },
      };
    }
  }
}

