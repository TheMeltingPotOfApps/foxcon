import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getRabbitMQConfig, createRabbitMQConnection } from '../config/rabbitmq.config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'RABBITMQ_CONNECTION',
      useFactory: async (configService: ConfigService) => {
        const config = getRabbitMQConfig(configService);
        return createRabbitMQConnection(config.url);
      },
      inject: [ConfigService],
    },
    {
      provide: 'RABBITMQ_CONFIG',
      useFactory: (configService: ConfigService) => {
        return getRabbitMQConfig(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: ['RABBITMQ_CONNECTION', 'RABBITMQ_CONFIG'],
})
export class RabbitMQModule {}

