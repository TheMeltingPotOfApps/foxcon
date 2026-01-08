import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';

export const getLoggerConfig = (): WinstonModuleOptions => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    level: isDevelopment ? 'debug' : 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
    ),
    defaultMeta: { service: 'sms-saas-backend' },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(
            ({ timestamp, level, message, context, ...meta }) => {
              const contextStr = context ? `[${context}]` : '';
              const metaStr = Object.keys(meta).length
                ? JSON.stringify(meta)
                : '';
              return `${timestamp} ${level} ${contextStr} ${message} ${metaStr}`;
            },
          ),
        ),
      }),
    ],
  };
};

