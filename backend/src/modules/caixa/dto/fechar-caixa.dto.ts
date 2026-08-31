import { IsOptional, IsNumber, IsString } from 'class-validator';

export class FecharCaixaDto {
  @IsOptional() @IsNumber() valorEsperado?: number;
  @IsOptional() @IsNumber() valorContado?: number;
  @IsOptional() @IsString() observacao?: string;
  // O front manda estes dois ao encerrar (o service os usa). Sem declarar aqui, o ValidationPipe
  // (forbidNonWhitelisted) derrubava o fechamento com 400 — era a raiz do "não fecha o caixa".
  @IsOptional() @IsString() status?: string; // FECHADO | EM_REVISAO
  @IsOptional() @IsString() fechamento?: string; // ISO date
}
