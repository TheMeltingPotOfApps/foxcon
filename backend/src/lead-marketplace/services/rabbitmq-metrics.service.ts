import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import * as amqp from 'amqplib';
import { MarketplaceAnalyticsService } from './marketplace-analytics.service';

interface MetricsMessage {
  tenantId: string;
  listingId: string;
  distributionId: string;
}

@Injectable()
export class RabbitMQMetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQMetricsService.name);
  private channel: amqp.Channel;
  private connection: amqp.Connection;

  constructor(
    @Inject('RABBITMQ_CONNECTION')
    private readonly rabbitMQConnection: Promise<amqp.Connection>,
    @Inject('RABBITMQ_CONFIG')
    private readonly rabbitMQConfig: any,
    private readonly analyticsService: MarketplaceAnalyticsService,
  ) {}

  async onModuleInit() {
    try {
      this.connection = await this.rabbitMQConnection;
      this.channel = await this.connection.createChannel();

      const metricsQueue = this.rabbitMQConfig.queues.marketplaceMetrics;
      await this.channel.assertQueue(metricsQueue, { durable: true });
      await this.channel.prefetch(10); // Process multiple metrics updates

      // Start consuming metrics messages
      await this.channel.consume(
        metricsQueue,
        async (msg) => {
          if (msg) {
            try {
              const payload: MetricsMessage = JSON.parse(msg.content.toString());
              await this.analyticsService.updateListingMetrics(
                payload.tenantId,
                payload.listingId,
              );
              this.channel.ack(msg);
            } catch (error) {
              this.logger.error(`Error processing metrics update: ${error.message}`, error.stack);
              this.channel.nack(msg, false, false); // Don't requeue failed metrics
            }
          }
        },
        { noAck: false },
      );

      this.logger.log('RabbitMQ metrics consumer started');
    } catch (error) {
      this.logger.error(`Failed to initialize RabbitMQ metrics service: ${error.message}`, error.stack);
    }
  }

  async onModuleDestroy() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
    } catch (error) {
      this.logger.error(`Error closing RabbitMQ connection: ${error.message}`);
    }
  }
}

