import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, In, MoreThan, Or, Not, IsNull, Brackets, LessThanOrEqual } from 'typeorm';
import { Message, MessageDirection, MessageStatus } from '../entities/message.entity';
import { CallLog, CallStatus, CallDisposition } from '../entities/call-log.entity';
import { Campaign, CampaignStatus } from '../entities/campaign.entity';
import { Conversation, ConversationStatus } from '../entities/conversation.entity';
import { Contact, LeadStatus } from '../entities/contact.entity';
import { JourneyNodeExecution } from '../entities/journey-node-execution.entity';
import { JourneyContact } from '../entities/journey-contact.entity';
import { Journey } from '../entities/journey.entity';

export interface DashboardStats {
  messagesSent: number;
  messagesDelivered: number;
  messagesFailed: number;
  deliveryRate: number;
  replies: number;
  aiUsage: number;
  qualifiedLeads: number;
  openConversations: number;
  callsPlaced: number;
  callsAnswered: number;
  callsFailed: number; // Failed calls (excluding NO_ANSWER)
  callAnswerRate: number;
  transfersAttempted: number;
  transfersCompleted: number;
  transferRate: number; // Percentage of answered calls that resulted in transfers
  totalContacts: number;
  optedOutContacts: number;
  leadsIngested: number; // Count of contacts created
  contactRateByLeadAge: {
    age0to7: { total: number; answered: number; rate: number };
    age8to14: { total: number; answered: number; rate: number };
    age15to30: { total: number; answered: number; rate: number };
    age31plus: { total: number; answered: number; rate: number };
  };
  totalCallDuration: number; // in seconds
  averageCallDuration: number; // in seconds
}

export interface JourneyActivityLog {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  status: string;
  scheduledAt: Date;
  executedAt?: Date;
  completedAt?: Date;
  result?: any;
  journeyDay?: number; // Day in journey (calculated from enrolledAt)
  callNumber?: number; // Which call attempt this is
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(CallLog)
    private callLogRepository: Repository<CallLog>,
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(JourneyNodeExecution)
    private journeyNodeExecutionRepository: Repository<JourneyNodeExecution>,
    @InjectRepository(JourneyContact)
    private journeyContactRepository: Repository<JourneyContact>,
  ) {}

  async getStats(tenantId: string, timeRange?: 'today' | 'week' | 'month' | 'all'): Promise<DashboardStats> {
    const dateFilter = this.getDateFilter(timeRange);

    // Message Statistics
    const [messagesSent, messagesDelivered, messagesFailed, replies] = await Promise.all([
      // Total messages sent (outbound)
      this.messageRepository.count({
        where: {
          tenantId,
          direction: MessageDirection.OUTBOUND,
          ...(dateFilter && { createdAt: MoreThanOrEqual(dateFilter) }),
        },
      }),
      // Messages delivered
      this.messageRepository.count({
        where: {
          tenantId,
          direction: MessageDirection.OUTBOUND,
          status: MessageStatus.DELIVERED,
          ...(dateFilter && { createdAt: MoreThanOrEqual(dateFilter) }),
        },
      }),
      // Messages failed
      this.messageRepository.count({
        where: {
          tenantId,
          direction: MessageDirection.OUTBOUND,
          status: MessageStatus.FAILED,
          ...(dateFilter && { createdAt: MoreThanOrEqual(dateFilter) }),
        },
      }),
      // Replies (inbound messages)
      this.messageRepository.count({
        where: {
          tenantId,
          direction: MessageDirection.INBOUND,
          ...(dateFilter && { createdAt: MoreThanOrEqual(dateFilter) }),
        },
      }),
    ]);

    // Calculate delivery rate
    const deliveryRate =
      messagesSent > 0 ? Math.round((messagesDelivered / messagesSent) * 100) : 0;

    // AI Usage - count campaigns with AI enabled or messages that might be AI-generated
    // For now, we'll count campaigns with AI enabled as a proxy
    const aiEnabledCampaigns = await this.campaignRepository.count({
      where: {
        tenantId,
        aiEnabled: true,
        ...(dateFilter && { createdAt: MoreThanOrEqual(dateFilter) }),
      },
    });
    // We can also count messages sent from AI-enabled campaigns
    // For simplicity, using campaign count as proxy
    const aiUsage = aiEnabledCampaigns;

    // Call Statistics
    // Total calls placed
    const callsPlaced = await this.callLogRepository.count({
      where: {
        tenantId,
        ...(dateFilter && { createdAt: MoreThanOrEqual(dateFilter) }),
      },
    });

    // Calls answered - check disposition field first (most reliable)
    // Also include ANSWERED and COMPLETED statuses as fallback
    // (COMPLETED means the call was answered and finished)
    const queryBuilder = this.callLogRepository
      .createQueryBuilder('call_log')
      .where('call_log.tenantId = :tenantId', { tenantId })
      .andWhere(
        '(call_log.disposition = :answeredDisposition OR call_log.status IN (:...answeredStatuses))',
        {
          answeredDisposition: CallDisposition.ANSWERED,
          answeredStatuses: [CallStatus.ANSWERED, CallStatus.COMPLETED],
        },
      );
    
    if (dateFilter) {
      queryBuilder.andWhere('call_log.createdAt >= :dateFilter', { dateFilter });
    }
    
    const callsAnswered = await queryBuilder.getCount();

    // Get call logs with duration for average calculation
    // Only include calls that were answered (have duration > 0)
    const callLogsWithDuration = await this.callLogRepository.find({
      where: {
        tenantId,
        duration: MoreThan(0), // Only calls with actual duration (answered calls)
        ...(dateFilter && { createdAt: MoreThanOrEqual(dateFilter) }),
      },
      select: ['duration'],
    });

    // Calculate call answer rate
    const callAnswerRate = callsPlaced > 0 ? Math.round((callsAnswered / callsPlaced) * 100) : 0;

    // Calculate total and average call duration
    const totalCallDuration = callLogsWithDuration.reduce(
      (sum, log) => sum + (log.duration || 0),
      0,
    );
    const averageCallDuration =
      callLogsWithDuration.length > 0
        ? Math.round(totalCallDuration / callLogsWithDuration.length)
        : 0;

    // Transfer Statistics
    // Count calls with transfer attempts (have transferNumber set)
    const transfersAttempted = await this.callLogRepository.count({
      where: {
        tenantId,
        transferNumber: Not(IsNull()),
        ...(dateFilter && { createdAt: MoreThanOrEqual(dateFilter) }),
      },
    });

    // Count successful transfers using efficient database queries
    // Use JSONB operators with GIN indexes for fast lookups
    const transfersCompletedQuery = this.callLogRepository
      .createQueryBuilder('call_log')
      .where('call_log.tenantId = :tenantId', { tenantId })
      .andWhere('call_log.transferNumber IS NOT NULL')
      .andWhere("call_log.transferNumber != ''")
      .andWhere(
        new Brackets((qb) => {
          // Check metadata for completed status (uses GIN index)
          qb.where("call_log.metadata->>'transferStatus' = 'completed'")
            // Check callFlowEvents for TransferConnected (uses GIN index)
            .orWhere("EXISTS (SELECT 1 FROM jsonb_array_elements(call_log.\"callFlowEvents\") AS event WHERE event->>'type' = 'TransferConnected')")
            // Check callFlowEvents for TransferResult with ANSWER status
            .orWhere("EXISTS (SELECT 1 FROM jsonb_array_elements(call_log.\"callFlowEvents\") AS event WHERE event->>'type' = 'TransferResult' AND (event->'data'->>'status' = 'ANSWER' OR event->>'Status' = 'ANSWER'))");
        })
      );
    
    if (dateFilter) {
      transfersCompletedQuery.andWhere('call_log.createdAt >= :dateFilter', { dateFilter });
    }
    
    const transfersCompleted = await transfersCompletedQuery.getCount();

    // Calculate transfer rate as percentage of answered calls that resulted in transfers
    // This shows what percentage of answered calls were transferred, not success rate of transfer attempts
    const transferRate = callsAnswered > 0 
      ? Math.round((transfersCompleted / callsAnswered) * 100) 
      : 0;

    // Failed calls (excluding NO_ANSWER - only actual failures like BUSY, FAILED, etc.)
    const callsFailed = await this.callLogRepository.count({
      where: {
        tenantId,
        disposition: In([CallDisposition.BUSY, CallDisposition.FAILED, CallDisposition.CANCELLED]),
        ...(dateFilter && { createdAt: MoreThanOrEqual(dateFilter) }),
      },
    });

    // Leads Ingested - count of contacts created in the time range
    // This counts all contacts that were created (not updated) during the specified time period
    const leadsIngested = await this.contactRepository.count({
      where: {
        tenantId,
        ...(dateFilter && { createdAt: MoreThanOrEqual(dateFilter) }),
      },
    });

    // Contact Rate by Lead Age
    // Calculate age buckets: 0-7 days, 8-14 days, 15-30 days, 31+ days
    // Note: These buckets represent leads that are CURRENTLY X days old (based on current date)
    // We don't apply dateFilter here because we want to see conversion rates for all leads of each age
    const now = new Date();
    const age0to7Date = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const age8to14Date = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const age15to30Date = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get contacts by age bucket (all contacts, not filtered by dateFilter)
    const [contacts0to7, contacts8to14, contacts15to30, contacts31plus] = await Promise.all([
      // 0-7 days old (created in last 7 days)
      this.contactRepository
        .createQueryBuilder('contact')
        .where('contact.tenantId = :tenantId', { tenantId })
        .andWhere('contact.createdAt >= :age0to7Date', { age0to7Date })
        .select(['contact.id', 'contact.phoneNumber', 'contact.createdAt'])
        .getMany(),
      // 8-14 days old (created 8-14 days ago)
      this.contactRepository
        .createQueryBuilder('contact')
        .where('contact.tenantId = :tenantId', { tenantId })
        .andWhere('contact.createdAt < :age0to7Date', { age0to7Date })
        .andWhere('contact.createdAt >= :age8to14Date', { age8to14Date })
        .select(['contact.id', 'contact.phoneNumber', 'contact.createdAt'])
        .getMany(),
      // 15-30 days old (created 15-30 days ago)
      this.contactRepository
        .createQueryBuilder('contact')
        .where('contact.tenantId = :tenantId', { tenantId })
        .andWhere('contact.createdAt < :age8to14Date', { age8to14Date })
        .andWhere('contact.createdAt >= :age15to30Date', { age15to30Date })
        .select(['contact.id', 'contact.phoneNumber', 'contact.createdAt'])
        .getMany(),
      // 31+ days old (created more than 30 days ago)
      this.contactRepository
        .createQueryBuilder('contact')
        .where('contact.tenantId = :tenantId', { tenantId })
        .andWhere('contact.createdAt < :age15to30Date', { age15to30Date })
        .select(['contact.id', 'contact.phoneNumber', 'contact.createdAt'])
        .getMany(),
    ]);

    // Count answered calls for each age bucket
    // Note: We count ALL answered calls for these contacts (ever), not just calls in the time range
    // This gives us the true conversion rate: "Of leads that are X days old, what % have been answered?"
    const getAnsweredCallsForContacts = async (contacts: Contact[]) => {
      if (contacts.length === 0) return 0;
      const phoneNumbers = contacts.map(c => c.phoneNumber);
      // Count distinct contacts that have been answered (not total calls)
      // This ensures each contact is only counted once even if they have multiple answered calls
      const answeredContacts = await this.callLogRepository
        .createQueryBuilder('call_log')
        .select('DISTINCT call_log.to', 'phoneNumber')
        .where('call_log.tenantId = :tenantId', { tenantId })
        .andWhere('call_log.to IN (:...phoneNumbers)', { phoneNumbers })
        .andWhere('call_log.disposition = :disposition', { disposition: CallDisposition.ANSWERED })
        .getRawMany();
      
      return answeredContacts.length;
    };

    const [answered0to7, answered8to14, answered15to30, answered31plus] = await Promise.all([
      getAnsweredCallsForContacts(contacts0to7),
      getAnsweredCallsForContacts(contacts8to14),
      getAnsweredCallsForContacts(contacts15to30),
      getAnsweredCallsForContacts(contacts31plus),
    ]);

    const contactRateByLeadAge = {
      age0to7: {
        total: contacts0to7.length,
        answered: answered0to7,
        rate: contacts0to7.length > 0 ? Math.round((answered0to7 / contacts0to7.length) * 100) : 0,
      },
      age8to14: {
        total: contacts8to14.length,
        answered: answered8to14,
        rate: contacts8to14.length > 0 ? Math.round((answered8to14 / contacts8to14.length) * 100) : 0,
      },
      age15to30: {
        total: contacts15to30.length,
        answered: answered15to30,
        rate: contacts15to30.length > 0 ? Math.round((answered15to30 / contacts15to30.length) * 100) : 0,
      },
      age31plus: {
        total: contacts31plus.length,
        answered: answered31plus,
        rate: contacts31plus.length > 0 ? Math.round((answered31plus / contacts31plus.length) * 100) : 0,
      },
    };

    // Conversation Statistics
    const openConversations = await this.conversationRepository.count({
      where: {
        tenantId,
        status: ConversationStatus.OPEN,
      },
    });

    // Contact Statistics
    const [qualifiedLeads, totalContacts, optedOutContacts] = await Promise.all([
      // Qualified leads (contacts with leadStatus = SOLD or CONTACT_MADE)
      this.contactRepository
        .createQueryBuilder('contact')
        .where('contact.tenantId = :tenantId', { tenantId })
        .andWhere('(contact.leadStatus = :sold OR contact.leadStatus = :contactMade)', {
          sold: LeadStatus.SOLD,
          contactMade: LeadStatus.CONTACT_MADE,
        })
        .getCount(),
      // Total contacts
      this.contactRepository.count({
        where: {
          tenantId,
        },
      }),
      // Opted out contacts
      this.contactRepository.count({
        where: {
          tenantId,
          isOptedOut: true,
        },
      }),
    ]);

    return {
      messagesSent,
      messagesDelivered,
      messagesFailed,
      deliveryRate,
      replies,
      aiUsage,
      qualifiedLeads,
      openConversations,
      callsPlaced,
      callsAnswered,
      callsFailed,
      callAnswerRate,
      transfersAttempted,
      transfersCompleted,
      transferRate,
      totalContacts,
      optedOutContacts,
      leadsIngested,
      contactRateByLeadAge,
      totalCallDuration,
      averageCallDuration,
    };
  }

  /**
   * Get activity logs for a specific journey
   */
  async getJourneyActivityLogs(
    tenantId: string,
    journeyId: string,
    limit: number = 50,
  ): Promise<JourneyActivityLog[]> {
    // First verify the journey belongs to the tenant
    const journey = await this.journeyNodeExecutionRepository.manager.findOne(Journey, {
      where: { id: journeyId, tenantId },
    });

    if (!journey) {
      return [];
    }

    const executions = await this.journeyNodeExecutionRepository
      .createQueryBuilder('execution')
      .leftJoinAndSelect('execution.node', 'node')
      .leftJoinAndSelect('execution.journeyContact', 'journeyContact')
      .leftJoinAndSelect('journeyContact.contact', 'contact')
      .where('execution.journeyId = :journeyId', { journeyId })
      .orderBy('execution.executedAt', 'DESC')
      .addOrderBy('execution.scheduledAt', 'DESC')
      .take(limit)
      .getMany();

    // Get all MAKE_CALL executions for contacts in this journey to calculate call numbers
    const journeyContacts = await this.journeyContactRepository.find({
      where: { journeyId },
      select: ['id'],
    });
    
    const allCallExecutions = await this.journeyNodeExecutionRepository
      .createQueryBuilder('execution')
      .leftJoinAndSelect('execution.node', 'node')
      .leftJoinAndSelect('execution.journeyContact', 'journeyContact')
      .where('execution.journeyId = :journeyId', { journeyId })
      .andWhere('execution.journeyContactId IN (:...journeyContactIds)', {
        journeyContactIds: journeyContacts.map(jc => jc.id),
      })
      .andWhere('node.type = :nodeType', { nodeType: 'MAKE_CALL' })
      .orderBy('execution.executedAt', 'ASC', 'NULLS LAST')
      .addOrderBy('execution.scheduledAt', 'ASC')
      .getMany();

    // Count calls per contact
    const callCountsByContact = new Map<string, number>();
    allCallExecutions.forEach((callExec) => {
      if (callExec.journeyContact?.contactId) {
        const contactId = callExec.journeyContact.contactId;
        const currentCount = callCountsByContact.get(contactId) || 0;
        callCountsByContact.set(contactId, currentCount + 1);
      }
    });

    return executions
      .filter((execution) => execution.journeyContact && execution.journeyContact.contact && execution.node)
      .map((execution) => {
        const journeyContact = execution.journeyContact!;
        const contact = journeyContact.contact!;
        
        // Calculate journey day
        const enrolledAt = journeyContact.enrolledAt || journeyContact.createdAt;
        const executedTime = execution.executedAt?.getTime() || execution.scheduledAt?.getTime() || Date.now();
        const journeyDay = enrolledAt
          ? Math.floor((executedTime - enrolledAt.getTime()) / (24 * 60 * 60 * 1000)) + 1
          : undefined;

        // Calculate call number (for MAKE_CALL nodes)
        let callNumber: number | undefined;
        if (execution.node?.type === 'MAKE_CALL') {
          // Count how many MAKE_CALL executions happened before this one for the same contact
          const previousCalls = allCallExecutions.filter(
            ce => ce.journeyContact?.contactId === contact.id &&
            (ce.executedAt?.getTime() || ce.scheduledAt?.getTime() || 0) < executedTime
          ).length;
          callNumber = previousCalls + 1;
        }

        return {
          id: execution.id,
          nodeId: execution.nodeId,
          nodeName: execution.node?.type || 'UNKNOWN', // JourneyNode doesn't have a name field, use type
          nodeType: execution.node?.type || 'UNKNOWN',
          contactId: contact.id,
          contactName: contact.firstName && contact.lastName
            ? `${contact.firstName} ${contact.lastName}`
            : contact.firstName || contact.email || contact.phoneNumber || 'Unknown Contact',
          contactPhone: contact.phoneNumber,
          status: execution.status,
          scheduledAt: execution.scheduledAt,
          executedAt: execution.executedAt,
          completedAt: execution.completedAt,
          result: execution.result,
          journeyDay,
          callNumber,
        };
      });
  }

  /**
   * Diagnostic endpoint to check transfer data
   */
  async getTransferDiagnostics(tenantId: string): Promise<any> {
    const recentCalls = await this.callLogRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 100,
      select: ['id', 'to', 'transferNumber', 'metadata', 'callFlowEvents', 'createdAt'],
    });

    const callsWithTransfers = recentCalls.filter(c => c.transferNumber && c.transferNumber !== '');
    
    const transferStatusBreakdown = callsWithTransfers.reduce((acc, call) => {
      const status = call.metadata?.transferStatus || 'not_set';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Check callFlowEvents for transfer events
    const callsWithTransferEvents = callsWithTransfers.filter(call => {
      if (!call.callFlowEvents) return false;
      return call.callFlowEvents.some((event: any) => 
        event.type === 'TransferConnected' || 
        event.type === 'TransferResult' ||
        event.type === 'TransferFailed'
      );
    });

    const sampleCalls = callsWithTransfers.slice(0, 10).map(call => ({
      id: call.id,
      to: call.to,
      transferNumber: call.transferNumber,
      transferStatus: call.metadata?.transferStatus || 'not_set',
      hasTransferEvents: call.callFlowEvents?.some((e: any) => 
        e.type?.includes('Transfer')
      ) || false,
      transferEvents: call.callFlowEvents?.filter((e: any) => 
        e.type?.includes('Transfer')
      ) || [],
    }));

    return {
      totalCallsWithTransfers: callsWithTransfers.length,
      transferStatusBreakdown,
      callsWithTransferEvents: callsWithTransferEvents.length,
      sampleCalls,
    };
  }

  /**
   * Diagnostic endpoint to validate call capture and attribution
   */
  async getCallCaptureDiagnostics(tenantId: string): Promise<any> {
    // Get total call count (all time)
    const totalCallsAllTime = await this.callLogRepository.count({
      where: { tenantId },
    });

    // Get calls by context (DynamicIVR vs pbx-outbound)
    const callsByContext = await this.callLogRepository
      .createQueryBuilder('call_log')
      .select('call_log.context', 'context')
      .addSelect('COUNT(*)', 'count')
      .where('call_log.tenantId = :tenantId', { tenantId })
      .groupBy('call_log.context')
      .getRawMany();

    // Get calls by status
    const callsByStatus = await this.callLogRepository
      .createQueryBuilder('call_log')
      .select('call_log.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('call_log.tenantId = :tenantId', { tenantId })
      .groupBy('call_log.status')
      .getRawMany();

    // Get calls with and without uniqueId (Asterisk ID)
    const callsWithUniqueId = await this.callLogRepository.count({
      where: {
        tenantId,
        uniqueId: Not(IsNull()),
      },
    });

    const callsWithoutUniqueId = await this.callLogRepository.count({
      where: {
        tenantId,
        uniqueId: IsNull(),
      },
    });

    // Get recent calls (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCalls24h = await this.callLogRepository.count({
      where: {
        tenantId,
        createdAt: MoreThanOrEqual(last24Hours),
      },
    });

    // Get calls from last 7 days
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCalls7d = await this.callLogRepository.count({
      where: {
        tenantId,
        createdAt: MoreThanOrEqual(last7Days),
      },
    });

    // Sample of recent calls to check tenantId consistency
    const sampleCalls = await this.callLogRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 10,
      select: ['id', 'to', 'from', 'status', 'callStatus', 'disposition', 'uniqueId', 'context', 'tenantId', 'createdAt'],
    });

    // Check for calls with mismatched tenantId (shouldn't happen but good to verify)
    const allCallsSample = await this.callLogRepository
      .createQueryBuilder('call_log')
      .where('call_log.createdAt >= :recentDate', { recentDate: last7Days })
      .orderBy('call_log.createdAt', 'DESC')
      .take(100)
      .getMany();

    const tenantIdMismatches = allCallsSample.filter(c => c.tenantId !== tenantId);

    return {
      totalCallsAllTime,
      recentCalls24h,
      recentCalls7d,
      callsByContext: callsByContext.map(c => ({ context: c.context || 'NULL', count: parseInt(c.count) })),
      callsByStatus: callsByStatus.map(c => ({ status: c.status, count: parseInt(c.count) })),
      callsWithUniqueId,
      callsWithoutUniqueId,
      uniqueIdCoverage: totalCallsAllTime > 0 
        ? Math.round((callsWithUniqueId / totalCallsAllTime) * 100) 
        : 0,
      sampleCalls: sampleCalls.map(c => ({
        id: c.id,
        to: c.to,
        from: c.from,
        status: c.status,
        disposition: c.disposition,
        uniqueId: c.uniqueId,
        context: c.context,
        tenantId: c.tenantId,
        createdAt: c.createdAt,
        tenantIdMatches: c.tenantId === tenantId,
      })),
      tenantIdMismatches: tenantIdMismatches.length,
      warnings: [
        ...(callsWithoutUniqueId > 0 ? [`${callsWithoutUniqueId} calls without Asterisk uniqueId - may indicate AMI listener issues`] : []),
        ...(tenantIdMismatches.length > 0 ? [`Found ${tenantIdMismatches.length} calls with mismatched tenantId`] : []),
        ...(recentCalls24h === 0 && totalCallsAllTime > 0 ? ['No calls in last 24 hours despite having historical calls'] : []),
      ],
    };
  }

  /**
   * Diagnostic endpoint to check call log statuses and dispositions
   */
  async getCallDiagnostics(tenantId: string): Promise<any> {
    const recentCalls = await this.callLogRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 50,
      select: ['id', 'to', 'from', 'status', 'callStatus', 'disposition', 'duration', 'uniqueId', 'createdAt', 'updatedAt'],
    });

    // Group by status
    const statusCounts = recentCalls.reduce((acc, call) => {
      acc[call.status] = (acc[call.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by disposition
    const dispositionCounts = recentCalls.reduce((acc, call) => {
      const disp = call.disposition || 'NULL';
      acc[disp] = (acc[disp] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count calls with duration > 0
    const callsWithDuration = recentCalls.filter(c => c.duration && c.duration > 0).length;

    // Sample of recent calls
    const sampleCalls = recentCalls.slice(0, 10).map(call => ({
      id: call.id,
      to: call.to,
      from: call.from,
      status: call.status,
      callStatus: call.callStatus,
      disposition: call.disposition,
      duration: call.duration,
      uniqueId: call.uniqueId,
      createdAt: call.createdAt,
      updatedAt: call.updatedAt,
    }));

    return {
      totalRecentCalls: recentCalls.length,
      statusCounts,
      dispositionCounts,
      callsWithDuration,
      sampleCalls,
      queryCheck: {
        answeredByDisposition: recentCalls.filter(c => c.disposition === CallDisposition.ANSWERED).length,
        answeredByStatus: recentCalls.filter(c => 
          c.status === CallStatus.ANSWERED || c.status === CallStatus.COMPLETED
        ).length,
        answeredByEither: recentCalls.filter(c => 
          c.disposition === CallDisposition.ANSWERED || 
          c.status === CallStatus.ANSWERED || 
          c.status === CallStatus.COMPLETED
        ).length,
      },
    };
  }

  private getDateFilter(timeRange?: 'today' | 'week' | 'month' | 'all'): Date | null {
    if (!timeRange || timeRange === 'all') {
      return null;
    }

    const now = new Date();
    const filterDate = new Date();

    switch (timeRange) {
      case 'today':
        filterDate.setHours(0, 0, 0, 0);
        return filterDate;
      case 'week':
        filterDate.setDate(now.getDate() - 7);
        filterDate.setHours(0, 0, 0, 0);
        return filterDate;
      case 'month':
        filterDate.setMonth(now.getMonth() - 1);
        filterDate.setHours(0, 0, 0, 0);
        return filterDate;
      default:
        return null;
    }
  }
}

