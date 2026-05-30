import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PeriodicidadeMeta, StatusMeta, TipoMeta } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMetaDto {
  @ApiProperty({ enum: TipoMeta }) @IsEnum(TipoMeta) tipo!: TipoMeta;
  @ApiPropertyOptional({ enum: PeriodicidadeMeta }) @IsOptional() @IsEnum(PeriodicidadeMeta) periodicidade?: PeriodicidadeMeta;
  @ApiPropertyOptional() @IsOptional() @IsString() profissionalId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() servicoId?: string;
  @ApiProperty() @IsDateString() dataInicio!: string;
  @ApiProperty() @IsNumber() valorMeta!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() valorRealizado?: number;
  @ApiPropertyOptional({ enum: StatusMeta }) @IsOptional() @IsEnum(StatusMeta) status?: StatusMeta;
  @ApiPropertyOptional() @IsOptional() @IsString() observacoes?: string;
}
export class UpdateMetaDto extends PartialType(CreateMetaDto) {}
