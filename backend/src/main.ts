// Polyfill for crypto.randomUUID
if (typeof globalThis.crypto === 'undefined') {
  const crypto = require('crypto');
  if (typeof crypto.randomUUID === 'function') {
    globalThis.crypto = crypto as any;
  }
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/middleware/error-handler.middleware';
import * as express from 'express';

// Handle unhandled promise rejections to prevent crashes
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  const logger = console; // Will be replaced with Winston logger after app initialization
  logger.error('Unhandled Promise Rejection:', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString(),
  });
  
  // Don't exit in production - log and continue
  if (process.env.NODE_ENV === 'production') {
    logger.error('Application continuing despite unhandled rejection');
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  const logger = console;
  logger.error('Uncaught Exception:', {
    message: error.message,
    stack: error.stack,
  });
  
  // In production, log and exit gracefully
  if (process.env.NODE_ENV === 'production') {
    logger.error('Application will exit due to uncaught exception');
    process.exit(1);
  }
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true, // Enable raw body for Stripe webhooks
  });

  // Use Winston logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Enable CORS - Allow all origins in development, or specific origins in production
  const externalIp = '34.29.105.211';
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [
        'http://localhost:3000',
        'http://localhost:5001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5001',
        process.env.FRONTEND_URL || 'http://localhost:5001',
        // Add custom domain origins
        'http://app.nurtureengine.net',
        'https://app.nurtureengine.net',
        // Add external IP origins with common ports (for backward compatibility)
        `http://${externalIp}:3000`,
        `http://${externalIp}:5001`,
        `https://${externalIp}:3000`,
        `https://${externalIp}:5001`,
      ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, Twilio webhooks, etc.)
      if (!origin) return callback(null, true);
      
      // Allow Twilio webhook origins
      if (origin.includes('twilio.com') || origin.includes('ngrok.io')) {
        return callback(null, true);
      }
      
      // Allow localhost on any port
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
      
      // Allow external IP (34.29.105.211) on any port
      if (origin.includes(externalIp)) {
        return callback(null, true);
      }
      
      // Allow custom domain
      if (origin.includes('nurtureengine.net')) {
        return callback(null, true);
      }
      
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-Id',
      'X-Twilio-Signature',
      'Accept',
      'Origin',
      'X-Requested-With',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
    ],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Allow extra properties but strip them
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => {
          const constraints = error.constraints || {};
          return Object.values(constraints).join(', ');
        });
        return new BadRequestException({
          message: messages.join('; '),
          errors: errors,
        });
      },
    }),
  );

  // Configure raw body for Stripe webhooks
  app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

  // Global prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 5002;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  
  // Update unhandled rejection handler to use Winston logger
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Promise Rejection:', {
      reason: reason?.message || reason,
      stack: reason?.stack,
    });
  });
  
  logger.log(`🚀 Backend API running on http://${host}:${port}/api`, 'Bootstrap');
  logger.log(`   External access: http://34.29.105.211:${port}/api`, 'Bootstrap');
  logger.log(`   Custom domain: https://api.nurtureengine.net/api`, 'Bootstrap');
}

bootstrap();

