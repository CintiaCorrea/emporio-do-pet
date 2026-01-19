import { IsOptional, IsEnum, IsInt, Min, Max, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { LeadSourceDto } from './create-lead.dto';
import { LeadStatusDto } from './update-lead.dto';

export enum SortByDto {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  SCORE = 'currentScore',
  LAST_SEEN = 'lastSeenAt',
  NAME = 'name',
}

export enum SortOrderDto {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListLeadsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Busca por nome ou email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: LeadStatusDto })
  @IsOptional()
  @IsEnum(LeadStatusDto)
  status?: LeadStatusDto;

  @ApiPropertyOptional({ enum: LeadSourceDto })
  @IsOptional()
  @IsEnum(LeadSourceDto)
  source?: LeadSourceDto;

  @ApiPropertyOptional({ description: 'Score mínimo' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minScore?: number;

  @ApiPropertyOptional({ description: 'Score máximo' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(100)
  maxScore?: number;

  @ApiPropertyOptional({ description: 'Filtrar por tag' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ enum: SortByDto, default: SortByDto.CREATED_AT })
  @IsOptional()
  @IsEnum(SortByDto)
  sortBy?: SortByDto = SortByDto.CREATED_AT;

  @ApiPropertyOptional({ enum: SortOrderDto, default: SortOrderDto.DESC })
  @IsOptional()
  @IsEnum(SortOrderDto)
  sortOrder?: SortOrderDto = SortOrderDto.DESC;

  @ApiPropertyOptional({ description: 'Apenas leads com insights pendentes' })
  @IsOptional()
  @Type(() => Boolean)
  hasInsights?: boolean;

  @ApiPropertyOptional({ description: 'Apenas leads quentes (score >= 70)' })
  @IsOptional()
  @Type(() => Boolean)
  hotOnly?: boolean;
}
