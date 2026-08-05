import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsDateString, Min, Max } from 'class-validator';

/**
 * Faturamento bruto da parceria (Finpet).
 * Regra confirmada (Cintia 23/07): split sobre a BASE = bruto − taxa.
 * Pode-se informar a taxa OU a base (coluna "Base" do relatório) — uma deriva a outra.
 */
export class CreateFaturamentoDto {
  @ApiProperty({ description: 'Unidade (parceria)' })
  @IsString()
  unidadeId: string;

  @ApiProperty()
  @IsDateString()
  data: string;

  @ApiPropertyOptional({ description: 'Competência (default: mês da data)' })
  @IsOptional()
  @IsDateString()
  competencia?: string;

  @ApiProperty({ description: 'Bruto na maquineta (centavos)' })
  @IsInt()
  @Min(1)
  brutoCentavos: number;

  @ApiPropertyOptional({ description: 'Taxa de cartão (centavos). Alternativa: informe baseCentavos' })
  @IsOptional()
  @IsInt()
  @Min(0)
  taxaCartaoCentavos?: number;

  @ApiPropertyOptional({ description: 'Base do split (bruto − taxa), como na coluna "Base" do relatório' })
  @IsOptional()
  @IsInt()
  @Min(0)
  baseCentavos?: number;

  @ApiPropertyOptional({ description: 'Nosso valor (centavos). Se ausente: percentualNos da unidade × base' })
  @IsOptional()
  @IsInt()
  @Min(0)
  nosCentavos?: number;

  @ApiPropertyOptional({ description: 'Valor da parceira (centavos). Se ausente: base − nosso' })
  @IsOptional()
  @IsInt()
  @Min(0)
  parceiraCentavos?: number;

  @ApiPropertyOptional({ description: 'Lançamento de caixa do líquido recebido (conciliar)' })
  @IsOptional()
  @IsString()
  lancamentoLiquidoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;
}

export class UpdateFaturamentoDto extends PartialType(CreateFaturamentoDto) {}

export class CreateEmprestimoDto {
  @ApiProperty({ example: 'Reforma + equipamentos MAP HVG' })
  @IsString()
  descricao: string;

  @ApiProperty({ description: 'Unidade que recebeu o dinheiro' })
  @IsString()
  unidadeTomadoraId: string;

  @ApiProperty({ description: 'Valor total (centavos)' })
  @IsInt()
  @Min(1)
  valorCentavos: number;

  @ApiProperty()
  @IsDateString()
  data: string;

  @ApiProperty({ description: 'Nº de parcelas de devolução' })
  @IsInt()
  @Min(1)
  @Max(120)
  numParcelas: number;

  @ApiProperty({ description: 'Vencimento da 1ª parcela' })
  @IsDateString()
  primeiraParcela: string;

  @ApiPropertyOptional({ description: 'Valor de cada parcela (default: total ÷ nº, última ajusta)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  valorParcelaCentavos?: number;

  @ApiPropertyOptional({ description: 'Conta da sede que emprestou' })
  @IsOptional()
  @IsString()
  contaOrigemId?: string;

  @ApiPropertyOptional({ description: 'Conta da unidade que recebeu' })
  @IsOptional()
  @IsString()
  contaDestinoId?: string;
}

export class PagarParcelaDto {
  @ApiProperty({ description: 'Data da devolução' })
  @IsDateString()
  dataPagamento: string;

  @ApiPropertyOptional({ description: 'Conta da unidade de onde sai a devolução' })
  @IsOptional()
  @IsString()
  contaId?: string;

  @ApiPropertyOptional({ description: 'Conta da sede que recebe' })
  @IsOptional()
  @IsString()
  contaDestinoId?: string;
}
