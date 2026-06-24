import { IsOptional, IsNumber, IsString } from 'class-validator';

export class FecharCaixaDto {
  @IsOptional() @IsNumber() valorEsperado?: number;
  @IsOptional() @IsNumber() valorContado?: number;
  @IsOptional() @IsString() observacao?: string;
}
