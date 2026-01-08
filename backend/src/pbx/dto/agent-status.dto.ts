import { IsEnum, IsOptional } from 'class-validator';
import { AgentStatus } from '../../entities/agent-status.enum';

export class UpdateAgentStatusDto {
  @IsEnum(AgentStatus)
  status: AgentStatus;
}

