import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class OrcamentoItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() servicoId?: string;
  // Catálogo unificado (PDV/comanda mandam estes) — sem declarar, o forbidNonWhitelisted derruba o orçamento.
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() catalogoItemId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descricao?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() quantidade?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() valorUnitario?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() custoUnitario?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() desconto?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() valorTotal?: number;
  // Exame vendável: identidade guardada num registro-companheiro (orcexa_) pra iniciar o ciclo na conversão.
  @ApiPropertyOptional() @IsOptional() @IsString() tipoItem?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() catalogoExameId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fornecedorId?: string;
}

export class CreateOrcamentoDto {
  @ApiProperty() @IsString() petId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tutorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() validade?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observacao?: string;
  @ApiPropertyOptional({ type: [OrcamentoItemDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => OrcamentoItemDto)
  itens?: OrcamentoItemDto[];
}
