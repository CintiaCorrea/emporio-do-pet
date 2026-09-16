import { IsOptional, IsString, IsNumber, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class RecebimentoDto {
  @IsOptional() @IsString() appointmentId?: string;
  @IsNumber() valorTotal!: number;
  @IsOptional() @IsNumber() desconto?: number;
  @IsOptional() @IsNumber() troco?: number;
  /**
   * AS FORMAS PASSAM CRUAS, SEM CONVERSÃO.
   *
   * O ValidationPipe global roda com `enableImplicitConversion`, e para um campo declarado `any[]`
   * ele converte cada item para o tipo refletido — que é Array. `[{ forma: 'Nubank PIX', valor: 70 }]`
   * chegava ao serviço como `[[]]`, e o recebimento era gravado sem forma nenhuma.
   *
   * Medido em produção em 16/09/2026: 34 dos 59 recebimentos de setembro sem forma — todos pelos
   * dois caminhos que usam este DTO (receber no ponto de venda e no Caixa). O lote e a venda nova
   * não usam DTO e gravavam certo. No resumo do caixa, dinheiro sem forma vira "Outros" (Cintia:
   * "o que seria esse outros, não são recebimentos no Nubank?").
   *
   * `@Transform` devolvendo o valor ORIGINAL do corpo é o que impede a conversão.
   */
  @IsOptional() @IsArray()
  @Transform(({ obj }) => obj?.formas)
  formas?: any[];
  @IsOptional() @IsString() observacao?: string;
}
