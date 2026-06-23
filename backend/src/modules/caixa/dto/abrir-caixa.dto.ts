import { IsOptional, IsString, IsNumber } from 'class-validator';

export class AbrirCaixaDto {
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsNumber() suprimento?: number;
  @IsOptional() @IsString() observacao?: string;
}
