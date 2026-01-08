import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { JourneyNodeExecution, ExecutionStatus } from '../src/entities/journey-node-execution.entity';
import { JourneyContact, JourneyContactStatus } from '../src/entities/journey-contact.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';

/**
 * Remove leads stuck in pending call completion status
 * 
 * This script:
 * 1. Finds all EXECUTING executions with waitingForCallCompletion = true
 * 2. Marks them as COMPLETED with failed/timeout outcome
 * 3. Removes the associated journey contacts from their journeys
 */
async function removeStuckCallExecutions() {
  const logger = new Logger('RemoveStuckCallExecutions');
  
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const executionRepository = app.get<Repository<JourneyNodeExecution>>(
      getRepositoryToken(JourneyNodeExecution),
    );
    const journeyContactRepository = app.get<Repository<JourneyContact>>(
      getRepositoryToken(JourneyContact),
    );

    logger.log('Starting removal of leads stuck in pending call completion...');

    // Find all EXECUTING executions waiting for call completion
    const stuckExecutions = await executionRepository
      .createQueryBuilder('execution')
      .leftJoinAndSelect('execution.journeyContact', 'journeyContact')
      .where('execution.status = :status', { status: ExecutionStatus.EXECUTING })
      .andWhere("execution.result->>'waitingForCallCompletion' = 'true'")
      .getMany();

    logger.log(`Found ${stuckExecutions.length} stuck executions waiting for call completion`);

    if (stuckExecutions.length === 0) {
      logger.log('No stuck executions found. Exiting.');
      await app.close();
      process.exit(0);
    }

    // Group by journeyContactId to get unique contacts
    const journeyContactIds = new Set<string>();
    const executionIds: string[] = [];

    stuckExecutions.forEach(execution => {
      executionIds.push(execution.id);
      if (execution.journeyContactId) {
        journeyContactIds.add(execution.journeyContactId);
      }
    });

    logger.log(`Found ${journeyContactIds.size} unique journey contacts to remove`);
    logger.log(`Found ${executionIds.length} executions to mark as completed`);

    // Update executions to COMPLETED with failed outcome
    logger.log('Marking executions as COMPLETED with failed outcome...');
    for (const execution of stuckExecutions) {
      const updatedResult = {
        ...execution.result,
        waitingForCallCompletion: false,
        success: false,
        error: 'Call completion timeout - execution stuck in pending state',
        outcome: 'failed',
        outcomeDetails: 'Call completion timeout - removed from journey',
        callStatus: 'failed',
      };

      execution.status = ExecutionStatus.COMPLETED;
      execution.completedAt = new Date();
      execution.result = updatedResult as any;

      await executionRepository.save(execution);
    }

    logger.log(`✓ Marked ${stuckExecutions.length} executions as COMPLETED`);

    // Remove journey contacts from their journeys
    logger.log('Removing journey contacts from their journeys...');
    let removedCount = 0;
    for (const journeyContactId of journeyContactIds) {
      const journeyContact = await journeyContactRepository.findOne({
        where: { id: journeyContactId },
      });

      if (journeyContact && journeyContact.status !== JourneyContactStatus.REMOVED) {
        journeyContact.status = JourneyContactStatus.REMOVED;
        journeyContact.removedAt = new Date();
        await journeyContactRepository.save(journeyContact);
        removedCount++;
      }
    }

    logger.log(`✓ Removed ${removedCount} journey contacts from their journeys`);

    // Summary
    logger.log('\n=== Summary ===');
    logger.log(`Executions marked as COMPLETED: ${stuckExecutions.length}`);
    logger.log(`Journey contacts removed: ${removedCount}`);

    // Show breakdown by journey
    const journeyBreakdown = new Map<string, number>();
    for (const execution of stuckExecutions) {
      if (execution.journeyContact?.journeyId) {
        const count = journeyBreakdown.get(execution.journeyContact.journeyId) || 0;
        journeyBreakdown.set(execution.journeyContact.journeyId, count + 1);
      }
    }

    if (journeyBreakdown.size > 0) {
      logger.log('\n=== Breakdown by Journey ===');
      for (const [journeyId, count] of journeyBreakdown.entries()) {
        logger.log(`Journey ${journeyId}: ${count} execution(s)`);
      }
    }

    logger.log('\n✓ Successfully removed all stuck call executions and their journey contacts!');
    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error(`Removal failed: ${error.message}`, error.stack);
    process.exit(1);
  }
}

removeStuckCallExecutions();

