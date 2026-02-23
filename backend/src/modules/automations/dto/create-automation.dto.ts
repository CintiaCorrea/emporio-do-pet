import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum AutomationCategory {
  ATENDIMENTO = 'ATENDIMENTO',
  MARKETING = 'MARKETING',
  NOTIFICACAO = 'NOTIFICACAO',
  INTEGRACAO = 'INTEGRACAO',
  AGENDAMENTO = 'AGENDAMENTO',
}

export enum AutomationTrigger {
  SCHEDULE = 'SCHEDULE',
  WEBHOOK = 'WEBHOOK',
  EVENT = 'EVENT',
  MANUAL = 'MANUAL',
}

export enum AgentStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  DRAFT = 'DRAFT',
  ERROR = 'ERROR',
}

export class AutomationStepDto {
  @IsString()
  @IsNotEmpty()
  type: string; // query, filter, message, email, delay, webhook, ai_chat

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  config?: Record<string, unknown>;
}

export class TriggerConfigDto {
  // Para SCHEDULE
  @IsString()
  @IsOptional()
  cron?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  // Para EVENT
  @IsString()
  @IsOptional()
  eventType?: string;

  // Para WEBHOOK
  @IsString()
  @IsOptional()
  webhookSecret?: string;
}

export class CreateAutomationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(AutomationCategory)
  @IsOptional()
  category?: AutomationCategory = AutomationCategory.ATENDIMENTO;

  @IsEnum(AgentStatus)
  @IsOptional()
  status?: AgentStatus = AgentStatus.DRAFT;

  @IsEnum(AutomationTrigger)
  @IsOptional()
  trigger?: AutomationTrigger = AutomationTrigger.MANUAL;

  @ValidateNested()
  @Type(() => TriggerConfigDto)
  @IsOptional()
  triggerConfig?: TriggerConfigDto;

  @IsUUID()
  @IsOptional()
  agentId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutomationStepDto)
  @IsOptional()
  steps?: AutomationStepDto[];
}
