import { IsString, IsOptional, IsInt, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const TIPOS = ['VACINA', 'VERMIFUGO', 'ECTOPARASITA'];

export class CreateTemplateDto {
  @ApiProperty() @IsString() nome: string;
  @ApiProperty() @IsIn(TIPOS) tipo: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variante?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() doses?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() intervaloDias?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() reforcoMeses?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() indicacaoIdade?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() idadeMinDias?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ativo?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() ordem?: number;
}

export class UpdateTemplateDto {
  @ApiPropertyOptional() @IsOptional() @IsString() nome?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(TIPOS) tipo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variante?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() doses?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() intervaloDias?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() reforcoMeses?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() indicacaoIdade?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() idadeMinDias?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ativo?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() ordem?: number;
}
