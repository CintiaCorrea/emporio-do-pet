import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

/** Uma taxa contratada (linha da tabela). aliquotaBps: 2.79% = 279. */
export class TaxaContratadaDto {
  @ApiPropertyOptional({ description: 'InfinityPay, Nubank... (default InfinityPay)' })
  @IsOptional()
  @IsString()
  adquirente?: string;

  @ApiProperty()
  @IsString()
  bandeira: string;

  @ApiProperty()
  @IsString()
  plano: string;

  @ApiProperty()
  @IsString()
  forma: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  parcelas: number;

  @ApiProperty({ description: '2.79% = 279' })
  @IsInt()
  @Min(0)
  aliquotaBps: number;

  @ApiProperty()
  @IsDateString()
  vigenciaInicio: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;
}

export class ImportarTaxasDto {
  @ApiProperty({ type: [TaxaContratadaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaxaContratadaDto)
  taxas: TaxaContratadaDto[];

  @ApiPropertyOptional({ description: 'Substituir as taxas da mesma vigência antes de inserir' })
  @IsOptional()
  substituirVigencia?: boolean;
}

/** Uma venda de cartão (do OFX da maquineta ou do relatório Histórico). */
export class VendaCartaoDto {
  @ApiProperty()
  @IsDateString()
  data: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  brutoCentavos: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  liquidoCentavos: number;

  @ApiPropertyOptional({ description: 'Se ausente: bruto − líquido' })
  @IsOptional()
  @IsInt()
  taxaCentavos?: number;

  @ApiPropertyOptional({ description: '% aplicado (407 = 4,07%). Se ausente: derivado de taxa/bruto' })
  @IsOptional()
  @IsInt()
  taxaBps?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  planoExtrato?: string;

  @ApiPropertyOptional({ description: 'InfinityPay, Nubank...' })
  @IsOptional()
  @IsString()
  adquirente?: string;

  // já vindos do relatório Histórico (quando disponível) → auditoria automática
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bandeira?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  forma?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  parcelas?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;
}

export class ImportarVendasDto {
  @ApiProperty({ type: [VendaCartaoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VendaCartaoDto)
  vendas: VendaCartaoDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unidadeId?: string;

  @ApiPropertyOptional({ description: 'Aplica esta adquirente a todas as vendas do lote' })
  @IsOptional()
  @IsString()
  adquirente?: string;
}

export class UpdateTaxaDto extends PartialType(TaxaContratadaDto) {}

export class ClonarVigenciaDto {
  @ApiProperty({ description: 'Vigência de origem (ISO) a copiar' })
  @IsDateString()
  de: string;

  @ApiProperty({ description: 'Nova vigência (ISO)' })
  @IsDateString()
  para: string;

  @ApiPropertyOptional({ description: 'Copiar só as taxas desta adquirente' })
  @IsOptional()
  @IsString()
  adquirente?: string;
}

/** Atribuição manual (venda "a conferir"). */
export class AtribuirVendaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adquirente?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bandeira?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  forma?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  parcelas?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  plano?: string;
}
