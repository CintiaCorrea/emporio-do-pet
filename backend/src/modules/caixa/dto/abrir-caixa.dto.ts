import { IsOptional, IsString, IsNumber } from 'class-validator';

export class AbrirCaixaDto {
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsNumber() suprimento?: number;
  @IsOptional() @IsString() observacao?: string;
  @IsOptional() @IsString() abertura?: string; // caixa retroativo: data (YYYY-MM-DD) do dia a lançar
}
