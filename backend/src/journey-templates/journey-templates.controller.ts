import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JourneyTemplatesService } from './journey-templates.service';
import { TemplateCategory } from '../entities/journey-template.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('journey-templates')
@UseGuards(JwtAuthGuard)
export class JourneyTemplatesController {
  constructor(private templatesService: JourneyTemplatesService) {}

  @Post()
  async createTemplate(@Body() data: any, @Request() req: any) {
    return this.templatesService.createTemplate({
      ...data,
      tenantId: req.user.tenantId,
      createdByUserId: req.user.userId,
    });
  }

  @Get()
  async getTemplates(
    @Query('category') category?: TemplateCategory,
    @Query('isPublic') isPublic?: string,
    @Query('search') search?: string,
    @Request() req?: any,
  ) {
    return this.templatesService.getTemplates({
      tenantId: req?.user?.tenantId,
      category,
      isPublic: isPublic === 'true' ? true : isPublic === 'false' ? false : undefined,
      search,
    });
  }

  @Get('public')
  async getPublicTemplates(
    @Query('category') category?: TemplateCategory,
    @Query('search') search?: string,
  ) {
    return this.templatesService.getTemplates({
      isPublic: true,
      category,
      search,
    });
  }

  @Get(':id')
  async getTemplateById(@Param('id') id: string, @Request() req: any) {
    return this.templatesService.getTemplateById(id, req.user?.tenantId);
  }

  @Post(':id/create-journey')
  async createJourneyFromTemplate(
    @Param('id') id: string,
    @Body() overrides: { name?: string; description?: string },
    @Request() req: any,
  ) {
    return this.templatesService.createJourneyFromTemplate(
      id,
      req.user.tenantId,
      overrides,
    );
  }

  @Put(':id')
  async updateTemplate(
    @Param('id') id: string,
    @Body() updates: any,
    @Request() req: any,
  ) {
    return this.templatesService.updateTemplate(id, updates, req.user?.tenantId);
  }

  @Delete(':id')
  async deleteTemplate(@Param('id') id: string, @Request() req: any) {
    await this.templatesService.deleteTemplate(id, req.user?.tenantId);
    return { success: true };
  }

  @Post('generate-preview-script')
  async generatePreviewScript(
    @Body() data: {
      industry: string;
      brandName: string;
      marketingAngle: 'corporate' | 'personable' | 'psa' | 'storytelling';
      sentiment: 'kind' | 'caring' | 'concerned' | 'excited' | 'passionate' | 'enthusiastic';
      voiceTemplateId?: string; // Optional if voicePresetId is provided
      voicePresetId?: string; // Optional if voiceTemplateId is provided
      includeContactName: boolean;
    },
    @Request() req: any,
  ) {
return this.templatesService.generatePreviewScript(req.user.tenantId, data);
  }

  @Post('generate-ai-powered')
  async generateAiPoweredJourneyTemplate(
    @Body() data: {
      industry: string;
      brandName: string;
      totalDays: number;
      callsPerDay: number;
      restPeriodDays: number[];
      includeSms: boolean;
      marketingAngle: 'corporate' | 'personable' | 'psa' | 'storytelling';
      sentiment: 'kind' | 'caring' | 'concerned' | 'excited' | 'passionate' | 'enthusiastic';
      voiceTemplateId?: string; // Optional if voicePresetId is provided
      voicePresetId?: string; // Optional if voiceTemplateId is provided
      numberOfVoices: number;
      includeContactName: boolean;
      audioEffects?: {
        distance?: 'close' | 'medium' | 'far';
        backgroundNoise?: {
          enabled: boolean;
          volume?: number;
          file?: string;
        };
        volume?: number;
        coughEffects?: Array<{
          file: 'stifled-cough' | 'coughing-woman' | 'coughing-woman-2';
          timestamp: number;
          volume?: number;
        }>;
      };
      referenceScript?: string; // Optional: edited preview script to use as reference
      temperature?: number; // AI temperature (0-1)
      journeyName?: string; // Journey name
      smsCta?: {
        type: 'none' | 'event' | 'phone' | 'ai';
        eventTypeId?: string;
        phoneNumber?: string;
        aiTemplateId?: string;
      };
      delayConfig?: {
        betweenCalls: Array<{ value: number; unit: 'MINUTES' | 'HOURS' }>;
        betweenCallAndSms: { value: number; unit: 'MINUTES' | 'HOURS' };
      };
      useBackgroundGeneration?: boolean; // Force background generation
    },
    @Request() req: any,
  ) {
    return this.templatesService.generateAiPoweredJourneyTemplate(req.user.tenantId, data);
  }

  @Get('generation-job/:jobId')
  async getGenerationJobStatus(
    @Param('jobId') jobId: string,
    @Request() req: any,
  ) {
    return this.templatesService.getGenerationJobStatus(jobId, req.user.tenantId);
  }
}

