import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';

export const SITUACOES = [
  'TODAS',
  'A_PAGAR',
  'VENCIDAS',
  'PAGAS',
  'CONCILIADAS',
  'A_CLASSIFICAR',
] as const;
export type Situacao = (typeof SITUACOES)[number];

export class ListarLancamentosDto {
  @ApiPropertyOptional({ description: 'Competência mês (YYYY-MM)' })
  @IsOptional()
  @IsString()
  competencia?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unidadeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  marcaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linhaServicoId?: string;

  @ApiPropertyOptional({ enum: SITUACOES })
  @IsOptional()
  @IsIn(SITUACOES)
  situacao?: Situacao;

  @ApiPropertyOptional({ description: 'Busca em descrição / nº documento' })
  @IsOptional()
  @IsString()
  busca?: string;
}
