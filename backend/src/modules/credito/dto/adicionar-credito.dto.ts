import { IsOptional, IsString, IsNumber } from 'class-validator';

export class AdicionarCreditoDto {
  @IsOptional() @IsString() tutorId?: string;
  @IsOptional() @IsString() appointmentId?: string;
  @IsString() tipo!: string; // RECARGA | ESTORNO
  @IsNumber() valor!: number;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsString() caixaSessaoId?: string;
  @IsOptional() @IsString() forma?: string; // Dinheiro | Pix | Cartão crédito | Cartão débito — como a caução foi paga
}
