import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { JourneyNodeExecution, ExecutionStatus } from '../src/entities/journey-node-execution.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';

/**
 * Clear stuck executions - more aggressive cleanup
 * 
 * This script clears:
 * 1. EXECUTING executions older than 30 minutes (reset to FAILED)
 * 2. PENDING executions older than 12 hours (delete)
 */
async function clearStuckExecutions() {
  const logger = new Logger('ClearStuckExecutions');
  
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const executionRepository = app.get<Repository<JourneyNodeExecution>>(
      getRepositoryToken(JourneyNodeExecution),
    );

    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

    logger.log('Starting aggressive cleanup of stuck executions...');
    logger.log(`Current time: ${now.toISOString()}`);
    logger.log(`30 minutes ago: ${thirtyMinutesAgo.toISOString()}`);
    logger.log(`12 hours ago: ${twelveHoursAgo.toISOString()}`);

    // 1. Reset stuck EXECUTING executions older than 30 minutes
    const stuckExecutingCount = await executionRepository
      .createQueryBuilder('execution')
      .where('execution.status = :status', { status: ExecutionStatus.EXECUTING })
      .andWhere('execution.executedAt < :cutoff', { cutoff: thirtyMinutesAgo })
      .getCount();

    if (stuckExecutingCount > 0) {
      logger.log(`Resetting ${stuckExecutingCount.toLocaleString()} stuck EXECUTING executions (older than 30 minutes) to FAILED...`);
      const updateResult = await executionRepository
        .createQueryBuilder()
        .update(JourneyNodeExecution)
        .set({
          status: ExecutionStatus.FAILED,
          completedAt: () => 'CURRENT_TIMESTAMP',
          result: () => `'{"success": false, "error": "Execution timeout - stuck in EXECUTING state for more than 30 minutes"}'::jsonb`,
        })
        .where('status = :status', { status: ExecutionStatus.EXECUTING })
        .andWhere('executedAt < :cutoff', { cutoff: thirtyMinutesAgo })
        .execute();
      logger.log(`Reset ${updateResult.affected || 0} stuck EXECUTING executions to FAILED`);
    } else {
      logger.log('No stuck EXECUTING executions found');
    }

    // 2. Delete stale PENDING executions older than 12 hours
    const stalePendingCount = await executionRepository
      .createQueryBuilder('execution')
      .where('execution.status = :status', { status: ExecutionStatus.PENDING })
      .andWhere('execution.scheduledAt < :cutoff', { cutoff: twelveHoursAgo })
      .getCount();

    if (stalePendingCount > 0) {
      logger.log(`Deleting ${stalePendingCount.toLocaleString()} stale PENDING executions older than 12 hours...`);
      const deleteResult = await executionRepository
        .createQueryBuilder()
        .delete()
        .from(JourneyNodeExecution)
        .where('status = :status', { status: ExecutionStatus.PENDING })
        .andWhere('scheduledAt < :cutoff', { cutoff: twelveHoursAgo })
        .execute();
      logger.log(`Deleted ${deleteResult.affected || 0} stale PENDING executions`);
    } else {
      logger.log('No stale PENDING executions found');
    }

    // Final summary
    const finalCounts = await executionRepository
      .createQueryBuilder('execution')
      .select('execution.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('execution.status')
      .getRawMany();

    logger.log('\n=== Final Execution Counts ===');
    finalCounts.forEach((row: any) => {
      logger.log(`${row.status}: ${parseInt(row.count).toLocaleString()}`);
    });

    logger.log('\nStuck executions cleared successfully!');
    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error(`Clear stuck executions failed: ${error.message}`, error.stack);
    process.exit(1);
  }
}

clearStuckExecutions();

