import { IsOptional, IsString, IsNumber } from 'class-validator';

export class MovimentoDto {
  @IsString() tipo!: string; // SUPRIMENTO | SANGRIA | DESPESA | TRANSFERENCIA
  @IsNumber() valor!: number;
  @IsOptional() @IsString() forma?: string;
  @IsOptional() @IsString() conta?: string;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsString() observacao?: string;
  @IsOptional() @IsString() categoriaId?: string; // DESPESA → categoria do DRE (escolhida na hora)
  @IsOptional() @IsString() contaOrigemId?: string; // SUPRIMENTO/TRANSFERENCIA → conta de origem (real)
  @IsOptional() @IsString() contaDestinoId?: string; // SANGRIA/TRANSFERENCIA → conta de destino (real)
}
