import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { JourneyNodeExecution, ExecutionStatus } from '../src/entities/journey-node-execution.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';

/**
 * Delete all PENDING journey node executions
 * 
 * WARNING: This will delete ALL pending executions, including ones that may be legitimate
 * Use with caution - this is a nuclear option for clearing massive backlogs
 */
async function deleteAllPendingExecutions() {
  const logger = new Logger('DeleteAllPendingExecutions');
  
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const executionRepository = app.get<Repository<JourneyNodeExecution>>(
      getRepositoryToken(JourneyNodeExecution),
    );

    logger.log('Starting deletion of all PENDING executions...');
    logger.warn('WARNING: This will delete ALL pending executions!');

    // Count PENDING executions
    const pendingCount = await executionRepository
      .createQueryBuilder('execution')
      .where('execution.status = :status', { status: ExecutionStatus.PENDING })
      .getCount();

    logger.log(`Found ${pendingCount.toLocaleString()} PENDING executions to delete`);

    if (pendingCount === 0) {
      logger.log('No PENDING executions found. Exiting.');
      await app.close();
      process.exit(0);
    }

    // Delete in batches to avoid overwhelming the database
    const BATCH_SIZE = 10000;
    let totalDeleted = 0;
    let batchNumber = 0;

    while (true) {
      batchNumber++;
      logger.log(`Deleting batch ${batchNumber} (up to ${BATCH_SIZE} executions)...`);

      // Get IDs to delete in this batch
      const executionsToDelete = await executionRepository
        .createQueryBuilder('execution')
        .select('execution.id')
        .where('execution.status = :status', { status: ExecutionStatus.PENDING })
        .limit(BATCH_SIZE)
        .getMany();

      if (executionsToDelete.length === 0) {
        break;
      }

      const idsToDelete = executionsToDelete.map(e => e.id);

      const deleteResult = await executionRepository
        .createQueryBuilder()
        .delete()
        .from(JourneyNodeExecution)
        .where('id IN (:...ids)', { ids: idsToDelete })
        .execute();

      const deleted = deleteResult.affected || 0;
      totalDeleted += deleted;

      logger.log(`Deleted ${deleted.toLocaleString()} executions in batch ${batchNumber}. Total deleted: ${totalDeleted.toLocaleString()}`);

      if (executionsToDelete.length < BATCH_SIZE) {
        // Last batch
        break;
      }

      // Small delay between batches to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Verify deletion
    const remainingCount = await executionRepository
      .createQueryBuilder('execution')
      .where('execution.status = :status', { status: ExecutionStatus.PENDING })
      .getCount();

    logger.log(`\n=== Deletion Complete ===`);
    logger.log(`Total deleted: ${totalDeleted.toLocaleString()}`);
    logger.log(`Remaining PENDING executions: ${remainingCount.toLocaleString()}`);

    // Final counts by status
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

    logger.log('\nDeletion completed successfully!');
    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error(`Deletion failed: ${error.message}`, error.stack);
    process.exit(1);
  }
}

deleteAllPendingExecutions();

