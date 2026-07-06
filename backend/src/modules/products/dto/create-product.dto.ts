import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum ProductType {
  MEDICINE = 'MEDICINE',
  VACCINE = 'VACCINE',
  SERVICE = 'SERVICE',
  PACOTE = 'PACOTE',
  KIT = 'KIT',
}

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: ProductType })
  @IsEnum(ProductType)
  type: ProductType;

  @ApiProperty({ example: 99.9 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  // ── Catálogo Fase 1 (todos opcionais) ──
  @ApiPropertyOptional() @IsOptional() @IsString() codigoBarras?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() unidadeVenda?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() marca?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() custoPadrao?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() proposito?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() markup?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() exibeListaPreco?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() permiteAlterarPreco?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() controlaEstoque?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() estoqueMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() estoqueMax?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() comissionado?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() comissaoTipo?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() comissaoValor?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() fornecedorId?: string;
}
