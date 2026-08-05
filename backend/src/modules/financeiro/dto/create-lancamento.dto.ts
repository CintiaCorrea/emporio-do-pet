import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  IsDateString,
  Min,
} from 'class-validator';
import { TipoLancamento, StatusLancamento, OrigemDado } from '@prisma/client';

export class CreateLancamentoDto {
  @ApiProperty({ enum: TipoLancamento })
  @IsEnum(TipoLancamento)
  tipo: TipoLancamento;

  @ApiProperty({ description: 'Valor em centavos (magnitude positiva; direção vem de `tipo`)' })
  @IsInt()
  @Min(0)
  valorCentavos: number;

  @ApiPropertyOptional({ description: 'Data de caixa (default: hoje)' })
  @IsOptional()
  @IsDateString()
  data?: string;

  @ApiPropertyOptional({ description: 'Competência (default: mês do vencimento ou da data)' })
  @IsOptional()
  @IsDateString()
  competencia?: string;

  @ApiPropertyOptional({ description: 'Emissão (vem da NF no import)' })
  @IsOptional()
  @IsDateString()
  dataEmissao?: string;

  @ApiPropertyOptional({ description: 'Vencimento (nasce "a pagar")' })
  @IsOptional()
  @IsDateString()
  vencimento?: string;

  @ApiPropertyOptional({ description: 'Pagamento efetivo (preenchido na baixa)' })
  @IsOptional()
  @IsDateString()
  dataPagamento?: string;

  @ApiPropertyOptional({ description: 'É onde as regras procuram o termo' })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({ description: 'Nº da nota/boleto (as regras nunca mexem aqui)' })
  @IsOptional()
  @IsString()
  numeroDocumento?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  jurosCentavos?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  multaCentavos?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  descontoCentavos?: number;

  @ApiPropertyOptional({ description: 'Se ausente, tenta a regra e depois a conta' })
  @IsOptional()
  @IsString()
  unidadeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoriaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linhaServicoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  marcaId?: string;

  @ApiPropertyOptional({ description: 'Conta (banco/caixa) — obrigatória (aqui ou via regra)' })
  @IsOptional()
  @IsString()
  contaId?: string;

  @ApiPropertyOptional({ description: 'Transferência: conta de destino' })
  @IsOptional()
  @IsString()
  contaDestinoId?: string;

  @ApiPropertyOptional({ description: 'Fornecedor/cliente (fin_contatos)' })
  @IsOptional()
  @IsString()
  contatoId?: string;

  @ApiPropertyOptional({ description: 'Forma de pagamento (fin_formas_pagamento)' })
  @IsOptional()
  @IsString()
  formaPagamentoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tutorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @ApiPropertyOptional({ enum: StatusLancamento })
  @IsOptional()
  @IsEnum(StatusLancamento)
  status?: StatusLancamento;

  @ApiPropertyOptional({ enum: OrigemDado })
  @IsOptional()
  @IsEnum(OrigemDado)
  origem?: OrigemDado;

  @ApiPropertyOptional({ description: 'ID na fonte (dedup de import)' })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional({ default: true, description: 'Aplicar regras de classificação automática' })
  @IsOptional()
  @IsBoolean()
  aplicarRegras?: boolean;

  @ApiPropertyOptional({
    description:
      'Parcelado: nº de parcelas (>1). valorCentavos = valor de CADA parcela; vencimentos mensais a partir do vencimento informado; descrição ganha (1/N), (2/N)…',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  parcelas?: number;
}
