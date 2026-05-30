import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CategoriaExame } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateExameDto {
  @ApiProperty() @IsString() fornecedorId!: string;
  @ApiProperty() @IsString() nome!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() codigo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descricao?: string;
  @ApiPropertyOptional({ enum: CategoriaExame }) @IsOptional() @IsEnum(CategoriaExame) categoria?: CategoriaExame;
  @ApiPropertyOptional() @IsOptional() @IsNumber() valorFornecedor?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() valorClienteSugerido?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() tempoResultadoDias?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ativo?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() observacoes?: string;
}

export class UpdateExameDto extends PartialType(CreateExameDto) {}
