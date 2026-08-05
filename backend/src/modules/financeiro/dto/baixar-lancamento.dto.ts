import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsDateString, Min } from 'class-validator';

/** Dar baixa numa conta a pagar/receber: marca o pagamento efetivo + composição. */
export class BaixarLancamentoDto {
  @ApiProperty({ description: 'Data do pagamento efetivo' })
  @IsDateString()
  dataPagamento: string;

  @ApiPropertyOptional({ description: 'Conta de onde saiu/entrou (se mudou)' })
  @IsOptional()
  @IsString()
  contaId?: string;

  @ApiPropertyOptional({ default: 0, description: 'Juros (→ Despesas Financeiras no DRE)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  jurosCentavos?: number;

  @ApiPropertyOptional({ default: 0, description: 'Multa (→ Despesas Financeiras no DRE)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  multaCentavos?: number;

  @ApiPropertyOptional({ default: 0, description: 'Desconto (→ Descontos Financeiros Obtidos)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  descontoCentavos?: number;
}
