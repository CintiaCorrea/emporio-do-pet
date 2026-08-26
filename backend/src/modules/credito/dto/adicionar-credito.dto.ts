import { IsOptional, IsString, IsNumber, IsArray } from 'class-validator';

export class AdicionarCreditoDto {
  @IsOptional() @IsString() tutorId?: string;
  @IsOptional() @IsString() appointmentId?: string;
  @IsString() tipo!: string; // RECARGA | ESTORNO
  @IsNumber() valor!: number;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsString() caixaSessaoId?: string;
  @IsOptional() @IsString() forma?: string; // legado — forma simples
  @IsOptional() @IsArray() formas?: any[]; // forma completa (igual venda): forma+valor+modalidade/bandeira/NSU
  @IsOptional() @IsString() formasStr?: string; // formas em texto (blindagem contra o bug de serialização [[]])
}
