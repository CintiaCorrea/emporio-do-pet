import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class AssignAgentDto {
  @IsOptional()
  @IsString()
  agentId?: string | null;

  @IsOptional()
  @IsBoolean()
  enableAutoReply?: boolean = true;
}
