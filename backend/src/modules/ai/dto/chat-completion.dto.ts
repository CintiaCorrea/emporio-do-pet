import { IsString, IsNumber, IsArray, IsOptional, IsIn, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class MessageDto {
  @IsString()
  @IsIn(['system', 'user', 'assistant'])
  role: 'system' | 'user' | 'assistant';

  @IsString()
  content: string;
}

export class ChatCompletionDto {
  @IsString()
  @IsIn(['openai', 'gemini', 'deepseek'])
  provider: 'openai' | 'gemini' | 'deepseek';

  @IsString()
  model: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages: MessageDto[];

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
