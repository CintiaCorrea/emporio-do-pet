import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsIn,
  Min,
  ValidateNested,
} from 'class-validator';
import { TipoLancamento } from '@prisma/client';

/** Uma linha do extrato do banco (já parseada pelo front). */
export class LinhaExtratoDto {
  @ApiProperty()
  @IsDateString()
  data: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiProperty({ description: 'Valor em centavos (magnitude positiva)' })
  @IsInt()
  @Min(0)
  valorCentavos: number;

  @ApiProperty({ enum: TipoLancamento, description: 'RECEITA = crédito, DESPESA = débito' })
  @IsEnum(TipoLancamento)
  tipo: TipoLancamento;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documento?: string;

  @ApiPropertyOptional({ description: 'NSU/autorização do cartão — casa exato com o lançamento (conciliação por NSU)' })
  @IsOptional()
  @IsString()
  nsu?: string;

  @ApiPropertyOptional({ description: 'ID estável na fonte (se ausente, geramos um hash)' })
  @IsOptional()
  @IsString()
  externalId?: string;
}

export class PreviewConciliacaoDto {
  @ApiPropertyOptional({ description: 'Conta (banco) a que o extrato pertence' })
  @IsOptional()
  @IsString()
  contaId?: string;

  @ApiPropertyOptional({ default: 15, description: 'Janela de dias entre pagamento e vencimento' })
  @IsOptional()
  @IsInt()
  toleranciaDias?: number;

  @ApiProperty({ type: [LinhaExtratoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinhaExtratoDto)
  linhas: LinhaExtratoDto[];
}

export class AcaoConciliacaoDto {
  @ApiProperty({ enum: ['CONCILIAR', 'CRIAR'] })
  @IsIn(['CONCILIAR', 'CRIAR'])
  tipo: 'CONCILIAR' | 'CRIAR';

  // CONCILIAR
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lancamentoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dataPagamento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  jurosCentavos?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  multaCentavos?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  descontoCentavos?: number;

  @ApiPropertyOptional({
    description:
      'Receita recebida líquida (link/cartão): a diferença vira um lançamento de Taxa Operadora de Cartão (dedução)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  taxaCartaoCentavos?: number;

  // CRIAR
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contaId?: string;

  @ApiPropertyOptional({ type: LinhaExtratoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LinhaExtratoDto)
  linha?: LinhaExtratoDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;
}

export class ConfirmarConciliacaoDto {
  @ApiProperty({ type: [AcaoConciliacaoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AcaoConciliacaoDto)
  acoes: AcaoConciliacaoDto[];
}
