import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class MessageDto {
  @IsString()
  @IsNotEmpty()
  role: 'system' | 'user' | 'assistant';

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class AgentContextDto {
  @IsString()
  @IsOptional()
  clinicName?: string;

  @IsString()
  @IsOptional()
  tutorName?: string;

  @IsString()
  @IsOptional()
  petName?: string;

  @IsString()
  @IsOptional()
  petSpecies?: string;

  @IsString()
  @IsOptional()
  currentDate?: string;

  @IsString()
  @IsOptional()
  customVariable?: string;
}

export class ExecuteAgentDto {
  @IsString()
  @IsNotEmpty()
  userMessage: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  @IsOptional()
  conversationHistory?: MessageDto[];

  @ValidateNested()
  @Type(() => AgentContextDto)
  @IsOptional()
  context?: AgentContextDto;

  @IsBoolean()
  @IsOptional()
  generateVoice?: boolean;

  @IsBoolean()
  @IsOptional()
  stream?: boolean;
}
