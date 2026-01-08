import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { CallSession } from '../../entities/call-session.entity';
import { AgentExtension } from '../../entities/agent-extension.entity';
import { AgentActivityLog } from '../../entities/agent-activity-log.entity';
import { CallSessionStatus } from '../../entities/call-session-status.enum';
import { AgentActivityType } from '../../entities/agent-activity-type.enum';
import { AgentStatus } from '../../entities/agent-status.enum';

@Injectable()
export class PbxReportingService {
  private readonly logger = new Logger(PbxReportingService.name);

  constructor(
    @InjectRepository(CallSession)
    private callSessionRepository: Repository<CallSession>,
    @InjectRepository(AgentExtension)
    private agentExtensionRepository: Repository<AgentExtension>,
    @InjectRepository(AgentActivityLog)
    private activityLogRepository: Repository<AgentActivityLog>,
  ) {}

  async getAgentMetrics(
    tenantId: string,
    agentId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    callsHandled: number;
    avgCallDuration: number;
    avgWrapUpTime: number;
    availability: number;
    callsByDisposition: Record<string, number>;
  }> {
    const sessions = await this.callSessionRepository.find({
      where: {
        tenantId,
        agentId,
        createdAt: Between(startDate, endDate),
        status: CallSessionStatus.ENDED,
      },
    });

    const callsHandled = sessions.length;
    const totalDuration = sessions.reduce(
      (sum, s) => sum + (s.duration || 0),
      0,
    );
    const avgCallDuration = callsHandled > 0 ? totalDuration / callsHandled : 0;

    // Calculate wrap-up time from activity logs
    const wrapUpLogs = await this.activityLogRepository.find({
      where: {
        tenantId,
        agentId,
        activityType: AgentActivityType.CALL_ENDED,
        createdAt: Between(startDate, endDate),
      },
    });

    // Calculate availability from activity logs
    const statusChanges = await this.activityLogRepository.find({
      where: {
        tenantId,
        agentId,
        activityType: AgentActivityType.STATUS_CHANGE,
        createdAt: Between(startDate, endDate),
      },
      order: { createdAt: 'ASC' },
    });

    // Group calls by disposition
    const callsByDisposition: Record<string, number> = {};
    sessions.forEach((session) => {
      const disposition = session.disposition || 'UNKNOWN';
      callsByDisposition[disposition] = (callsByDisposition[disposition] || 0) + 1;
    });

    // Calculate availability percentage (simplified)
    const availability = 100; // TODO: Implement proper availability calculation

    return {
      callsHandled,
      avgCallDuration: Math.round(avgCallDuration),
      avgWrapUpTime: 0, // TODO: Calculate from wrap-up logs
      availability,
      callsByDisposition,
    };
  }

  async getQueueMetrics(
    tenantId: string,
    queueId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalCalls: number;
    answeredCalls: number;
    abandonedCalls: number;
    avgWaitTime: number;
    avgCallDuration: number;
    serviceLevel: number;
  }> {
    // TODO: Implement queue-specific metrics
    // This would require associating call sessions with queues

    return {
      totalCalls: 0,
      answeredCalls: 0,
      abandonedCalls: 0,
      avgWaitTime: 0,
      avgCallDuration: 0,
      serviceLevel: 0,
    };
  }

  async getTeamMetrics(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalCalls: number;
    answeredCalls: number;
    avgCallDuration: number;
    activeAgents: number;
    agentPerformance: Array<{
      agentId: string;
      agentName: string;
      callsHandled: number;
      avgCallDuration: number;
    }>;
  }> {
    const sessions = await this.callSessionRepository.find({
      where: {
        tenantId,
        createdAt: Between(startDate, endDate),
        status: CallSessionStatus.ENDED,
      },
      relations: ['agent'],
    });

    const totalCalls = sessions.length;
    const answeredCalls = sessions.filter(
      (s) => s.status === CallSessionStatus.ENDED && s.duration,
    ).length;

    const totalDuration = sessions.reduce(
      (sum, s) => sum + (s.duration || 0),
      0,
    );
    const avgCallDuration =
      answeredCalls > 0 ? totalDuration / answeredCalls : 0;

    // Get active agents
    const activeAgents = await this.agentExtensionRepository.count({
      where: {
        tenantId,
        status: In([AgentStatus.AVAILABLE, AgentStatus.ON_CALL]),
        isActive: true,
      },
    });

    // Group by agent
    const agentMap = new Map<string, { calls: CallSession[] }>();
    sessions.forEach((session) => {
      if (session.agentId) {
        if (!agentMap.has(session.agentId)) {
          agentMap.set(session.agentId, { calls: [] });
        }
        agentMap.get(session.agentId)!.calls.push(session);
      }
    });

    const agentPerformance = Array.from(agentMap.entries()).map(
      ([agentId, data]) => {
        const agentCalls = data.calls;
        const agentDuration = agentCalls.reduce(
          (sum, c) => sum + (c.duration || 0),
          0,
        );
        const agentAvgDuration =
          agentCalls.length > 0 ? agentDuration / agentCalls.length : 0;

        return {
          agentId,
          agentName:
            agentCalls[0]?.agent?.firstName && agentCalls[0]?.agent?.lastName
              ? `${agentCalls[0].agent.firstName} ${agentCalls[0].agent.lastName}`
              : agentCalls[0]?.agent?.email || 'Unknown',
          callsHandled: agentCalls.length,
          avgCallDuration: Math.round(agentAvgDuration),
        };
      },
    );

    return {
      totalCalls,
      answeredCalls,
      avgCallDuration: Math.round(avgCallDuration),
      activeAgents,
      agentPerformance,
    };
  }

  async getRealTimeStats(tenantId: string): Promise<{
    activeCalls: number;
    waitingCalls: number;
    availableAgents: number;
    busyAgents: number;
  }> {
    try {
      const activeCalls = await this.callSessionRepository.count({
        where: {
          tenantId,
          status: In([
            CallSessionStatus.CONNECTED,
            CallSessionStatus.ON_HOLD,
          ]),
        },
      });

      const waitingCalls = await this.callSessionRepository.count({
        where: {
          tenantId,
          status: CallSessionStatus.RINGING,
        },
      });

      const availableAgents = await this.agentExtensionRepository.count({
        where: {
          tenantId,
          status: AgentStatus.AVAILABLE,
          isActive: true,
        },
      });

      const busyAgents = await this.agentExtensionRepository.count({
        where: {
          tenantId,
          status: In([AgentStatus.ON_CALL, AgentStatus.BUSY]),
          isActive: true,
        },
      });

      return {
        activeCalls,
        waitingCalls,
        availableAgents,
        busyAgents,
      };
    } catch (error: any) {
      // If tables don't exist yet, return zeros
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        this.logger.warn('PBX tables do not exist yet. Please run migrations.');
        return {
          activeCalls: 0,
          waitingCalls: 0,
          availableAgents: 0,
          busyAgents: 0,
        };
      }
      throw error;
    }
  }
}

