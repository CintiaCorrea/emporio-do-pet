import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { TipoLancamento, FrequenciaRecorrencia } from '@prisma/client';

export class CreateRecorrenciaDto {
  @ApiProperty({ example: 'Aluguel + IPTU' })
  @IsString()
  descricao: string;

  @ApiProperty({ enum: TipoLancamento, description: 'RECEITA ou DESPESA' })
  @IsEnum(TipoLancamento)
  tipo: TipoLancamento;

  @ApiProperty({ description: 'Valor em centavos (contas variáveis: último valor conhecido)' })
  @IsInt()
  @Min(1)
  valorCentavos: number;

  @ApiPropertyOptional({ enum: FrequenciaRecorrencia, default: FrequenciaRecorrencia.MENSAL })
  @IsOptional()
  @IsEnum(FrequenciaRecorrencia)
  frequencia?: FrequenciaRecorrencia;

  @ApiProperty({ description: 'MENSAL/ANUAL: dia do mês (1-31) · SEMANAL: 0=dom..6=sáb' })
  @IsInt()
  @Min(0)
  @Max(31)
  dia: number;

  @ApiPropertyOptional({ description: 'Mês (1-12) — só para ANUAL' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  mesReferencia?: number;

  @ApiPropertyOptional({ default: 30, description: 'A conta nasce N dias antes do vencimento' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  antecedenciaDias?: number;

  @ApiPropertyOptional({ description: 'Data-limite (opcional)' })
  @IsOptional()
  @IsDateString()
  terminaEm?: string;

  @ApiPropertyOptional({ description: 'Termina após N ocorrências (opcional)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxOcorrencias?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoriaId?: string;

  @ApiProperty({ description: 'Conta (banco/caixa) dos lançamentos gerados' })
  @IsString()
  contaId: string;

  @ApiProperty({ description: 'Unidade dos lançamentos gerados' })
  @IsString()
  unidadeId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  marcaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linhaServicoId?: string;
}
