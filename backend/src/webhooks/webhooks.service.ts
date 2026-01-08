import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantWebhook, WebhookEvent } from '../entities/tenant-webhook.entity';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(TenantWebhook)
    private webhookRepository: Repository<TenantWebhook>,
  ) {}

  async create(tenantId: string, dto: CreateWebhookDto): Promise<TenantWebhook> {
    // Generate secret if not provided
    const secret = dto.secret || crypto.randomBytes(32).toString('hex');

    const webhook = this.webhookRepository.create({
      ...dto,
      tenantId,
      secret,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    return this.webhookRepository.save(webhook);
  }

  async findAll(tenantId: string): Promise<TenantWebhook[]> {
    return this.webhookRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<TenantWebhook> {
    const webhook = await this.webhookRepository.findOne({
      where: { id, tenantId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    return webhook;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateWebhookDto>): Promise<TenantWebhook> {
    const webhook = await this.findOne(tenantId, id);
    Object.assign(webhook, dto);
    return this.webhookRepository.save(webhook);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const webhook = await this.findOne(tenantId, id);
    await this.webhookRepository.remove(webhook);
  }

  async test(tenantId: string, id: string): Promise<{ success: boolean; message: string }> {
    const webhook = await this.findOne(tenantId, id);

    try {
      const testPayload = {
        event: 'TEST',
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test webhook',
        },
      };

      const signature = this.generateSignature(JSON.stringify(testPayload), webhook.secret);

      await axios.post(webhook.url, testPayload, {
        headers: {
          ...webhook.headers,
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': 'TEST',
        },
        timeout: 10000,
      });

      webhook.successCount += 1;
      webhook.lastTriggeredAt = new Date();
      await this.webhookRepository.save(webhook);

      return { success: true, message: 'Webhook test successful' };
    } catch (error) {
      webhook.failureCount += 1;
      await this.webhookRepository.save(webhook);

      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Webhook test failed',
      };
    }
  }

  async trigger(tenantId: string, event: WebhookEvent, data: any): Promise<void> {
    const webhooks = await this.webhookRepository.find({
      where: { tenantId, isActive: true },
    });

    const relevantWebhooks = webhooks.filter((webhook) => webhook.events.includes(event));

    for (const webhook of relevantWebhooks) {
      try {
        const payload = {
          event,
          timestamp: new Date().toISOString(),
          tenantId,
          data,
        };

        const signature = this.generateSignature(JSON.stringify(payload), webhook.secret);

        await axios.post(webhook.url, payload, {
          headers: {
            ...webhook.headers,
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': event,
          },
          timeout: 10000,
        });

        webhook.successCount += 1;
        webhook.lastTriggeredAt = new Date();
        await this.webhookRepository.save(webhook);
      } catch (error) {
        webhook.failureCount += 1;
        await this.webhookRepository.save(webhook);
        // Log error but don't throw - continue with other webhooks
      }
    }
  }

  private generateSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }
}

