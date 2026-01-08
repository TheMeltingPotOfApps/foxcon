import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { JourneyNodeExecution, ExecutionStatus } from '../entities/journey-node-execution.entity';
import { JourneyContact, JourneyContactStatus } from '../entities/journey-contact.entity';
import { Tenant } from '../entities/tenant.entity';
import { JourneysService } from './journeys.service';
import { ExecutionRulesService } from '../execution-rules/execution-rules.service';
import { ExecutionRules, AfterHoursAction, TcpaviolationAction, ResubmissionAction } from '../entities/execution-rules.entity';

@Injectable()
export class JourneySchedulerService {
  private readonly logger = new Logger(JourneySchedulerService.name);
  
  // Queue for batched rescheduling updates - key: `${tenantId}:${journeyId}:${journeyContactId}:${day}`, value: newStartTime
  private rescheduleQueue = new Map<string, { tenantId: string; journeyId: string; journeyContactId: string; day: number; newStartTime: Date }>();
  
  // Maximum size for reschedule queue to prevent memory leaks
  private readonly MAX_RESCHEDULE_QUEUE_SIZE = 10000;
  
  // Flag to prevent overlapping cron jobs
  private isProcessing = false;
  
  // Maximum time (in milliseconds) a cron job can run before yielding to event loop
  private readonly MAX_PROCESSING_TIME = 45000; // 45 seconds (leave 15 seconds for HTTP requests)

  constructor(
    @InjectRepository(JourneyNodeExecution)
    private journeyNodeExecutionRepository: Repository<JourneyNodeExecution>,
    @InjectRepository(JourneyContact)
    private journeyContactRepository: Repository<JourneyContact>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private journeysService: JourneysService,
    private executionRulesService: ExecutionRulesService,
  ) {}

  /**
   * Process pending journey node executions that are due to run
   * Runs every minute
   * CRITICAL: Processes ALL pending executions in batches to ensure execution integrity
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processPendingExecutions() {
    // Prevent overlapping cron jobs
    if (this.isProcessing) {
      this.logger.warn('[ExecutionIntegrity] Previous cron job still running, skipping this run');
      return;
    }
    
    this.isProcessing = true;
    const startTime = Date.now();
    
    try {
      const now = new Date();
      // Increased batch size for TIME_DELAY nodes (they execute instantly)
      // Process TIME_DELAY nodes in larger batches since they're lightweight
      const TIME_DELAY_BATCH_SIZE = 500; // Larger batch for TIME_DELAY nodes
      const BATCH_SIZE = 100; // Process in batches to avoid memory issues
      let totalProcessed = 0;
      let totalFailed = 0;
      let totalRescheduled = 0;
      let totalSkipped = 0;
      
      // Process pending executions in batches until none remain or timeout
      // This ensures execution integrity - no executions are missed
      // But we yield to event loop periodically to allow HTTP requests
      while (true) {
        // Check if we've exceeded max processing time
        if (Date.now() - startTime > this.MAX_PROCESSING_TIME) {
          this.logger.warn(
            `[ExecutionIntegrity] Max processing time (${this.MAX_PROCESSING_TIME}ms) reached. ` +
            `Processed ${totalProcessed} executions. Remaining will be processed in next cycle.`
          );
          break;
        }
        // Find PENDING executions that are scheduled to run now or earlier
        // Prioritize TIME_DELAY nodes to ensure delays execute immediately and schedule next nodes
        // Use larger batch size for TIME_DELAY nodes since they execute instantly
        const pendingExecutions = await this.journeyNodeExecutionRepository
          .createQueryBuilder('execution')
          .leftJoinAndSelect('execution.journeyContact', 'journeyContact')
          .leftJoinAndSelect('journeyContact.contact', 'contact')
          .leftJoinAndSelect('execution.node', 'node')
          .where('execution.status = :status', { status: ExecutionStatus.PENDING })
          .andWhere('execution.scheduledAt <= :now', { now })
          .orderBy('CASE WHEN node.type::text = \'TIME_DELAY\' THEN 0 ELSE 1 END', 'ASC') // Prioritize TIME_DELAY nodes
          .addOrderBy('execution.scheduledAt', 'ASC')
          .limit(TIME_DELAY_BATCH_SIZE) // Use larger batch for TIME_DELAY nodes
          .getMany();

        if (pendingExecutions.length === 0) {
          break; // No more pending executions
        }

        // Separate TIME_DELAY nodes from other nodes for optimized processing
        const timeDelayExecutions = pendingExecutions.filter(e => e.node?.type === 'TIME_DELAY');
        const otherExecutions = pendingExecutions.filter(e => e.node?.type !== 'TIME_DELAY');
        
        this.logger.log(`Processing batch: ${timeDelayExecutions.length} TIME_DELAY, ${otherExecutions.length} other node execution(s)`);

        // Batch process executions - collect failed executions for bulk update
        const failedExecutions: JourneyNodeExecution[] = [];
        const tenantCache = new Map<string, any>(); // Cache tenant lookups
        
        // Process TIME_DELAY nodes first (they're instant and lightweight)
        const executionsToProcess = [...timeDelayExecutions, ...otherExecutions];
        
        // Process each execution
        for (const execution of executionsToProcess) {
          // Check timeout before processing each execution
          if (Date.now() - startTime > this.MAX_PROCESSING_TIME) {
            this.logger.warn(
              `[ExecutionIntegrity] Max processing time (${this.MAX_PROCESSING_TIME}ms) reached during batch processing. ` +
              `Processed ${totalProcessed} executions so far. Remaining will be processed in next cycle.`
            );
            break;
          }
          
          try {
            // Get tenantId from execution (it extends BaseEntity which has tenantId)
            const tenantId = execution.tenantId;
            if (!tenantId) {
              this.logger.warn(`Execution ${execution.id} has no tenantId, skipping`);
              continue;
            }
            
            // Skip execution rules check for TIME_DELAY nodes - they're just delays and don't need after-hours checks
            // This optimization significantly speeds up processing of TIME_DELAY nodes
            let shouldExecute: { shouldExecute: boolean; action?: string; reason?: string; newScheduledTime?: Date };
            if (execution.node?.type !== 'TIME_DELAY') {
              // Check execution rules before executing (with tenant caching)
              shouldExecute = await this.checkExecutionRules(tenantId, execution, tenantCache);
            } else {
              shouldExecute = { shouldExecute: true };
            }
            
            if (!shouldExecute.shouldExecute) {
              // Handle based on action
              await this.handleExecutionRuleAction(
                tenantId,
                execution,
                shouldExecute.action,
                shouldExecute.reason,
                shouldExecute.newScheduledTime,
              );
              
              if (shouldExecute.action === 'RESCHEDULE') {
                totalRescheduled++;
              } else {
                totalSkipped++;
              }
              continue;
            }
            
            // Mark as executing before processing to prevent duplicate execution
            execution.status = ExecutionStatus.EXECUTING;
            execution.executedAt = new Date();
            await this.journeyNodeExecutionRepository.save(execution);
            
            await this.executeScheduledNode(
              tenantId,
              execution.journeyId,
              execution.nodeId,
              execution.journeyContactId,
            );
            
            totalProcessed++;
          } catch (error) {
            this.logger.error(
              `Failed to process execution ${execution.id}: ${error.message}`,
              error.stack,
            );
            
            // Mark execution as failed (collect for batch update)
            execution.status = ExecutionStatus.FAILED;
            execution.completedAt = new Date();
            execution.result = {
              success: false,
              error: error.message,
            };
            failedExecutions.push(execution);
            totalFailed++;
          }
        }

        // Bulk update failed executions
        if (failedExecutions.length > 0) {
          await this.journeyNodeExecutionRepository.save(failedExecutions);
        }
        
        // Yield to event loop after each batch to allow HTTP requests
        await new Promise(resolve => setImmediate(resolve));
        
        // If we processed fewer than the batch size, we're done
        if (pendingExecutions.length < TIME_DELAY_BATCH_SIZE) {
          break;
        }
      }

      // Log summary for monitoring
      if (totalProcessed > 0 || totalFailed > 0 || totalRescheduled > 0 || totalSkipped > 0) {
        this.logger.log(
          `[ExecutionIntegrity] Processed ${totalProcessed} executions, ` +
          `Failed: ${totalFailed}, Rescheduled: ${totalRescheduled}, Skipped: ${totalSkipped}`
        );
      }
      
      // Check for stale executions (scheduled more than 1 hour ago but still PENDING)
      // This helps detect execution integrity issues
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const staleCount = await this.journeyNodeExecutionRepository
        .createQueryBuilder('execution')
        .where('execution.status = :status', { status: ExecutionStatus.PENDING })
        .andWhere('execution.scheduledAt <= :oneHourAgo', { oneHourAgo })
        .getCount();
      
      if (staleCount > 0) {
        this.logger.warn(
          `[ExecutionIntegrity] WARNING: ${staleCount} stale PENDING executions detected ` +
          `(scheduled more than 1 hour ago). This may indicate execution integrity issues.`
        );
      }
    } catch (error) {
      this.logger.error(`Error processing pending executions: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Check execution rules before executing
   */
  private async checkExecutionRules(
    tenantId: string,
    execution: JourneyNodeExecution,
    tenantCache?: Map<string, any>,
  ): Promise<{ shouldExecute: boolean; action?: string; reason?: string; newScheduledTime?: Date }> {
    const rules = await this.executionRulesService.getExecutionRules(tenantId);
    
    // Get tenant timezone (use cache if provided)
    let tenant: any;
    if (tenantCache && tenantCache.has(tenantId)) {
      tenant = tenantCache.get(tenantId);
    } else {
      tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
      if (tenantCache) {
        tenantCache.set(tenantId, tenant);
      }
    }
    const tenantTimezone = tenant?.timezone || rules.afterHoursBusinessHours?.timezone || 'America/New_York';
    
    const scheduledTime = execution.scheduledAt || new Date();
    const now = new Date();

    // Check if CURRENT time is after hours (not just scheduled time)
    // This ensures we don't execute even if scheduled time passed but it's still after hours
    if (rules.enableAfterHoursHandling) {
      const isCurrentlyAfterHours = this.executionRulesService.isAfterHours(now, rules, tenantTimezone);
      const isScheduledAfterHours = this.executionRulesService.isAfterHours(scheduledTime, rules, tenantTimezone);
      
      if (isCurrentlyAfterHours || isScheduledAfterHours) {
        const { hour: currentHour, dayOfWeek: currentDay } = this.executionRulesService.getTimeInTimezone(now, tenantTimezone);
        this.logger.log(`[ExecutionRules] Execution ${execution.id} blocked - Current time in ${tenantTimezone}: ${currentHour}:00 ${currentDay}, Scheduled: ${scheduledTime.toISOString()}, After hours: ${isCurrentlyAfterHours || isScheduledAfterHours}`);
        
        switch (rules.afterHoursAction) {
          case AfterHoursAction.RESCHEDULE_NEXT_AVAILABLE:
          case AfterHoursAction.RESCHEDULE_NEXT_BUSINESS_DAY:
          case AfterHoursAction.RESCHEDULE_SPECIFIC_TIME:
            const newTime = this.executionRulesService.calculateNextAvailableTime(now, rules, tenantTimezone);
            return {
              shouldExecute: false,
              action: 'RESCHEDULE',
              reason: `Currently outside business hours (${tenantTimezone})`,
              newScheduledTime: newTime,
            };
          case AfterHoursAction.SKIP_NODE:
            return {
              shouldExecute: false,
              action: 'SKIP',
              reason: `Currently outside business hours (${tenantTimezone}) - skipping node`,
            };
          case AfterHoursAction.PAUSE_JOURNEY:
            return {
              shouldExecute: false,
              action: 'PAUSE',
              reason: `Currently outside business hours (${tenantTimezone}) - pausing journey`,
            };
          case AfterHoursAction.DEFAULT_EVENT:
            return {
              shouldExecute: false,
              action: 'DEFAULT_EVENT',
              reason: `Currently outside business hours (${tenantTimezone}) - routing to default event`,
            };
        }
      }
    }

    // Check for resubmission (duplicate lead)
    if (rules.enableResubmissionHandling && execution.journeyContact?.contact) {
      const isResubmission = await this.checkResubmission(
        tenantId,
        execution.journeyContact.contact.phoneNumber,
        execution.journeyId,
        rules.resubmissionDetectionWindowHours,
      );

      if (isResubmission) {
        this.logger.log(`[ExecutionRules] Resubmission detected for execution ${execution.id}`);
        
        switch (rules.resubmissionAction) {
          case ResubmissionAction.SKIP_DUPLICATE:
            return {
              shouldExecute: false,
              action: 'SKIP',
              reason: 'Duplicate lead resubmission detected',
            };
          case ResubmissionAction.RESCHEDULE_DELAY:
            const delayHours = rules.resubmissionRescheduleDelayHours || 24;
            const newTime = new Date(scheduledTime);
            newTime.setHours(newTime.getHours() + delayHours);
            return {
              shouldExecute: false,
              action: 'RESCHEDULE',
              reason: 'Duplicate lead resubmission - rescheduling',
              newScheduledTime: newTime,
            };
          case ResubmissionAction.PAUSE_JOURNEY:
            return {
              shouldExecute: false,
              action: 'PAUSE',
              reason: 'Duplicate lead resubmission - pausing journey',
            };
          case ResubmissionAction.DEFAULT_EVENT:
            return {
              shouldExecute: false,
              action: 'DEFAULT_EVENT',
              reason: 'Duplicate lead resubmission - routing to default event',
            };
          case ResubmissionAction.CONTINUE:
            // Allow execution to proceed
            break;
        }
      }
    }

    return { shouldExecute: true };
  }

  /**
   * Check if this is a resubmission (duplicate lead)
   */
  private async checkResubmission(
    tenantId: string,
    phoneNumber: string,
    currentJourneyId: string,
    windowHours: number,
  ): Promise<boolean> {
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - windowHours);

    // Check for other journey contacts with same phone number in the time window
    // Look for journey contacts (not executions) enrolled in different journeys
    const { JourneyContact } = await import('../entities/journey-contact.entity');
    const { Contact } = await import('../entities/contact.entity');
    
    const existingJourneyContacts = await this.journeyContactRepository
      .createQueryBuilder('journeyContact')
      .innerJoin('journeyContact.contact', 'contact')
      .where('journeyContact.tenantId = :tenantId', { tenantId })
      .andWhere('contact.phoneNumber = :phoneNumber', { phoneNumber })
      .andWhere('journeyContact.journeyId != :currentJourneyId', { currentJourneyId })
      .andWhere('journeyContact.enrolledAt >= :windowStart', { windowStart })
      .getCount();

    return existingJourneyContacts > 0;
  }

  /**
   * Handle execution rule actions
   */
  private async handleExecutionRuleAction(
    tenantId: string,
    execution: JourneyNodeExecution,
    action: string,
    reason: string,
    newScheduledTime?: Date,
  ): Promise<void> {
    const rules = await this.executionRulesService.getExecutionRules(tenantId);

    switch (action) {
      case 'RESCHEDULE':
        if (newScheduledTime) {
          // Check if this is a day 1 node that needs to be rescheduled with other day 1 nodes
          const node = execution.node;
          if (node && (node.config?.day === 1 || node.config?.day === undefined)) {
            // Reschedule all day 1 nodes together (queued for batch processing)
            await this.rescheduleDayNodes(tenantId, execution.journeyId, execution.journeyContactId, 1, newScheduledTime);
          } else {
            // Queue individual node reschedule for batch processing
            const day = node?.config?.day || 1;
            await this.rescheduleDayNodes(tenantId, execution.journeyId, execution.journeyContactId, day, newScheduledTime);
            this.logger.debug(`[ExecutionRules] Queued reschedule for execution ${execution.id} to ${newScheduledTime.toISOString()}: ${reason}`);
          }
        }
        break;

      case 'SKIP':
        execution.status = ExecutionStatus.SKIPPED;
        execution.completedAt = new Date();
        execution.result = {
          success: false,
          action: 'SKIPPED',
          reason,
        };
        await this.journeyNodeExecutionRepository.save(execution);
        this.logger.log(`[ExecutionRules] Skipped execution ${execution.id}: ${reason}`);
        break;

      case 'PAUSE':
        // Pause the journey contact
        if (execution.journeyContact) {
          execution.journeyContact.status = JourneyContactStatus.PAUSED;
          execution.journeyContact.pausedAt = new Date();
          await this.journeyContactRepository.save(execution.journeyContact);
        }
        execution.status = ExecutionStatus.SKIPPED;
        execution.completedAt = new Date();
        execution.result = {
          success: false,
          action: 'PAUSED',
          reason,
        };
        await this.journeyNodeExecutionRepository.save(execution);
        this.logger.log(`[ExecutionRules] Paused journey for execution ${execution.id}: ${reason}`);
        break;

      case 'DEFAULT_EVENT':
        // Route to default event type if configured
        // This would need to be implemented based on your event system
        execution.status = ExecutionStatus.SKIPPED;
        execution.completedAt = new Date();
        execution.result = {
          success: false,
          action: 'DEFAULT_EVENT',
          reason,
        };
        await this.journeyNodeExecutionRepository.save(execution);
        this.logger.log(`[ExecutionRules] Routed to default event for execution ${execution.id}: ${reason}`);
        break;
    }
  }

  /**
   * Queue rescheduling of all nodes for a specific day to a new time
   * Updates are batched and processed every minute
   */
  private async rescheduleDayNodes(
    tenantId: string,
    journeyId: string,
    journeyContactId: string,
    day: number,
    newStartTime: Date,
  ): Promise<void> {
    // Prevent queue from growing unbounded
    if (this.rescheduleQueue.size >= this.MAX_RESCHEDULE_QUEUE_SIZE) {
      this.logger.warn(
        `[ExecutionRules] Reschedule queue is full (${this.rescheduleQueue.size} entries). ` +
        `Skipping reschedule for ${tenantId}:${journeyId}:${journeyContactId}:${day}. ` +
        `Queue will be processed on next cron cycle.`
      );
      return;
    }
    
    // Queue the reschedule request instead of executing immediately
    const queueKey = `${tenantId}:${journeyId}:${journeyContactId}:${day}`;
    this.rescheduleQueue.set(queueKey, {
      tenantId,
      journeyId,
      journeyContactId,
      day,
      newStartTime,
    });
    
    this.logger.debug(`[ExecutionRules] Queued reschedule for day ${day} nodes to ${newStartTime.toISOString()} (queue size: ${this.rescheduleQueue.size})`);
  }

  /**
   * Timeout MAKE_CALL executions that have been waiting too long
   * Runs every minute to check for stuck call executions
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async timeoutStuckCallExecutions() {
    try {
      const timeoutMinutes = 5; // Timeout after 5 minutes
      const timeoutThreshold = new Date(Date.now() - timeoutMinutes * 60 * 1000);

      // Find executions that are waiting for call completion and are older than timeout threshold
      const stuckExecutions = await this.journeyNodeExecutionRepository
        .createQueryBuilder('execution')
        .innerJoinAndSelect('execution.node', 'node')
        .innerJoinAndSelect('execution.journeyContact', 'journeyContact')
        .where('execution.status = :status', { status: ExecutionStatus.EXECUTING })
        .andWhere('execution.executedAt < :timeoutThreshold', { timeoutThreshold })
        .andWhere('node.type::text = :nodeType', { nodeType: 'MAKE_CALL' })
        .andWhere("execution.result->>'waitingForCallCompletion' = 'true'")
        .getMany();

      if (stuckExecutions.length > 0) {
        this.logger.warn(`[JourneyExecution] Found ${stuckExecutions.length} stuck MAKE_CALL execution(s), timing them out`);

        for (const execution of stuckExecutions) {
          try {
            // Mark as failed due to timeout
            const updatedResult = {
              ...execution.result,
              waitingForCallCompletion: false,
              callStatus: 'timeout',
              outcome: 'failed',
              outcomeDetails: `Call timed out after ${timeoutMinutes} minutes - no completion callback received`,
            };

            execution.result = updatedResult;
            execution.status = ExecutionStatus.FAILED;
            execution.completedAt = new Date();
            await this.journeyNodeExecutionRepository.save(execution);

            // Route to failed output if available
            const node = execution.node;
            if (node?.connections?.outputs?.failed) {
              const targetNodeId = node.connections.outputs.failed;
              const journeyContact = execution.journeyContact;
              if (journeyContact) {
                journeyContact.currentNodeId = targetNodeId;
                await this.journeyContactRepository.save(journeyContact);
                await this.journeysService.scheduleNodeExecution(
                  execution.tenantId,
                  execution.journeyId,
                  targetNodeId,
                  execution.journeyContactId,
                );
              }
            } else {
              // No failed output - journey completes
              const journeyContact = execution.journeyContact;
              if (journeyContact) {
                journeyContact.status = JourneyContactStatus.COMPLETED;
                journeyContact.completedAt = new Date();
                await this.journeyContactRepository.save(journeyContact);
              }
            }

            this.logger.log(`[JourneyExecution] Timed out stuck execution ${execution.id}`);
          } catch (error) {
            this.logger.error(`[JourneyExecution] Failed to timeout execution ${execution.id}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`[JourneyExecution] Failed to check for stuck call executions: ${error.message}`);
    }
  }

  /**
   * Process queued rescheduling updates in bulk
   * Runs every minute to batch all reschedule operations
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processQueuedReschedules() {
    if (this.rescheduleQueue.size === 0) {
      return; // No queued updates
    }

    const queueSize = this.rescheduleQueue.size;
    this.logger.log(`[ExecutionRules] Processing ${queueSize} queued reschedule update(s)`);

    // Group updates by unique combination to avoid duplicate queries
    const updatesToProcess = Array.from(this.rescheduleQueue.values());
    this.rescheduleQueue.clear(); // Clear queue immediately to prevent duplicates

    // Process each queued reschedule
    for (const update of updatesToProcess) {
      try {
        const { tenantId, journeyId, journeyContactId, day, newStartTime } = update;
        
        // Find all pending executions for day nodes
        const { JourneyNode } = await import('../entities/journey-node.entity');
        
        const dayExecutions = await this.journeyNodeExecutionRepository
          .createQueryBuilder('execution')
          .innerJoin('execution.node', 'node')
          .where('execution.tenantId = :tenantId', { tenantId })
          .andWhere('execution.journeyId = :journeyId', { journeyId })
          .andWhere('execution.journeyContactId = :journeyContactId', { journeyContactId })
          .andWhere('execution.status = :status', { status: ExecutionStatus.PENDING })
          .andWhere('((node.config->>\'day\')::integer = CAST(:day AS INTEGER) OR (node.config->>\'day\' IS NULL AND CAST(:day AS INTEGER) = 1))', { day: Number(day) })
          .getMany();

        if (dayExecutions.length > 0) {
          // For day 1 nodes, apply spread buffer to avoid all executing at once
          // Use the first execution's journeyContactId for consistent spreading
          const spreadWindowMinutes = 120; // 2-hour spread window
          let finalScheduledTime = newStartTime;
          
          if (day === 1 && dayExecutions.length > 0) {
            // Apply spread buffer using journeyContactId hash (same logic as spreadNextDayExecution)
            const journeyContactId = dayExecutions[0].journeyContactId;
            let hash = 0;
            for (let i = 0; i < journeyContactId.length; i++) {
              const char = journeyContactId.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash; // Convert to 32-bit integer
            }
            const offsetMinutes = Math.abs(hash) % spreadWindowMinutes;
            finalScheduledTime = new Date(newStartTime);
            finalScheduledTime.setMinutes(finalScheduledTime.getMinutes() + offsetMinutes);
            
            this.logger.log(`[ExecutionRules] Applied ${offsetMinutes}-minute spread buffer to day 1 reschedule (${newStartTime.toISOString()} -> ${finalScheduledTime.toISOString()})`);
          }
          
          // Bulk update all day nodes to the final scheduled time
          const executionIds = dayExecutions.map(exec => exec.id);
          await this.journeyNodeExecutionRepository
            .createQueryBuilder()
            .update()
            .set({
              scheduledAt: finalScheduledTime,
              status: ExecutionStatus.PENDING,
              updatedAt: () => 'CURRENT_TIMESTAMP',
            })
            .where('id IN (:...ids)', { ids: executionIds })
            .execute();
          
          this.logger.log(`[ExecutionRules] Bulk rescheduled ${dayExecutions.length} day ${day} node(s) to ${finalScheduledTime.toISOString()}`);
        }
      } catch (error) {
        this.logger.error(`[ExecutionRules] Failed to process queued reschedule: ${error.message}`, error.stack);
      }
    }

    this.logger.log(`[ExecutionRules] Completed processing ${queueSize} queued reschedule update(s)`);
  }

  /**
   * Execute a scheduled node
   */
  private async executeScheduledNode(
    tenantId: string,
    journeyId: string,
    nodeId: string,
    journeyContactId: string,
  ): Promise<void> {
    await this.journeysService.executeNode(tenantId, journeyId, nodeId, journeyContactId);
  }
}

