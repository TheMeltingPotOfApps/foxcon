import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { JourneyNodeExecution, ExecutionStatus } from '../src/entities/journey-node-execution.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';

/**
 * Cleanup script for stale and failed journey node executions
 * 
 * This script removes:
 * 1. FAILED executions older than 7 days
 * 2. Stale PENDING executions older than 7 days (way overdue)
 * 3. Stuck EXECUTING executions older than 1 hour (resets to FAILED)
 * 4. SKIPPED executions older than 30 days
 */
async function cleanupStaleExecutions() {
  const logger = new Logger('CleanupStaleExecutions');
  
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const executionRepository = app.get<Repository<JourneyNodeExecution>>(
      getRepositoryToken(JourneyNodeExecution),
    );

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    logger.log('Starting cleanup of stale executions...');
    logger.log(`Current time: ${now.toISOString()}`);
    logger.log(`7 days ago: ${sevenDaysAgo.toISOString()}`);
    logger.log(`1 hour ago: ${oneHourAgo.toISOString()}`);
    logger.log(`30 days ago: ${thirtyDaysAgo.toISOString()}`);

    // 1. Count and delete FAILED executions older than 7 days
    const failedCount = await executionRepository
      .createQueryBuilder('execution')
      .where('execution.status = :status', { status: ExecutionStatus.FAILED })
      .andWhere('execution.completedAt < :cutoff', { cutoff: sevenDaysAgo })
      .getCount();

    if (failedCount > 0) {
      logger.log(`Deleting ${failedCount.toLocaleString()} FAILED executions older than 7 days...`);
      const deleteResult = await executionRepository
        .createQueryBuilder()
        .delete()
        .from(JourneyNodeExecution)
        .where('status = :status', { status: ExecutionStatus.FAILED })
        .andWhere('completedAt < :cutoff', { cutoff: sevenDaysAgo })
        .execute();
      logger.log(`Deleted ${deleteResult.affected || 0} FAILED executions`);
    } else {
      logger.log('No FAILED executions older than 7 days found');
    }

    // 2. Count and delete stale PENDING executions older than 7 days
    const stalePendingCount = await executionRepository
      .createQueryBuilder('execution')
      .where('execution.status = :status', { status: ExecutionStatus.PENDING })
      .andWhere('execution.scheduledAt < :cutoff', { cutoff: sevenDaysAgo })
      .getCount();

    if (stalePendingCount > 0) {
      logger.log(`Deleting ${stalePendingCount.toLocaleString()} stale PENDING executions older than 7 days...`);
      const deleteResult = await executionRepository
        .createQueryBuilder()
        .delete()
        .from(JourneyNodeExecution)
        .where('status = :status', { status: ExecutionStatus.PENDING })
        .andWhere('scheduledAt < :cutoff', { cutoff: sevenDaysAgo })
        .execute();
      logger.log(`Deleted ${deleteResult.affected || 0} stale PENDING executions`);
    } else {
      logger.log('No stale PENDING executions older than 7 days found');
    }

    // 3. Reset stuck EXECUTING executions older than 1 hour to FAILED
    const stuckExecutingCount = await executionRepository
      .createQueryBuilder('execution')
      .where('execution.status = :status', { status: ExecutionStatus.EXECUTING })
      .andWhere('execution.executedAt < :cutoff', { cutoff: oneHourAgo })
      .getCount();

    if (stuckExecutingCount > 0) {
      logger.log(`Resetting ${stuckExecutingCount.toLocaleString()} stuck EXECUTING executions (older than 1 hour) to FAILED...`);
      const updateResult = await executionRepository
        .createQueryBuilder()
        .update(JourneyNodeExecution)
        .set({
          status: ExecutionStatus.FAILED,
          completedAt: () => 'CURRENT_TIMESTAMP',
          result: () => `'{"success": false, "error": "Execution timeout - stuck in EXECUTING state for more than 1 hour"}'::jsonb`,
        })
        .where('status = :status', { status: ExecutionStatus.EXECUTING })
        .andWhere('executedAt < :cutoff', { cutoff: oneHourAgo })
        .execute();
      logger.log(`Reset ${updateResult.affected || 0} stuck EXECUTING executions to FAILED`);
    } else {
      logger.log('No stuck EXECUTING executions found');
    }

    // 4. Delete SKIPPED executions older than 30 days
    const skippedCount = await executionRepository
      .createQueryBuilder('execution')
      .where('execution.status = :status', { status: ExecutionStatus.SKIPPED })
      .andWhere('execution.completedAt < :cutoff', { cutoff: thirtyDaysAgo })
      .getCount();

    if (skippedCount > 0) {
      logger.log(`Deleting ${skippedCount.toLocaleString()} SKIPPED executions older than 30 days...`);
      const deleteResult = await executionRepository
        .createQueryBuilder()
        .delete()
        .from(JourneyNodeExecution)
        .where('status = :status', { status: ExecutionStatus.SKIPPED })
        .andWhere('completedAt < :cutoff', { cutoff: thirtyDaysAgo })
        .execute();
      logger.log(`Deleted ${deleteResult.affected || 0} SKIPPED executions`);
    } else {
      logger.log('No SKIPPED executions older than 30 days found');
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

    logger.log('\nCleanup completed successfully!');
    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error(`Cleanup failed: ${error.message}`, error.stack);
    process.exit(1);
  }
}

cleanupStaleExecutions();

