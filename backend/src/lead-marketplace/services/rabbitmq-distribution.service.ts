import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { LeadDistributionService } from './lead-distribution.service';

interface DistributionMessage {
  tenantId: string;
  listingId: string;
  contactData: {
    phoneNumber: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    attributes?: Record<string, any>;
  };
  metadata: {
    campaignId?: string;
    adsetId?: string;
    adId?: string;
    brand?: string;
    source?: string;
    industry?: string;
  };
}

@Injectable()
export class RabbitMQDistributionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQDistributionService.name);
  private channel: amqp.Channel;
  private connection: amqp.Connection;

  constructor(
    @Inject('RABBITMQ_CONNECTION')
    private readonly rabbitMQConnection: Promise<amqp.Connection>,
    @Inject('RABBITMQ_CONFIG')
    private readonly rabbitMQConfig: any,
    @Inject(forwardRef(() => LeadDistributionService))
    private readonly leadDistributionService: LeadDistributionService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      this.connection = await this.rabbitMQConnection;
      this.channel = await this.connection.createChannel();

      // Declare queues
      const distributionQueue = this.rabbitMQConfig.queues.marketplaceDistribution;
      const metricsQueue = this.rabbitMQConfig.queues.marketplaceMetrics;

      await this.channel.assertQueue(distributionQueue, { durable: true });
      await this.channel.assertQueue(metricsQueue, { durable: true });

      // Set prefetch to process one message at a time per worker
      await this.channel.prefetch(1);

      // Start consuming distribution messages
      // #region agent log
      const fs3 = require('fs'); const logPath3 = '/root/SMS/.cursor/debug.log'; const logEntry3 = JSON.stringify({location:'rabbitmq-distribution.service.ts:58',message:'Starting consumer on queue',data:{consumeQueue:distributionQueue},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})+'\n'; fs3.appendFileSync(logPath3,logEntry3);
      // #endregion
      await this.channel.consume(
        distributionQueue,
        async (msg) => {
          if (msg) {
            try {
              // #region agent log
              const fs4 = require('fs'); const logPath4 = '/root/SMS/.cursor/debug.log'; const logEntry4 = JSON.stringify({location:'rabbitmq-distribution.service.ts:63',message:'Message received on consumer',data:{queue:distributionQueue},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})+'\n'; fs4.appendFileSync(logPath4,logEntry4);
              // #endregion
              const payload: DistributionMessage = JSON.parse(msg.content.toString());
              this.logger.log(`Processing lead distribution: Listing ${payload.listingId}`);

              await this.leadDistributionService.distributeLead(
                payload.tenantId,
                payload.listingId,
                payload.contactData,
                payload.metadata,
              );

              this.channel.ack(msg);
              this.logger.log(`Lead distributed successfully: Listing ${payload.listingId}`);
            } catch (error) {
              this.logger.error(`Error processing distribution: ${error.message}`, error.stack);
              // Reject and requeue (with max retry limit in production)
              this.channel.nack(msg, false, true);
            }
          }
        },
        { noAck: false },
      );

      this.logger.log('RabbitMQ distribution consumer started');
    } catch (error) {
      this.logger.error(`Failed to initialize RabbitMQ distribution service: ${error.message}`, error.stack);
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

  async publishDistribution(message: DistributionMessage): Promise<void> {
    try {
      // #region agent log
      const fs = require('fs'); const logPath = '/root/SMS/.cursor/debug.log'; const logEntry = JSON.stringify({location:'rabbitmq-distribution.service.ts:105',message:'Publishing distribution message',data:{tenantId:message.tenantId,listingId:message.listingId,queue:this.rabbitMQConfig?.queues?.marketplaceDistribution},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})+'\n'; fs.appendFileSync(logPath,logEntry);
      // #endregion
      if (!this.channel) {
        this.connection = await this.rabbitMQConnection;
        this.channel = await this.connection.createChannel();
        await this.channel.assertQueue(this.rabbitMQConfig.queues.marketplaceDistribution, {
          durable: true,
        });
      }

      const queue = this.rabbitMQConfig.queues.marketplaceDistribution;

      // #region agent log
      const fs2 = require('fs'); const logPath2 = '/root/SMS/.cursor/debug.log'; const logEntry2 = JSON.stringify({location:'rabbitmq-distribution.service.ts:124',message:'Publishing to base queue',data:{publishQueue:queue,consumeQueue:queue,tenantId:message.tenantId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})+'\n'; fs2.appendFileSync(logPath2,logEntry2);
      // #endregion

      // Publish to base queue (consumer listens on this queue)
      this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
        persistent: true,
      });

      this.logger.log(`Published distribution message to queue: ${queue}`);
    } catch (error) {
      this.logger.error(`Failed to publish distribution message: ${error.message}`, error.stack);
      throw error;
    }
  }

  async publishMetricsUpdate(tenantId: string, listingId: string, distributionId: string): Promise<void> {
    try {
      if (!this.channel) {
        this.connection = await this.rabbitMQConnection;
        this.channel = await this.connection.createChannel();
        await this.channel.assertQueue(this.rabbitMQConfig.queues.marketplaceMetrics, {
          durable: true,
        });
      }

      const queue = this.rabbitMQConfig.queues.marketplaceMetrics;
      const tenantScopedQueue = `${queue}.${tenantId}`;

      await this.channel.assertQueue(tenantScopedQueue, { durable: true });

      this.channel.sendToQueue(
        tenantScopedQueue,
        Buffer.from(JSON.stringify({ tenantId, listingId, distributionId })),
        { persistent: true },
      );

      this.logger.debug(`Published metrics update: Listing ${listingId}`);
    } catch (error) {
      this.logger.error(`Failed to publish metrics update: ${error.message}`, error.stack);
    }
  }
}

