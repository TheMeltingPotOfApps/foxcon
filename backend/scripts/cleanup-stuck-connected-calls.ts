import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CallLog, CallStatus, CallDisposition } from '../src/entities/call-log.entity';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = new Logger('CleanupStuckConnectedCalls');

  const callLogRepository = app.get('CallLogRepository') as Repository<CallLog>;

  logger.log('Starting cleanup of stuck CONNECTED call logs...');

  const stuckThreshold = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
  
  // Find call logs stuck in CONNECTED status for more than 10 minutes
  const stuckCalls = await callLogRepository.find({
    where: {
      status: CallStatus.CONNECTED,
      createdAt: LessThanOrEqual(stuckThreshold),
    },
  });

  logger.log(`Found ${stuckCalls.length} stuck CONNECTED call logs`);

  if (stuckCalls.length === 0) {
    logger.log('No stuck calls to clean up!');
    await app.close();
    return;
  }

  let completed = 0;
  let failed = 0;

  for (const callLog of stuckCalls) {
    try {
      // Calculate duration based on creation time
      const duration = Math.floor((Date.now() - callLog.createdAt.getTime()) / 1000);
      
      // If call was created but never answered, mark as NO_ANSWER
      // If it was in CONNECTED state, it likely never completed successfully
      const disposition = duration > 3 ? CallDisposition.NO_ANSWER : CallDisposition.FAILED;
      const finalStatus = duration > 3 ? CallStatus.NO_ANSWER : CallStatus.FAILED;
      
      await callLogRepository.update(callLog.id, {
        status: finalStatus,
        callStatus: finalStatus,
        disposition,
        duration,
        billableSeconds: 0,
        callFlowEvents: [
          ...(callLog.callFlowEvents || []),
          {
            type: 'auto_cleanup',
            timestamp: new Date(),
            data: {
              reason: 'Stuck CONNECTED status - hangup event never received',
              originalStatus: 'CONNECTED',
              duration,
              cleanedUpAt: new Date().toISOString(),
            },
          },
        ],
      });
      
      completed++;
    } catch (error) {
      logger.error(`Failed to cleanup call log ${callLog.id}: ${error.message}`);
      failed++;
    }
  }

  logger.log(`\n=== Cleanup Summary ===`);
  logger.log(`Completed: ${completed}`);
  logger.log(`Failed: ${failed}`);
  logger.log(`Total processed: ${stuckCalls.length}`);

  // Verify cleanup
  const remaining = await callLogRepository.count({
    where: {
      status: CallStatus.CONNECTED,
      createdAt: LessThanOrEqual(stuckThreshold),
    },
  });

  logger.log(`\nRemaining stuck CONNECTED calls: ${remaining}`);
  logger.log('\nCleanup completed successfully!');

  await app.close();
}

bootstrap().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

