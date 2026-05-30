import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PlataformaCampanha, StatusCampanha, TipoCampanha } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCampanhaDto {
  @ApiProperty() @IsString() nome!: string;
  @ApiPropertyOptional({ enum: PlataformaCampanha }) @IsOptional() @IsEnum(PlataformaCampanha) plataforma?: PlataformaCampanha;
  @ApiPropertyOptional({ enum: TipoCampanha }) @IsOptional() @IsEnum(TipoCampanha) tipo?: TipoCampanha;
  @ApiPropertyOptional() @IsOptional() @IsString() tagOrigem?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() inicio?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() fim?: string;
  @ApiPropertyOptional({ enum: StatusCampanha }) @IsOptional() @IsEnum(StatusCampanha) status?: StatusCampanha;
  @ApiPropertyOptional() @IsOptional() @IsNumber() investimento?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() observacoes?: string;
}
export class UpdateCampanhaDto extends PartialType(CreateCampanhaDto) {}
