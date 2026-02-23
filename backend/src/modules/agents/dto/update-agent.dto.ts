import { PartialType } from '@nestjs/mapped-types';
import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { CreateAgentDto } from './create-agent.dto';

export class UpdateAgentDto extends PartialType(CreateAgentDto) {
  @IsNumber()
  @Min(1)
  @Max(10000)
  @IsOptional()
  rateLimitRequests?: number;

  @IsNumber()
  @Min(60)
  @Max(86400) // Max 24 hours
  @IsOptional()
  rateLimitWindow?: number;
}
