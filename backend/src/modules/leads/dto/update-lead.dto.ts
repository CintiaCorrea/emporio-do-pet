import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateLeadDto } from './create-lead.dto';

export enum LeadStatusDto {
  NEW = 'NEW',
  ENRICHING = 'ENRICHING',
  ENRICHED = 'ENRICHED',
  QUALIFIED = 'QUALIFIED',
  CONTACTED = 'CONTACTED',
  CONVERTED = 'CONVERTED',
  LOST = 'LOST',
}

export class UpdateLeadDto extends PartialType(CreateLeadDto) {
  @ApiPropertyOptional({ enum: LeadStatusDto })
  @IsOptional()
  @IsEnum(LeadStatusDto)
  status?: LeadStatusDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
