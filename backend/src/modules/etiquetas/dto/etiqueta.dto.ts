import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { TipoEtiqueta } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateEtiquetaDto {
  @ApiProperty()
  @IsString()
  texto!: string;

  @ApiPropertyOptional({ enum: TipoEtiqueta })
  @IsOptional() @IsEnum(TipoEtiqueta)
  tipo?: TipoEtiqueta;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  cor?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  descricao?: string;

  @ApiPropertyOptional({ type: [String], description: 'Onde aplica: Lead, Cliente, Pet' })
  @IsOptional() @IsArray()
  aplicaEm?: string[];

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  ativo?: boolean;
}

export class UpdateEtiquetaDto extends PartialType(CreateEtiquetaDto) {}
