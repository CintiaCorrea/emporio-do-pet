import { IsOptional, IsString, IsNumber } from 'class-validator';

export class MovimentoDto {
  @IsString() tipo!: string; // SUPRIMENTO | SANGRIA | DESPESA | TRANSFERENCIA
  @IsNumber() valor!: number;
  @IsOptional() @IsString() forma?: string;
  @IsOptional() @IsString() conta?: string;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsString() observacao?: string;
}
