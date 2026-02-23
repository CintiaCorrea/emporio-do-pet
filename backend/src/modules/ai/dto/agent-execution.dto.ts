import { IsString, IsNumber, IsArray, IsOptional, IsIn, ValidateNested, Min, Max, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { MessageDto } from './chat-completion.dto';

export class AgentContextDto {
  @IsOptional()
  @IsString()
  clinicName?: string;

  @IsOptional()
  @IsString()
  tutorName?: string;

  @IsOptional()
  @IsString()
  petName?: string;

  @IsOptional()
  @IsString()
  petSpecies?: string;

  @IsOptional()
  @IsObject()
  customData?: Record<string, any>;
}

export class AgentExecutionDto {
  @IsString()
  @IsIn(['openai', 'gemini', 'deepseek'])
  provider: 'openai' | 'gemini' | 'deepseek';

  @IsString()
  model: string;

  @IsString()
  systemPrompt: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  conversationHistory?: MessageDto[];

  @IsString()
  userMessage: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AgentContextDto)
  context?: AgentContextDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(128000)
  maxTokens?: number;
}
