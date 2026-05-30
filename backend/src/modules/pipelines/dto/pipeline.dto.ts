import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PipelineEscopo } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class CreatePipelineDto {
  @ApiProperty() @IsString() nome!: string;
  @ApiPropertyOptional({ enum: PipelineEscopo }) @IsOptional() @IsEnum(PipelineEscopo) escopo?: PipelineEscopo;
  @ApiPropertyOptional() @IsOptional() @IsString() descricao?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cor?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ativo?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() ordem?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPadrao?: boolean;
}
export class UpdatePipelineDto extends PartialType(CreatePipelineDto) {}

export class CreateEstagioDto {
  @ApiProperty() @IsString() pipelineId!: string;
  @ApiProperty() @IsString() nome!: string;
  @ApiProperty() @IsInt() ordem!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() descricao?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cor?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ehInicial?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ehGanho?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ehPerda?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ativo?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() diasMaxParar?: number;
}
export class UpdateEstagioDto extends PartialType(CreateEstagioDto) {}
