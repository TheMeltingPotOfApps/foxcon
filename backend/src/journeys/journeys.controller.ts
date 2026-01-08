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
  ParseUUIDPipe,
} from '@nestjs/common';
import { JourneysService } from './journeys.service';
import { CreateJourneyDto } from './dto/create-journey.dto';
import { CreateJourneyNodeDto } from './dto/create-node.dto';
import { EnrollContactDto } from './dto/enroll-contact.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { IntegrationBuilderService } from '../ai/integration-builder.service';

@Controller('journeys')
@UseGuards(JwtAuthGuard, TenantGuard)
export class JourneysController {
  constructor(
    private readonly journeysService: JourneysService,
    private readonly integrationBuilderService: IntegrationBuilderService,
  ) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateJourneyDto) {
    return this.journeysService.create(tenantId, dto);
  }

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.journeysService.findAll(tenantId);
  }

  @Get(':id/nodes')
  getNodes(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) journeyId: string,
  ) {
    return this.journeysService.getNodes(tenantId, journeyId);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.journeysService.findOne(tenantId, id);
  }

  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateJourneyDto>,
  ) {
    return this.journeysService.update(tenantId, id, dto);
  }

  @Delete(':id')
  delete(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.journeysService.delete(tenantId, id);
  }

  @Post(':id/launch')
  launch(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.journeysService.launch(tenantId, id);
  }

  @Post(':id/pause')
  pause(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.journeysService.pause(tenantId, id);
  }

  @Post(':id/nodes')
  addNode(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) journeyId: string,
    @Body() dto: CreateJourneyNodeDto,
  ) {
    return this.journeysService.addNode(tenantId, journeyId, dto);
  }

  @Put(':id/nodes/:nodeId')
  updateNode(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) journeyId: string,
    @Param('nodeId', ParseUUIDPipe) nodeId: string,
    @Body() dto: Partial<CreateJourneyNodeDto>,
  ) {
    return this.journeysService.updateNode(tenantId, journeyId, nodeId, dto);
  }

  @Delete(':id/nodes/:nodeId')
  deleteNode(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) journeyId: string,
    @Param('nodeId', ParseUUIDPipe) nodeId: string,
  ) {
    return this.journeysService.deleteNode(tenantId, journeyId, nodeId);
  }

  @Post(':id/enroll')
  enrollContact(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) journeyId: string,
    @Body() dto: EnrollContactDto,
  ) {
    return this.journeysService.enrollContact(tenantId, journeyId, dto);
  }

  @Post(':id/remove-contact/:contactId')
  removeContact(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) journeyId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() body: { pause?: boolean },
  ) {
    return this.journeysService.removeContact(tenantId, journeyId, contactId, body.pause);
  }

  @Get(':id/contacts')
  getJourneyContacts(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) journeyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.journeysService.getJourneyContacts(
      tenantId,
      journeyId,
      pageNum,
      limitNum,
      sortBy,
      sortOrder || 'DESC',
      search,
    );
  }

  @Get('contact/:contactId/executions')
  getAllContactJourneyExecutions(
    @TenantId() tenantId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    return this.journeysService.getAllContactJourneyExecutions(tenantId, contactId);
  }

  @Put(':id/removal-criteria')
  updateRemovalCriteria(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) journeyId: string,
    @Body() dto: { removalCriteria: any },
  ) {
    return this.journeysService.updateRemovalCriteria(tenantId, journeyId, dto.removalCriteria);
  }

  @Get(':id/removal-criteria')
  getRemovalCriteria(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) journeyId: string,
  ) {
    return this.journeysService.getRemovalCriteria(tenantId, journeyId);
  }

  @Post(':id/removal-criteria/generate-webhook-token')
  generateWebhookToken(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) journeyId: string,
  ) {
    return this.journeysService.generateWebhookToken(tenantId, journeyId);
  }

  @Get(':id/removal-criteria/webhook-url')
  getWebhookUrl(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) journeyId: string,
    @Query('baseUrl') baseUrl?: string,
  ) {
    return this.journeysService.getWebhookUrl(tenantId, journeyId, baseUrl);
  }

  @Post('webhook-nodes/generate-with-ai')
  async generateWebhookNodeWithAi(
    @TenantId() tenantId: string,
    @Body()
    body: {
      description: string;
      journeyId?: string;
      context?: {
        contactFields?: string[];
        journeyData?: any;
      };
    },
  ) {
    const config = await this.integrationBuilderService.generateIntegrationConfig(
      body.description,
      'webhook',
      body.context,
    );

    // Convert IntegrationConfig to webhook node config format
    const nodeConfig: Partial<CreateJourneyNodeDto>['config'] = {
      webhookUrl: config.webhookUrl,
      webhookMethod: config.httpMethod || 'POST',
      webhookHeaders: config.headers || {},
      webhookBody: config.bodyTemplate || '{}',
      webhookRetries: config.retryConfig?.maxRetries || 3,
      webhookRetryDelay: config.retryConfig?.retryDelay || 1000,
      webhookTimeout: 30000,
      webhookResponseHandling: config.responseHandling,
    };

    return {
      config,
      nodeConfig,
      instructions: `Use this configuration to set up your webhook node. The AI has configured:
- URL: ${config.webhookUrl || 'Configure manually'}
- Method: ${config.httpMethod || 'POST'}
- Headers: ${JSON.stringify(config.headers || {})}
- Body Template: ${config.bodyTemplate || '{}'}
- Retry Logic: ${config.retryConfig?.maxRetries || 3} retries with ${config.retryConfig?.retryDelay || 1000}ms delay
- Authentication: ${config.authentication?.type || 'none'}`,
    };
  }

  @Get(':id/executions/:contactId')
  getContactExecutions(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) journeyId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    return this.journeysService.getContactExecutions(tenantId, journeyId, contactId);
  }

  @Post('executions/:executionId/generate-audio')
  generateTtsAudioForExecution(
    @TenantId() tenantId: string,
    @Param('executionId', ParseUUIDPipe) executionId: string,
  ) {
    return this.journeysService.generateTtsAudioForExecution(tenantId, executionId);
  }
}

