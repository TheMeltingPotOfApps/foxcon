import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

export const getRabbitMQConfig = (configService: ConfigService) => ({
  url: configService.get<string>(
    'RABBITMQ_URL',
    'amqp://sms_user:sms_password@localhost:5672'
  ),
  queues: {
    campaignSend: 'campaign.send',
    csvImport: 'csv.import',
    aiReply: 'ai.reply',
    webhookDelivery: 'webhook.delivery',
    marketplaceDistribution: 'marketplace.distribution',
    marketplaceMetrics: 'marketplace.metrics',
  },
});

export const createRabbitMQConnection = async (
  url: string,
): Promise<amqp.Connection> => {
  return amqp.connect(url);
};

