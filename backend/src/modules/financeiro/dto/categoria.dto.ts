import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum, IsInt } from 'class-validator';
import { TipoCategoria, NaturezaCategoria, ComportamentoCusto } from '@prisma/client';

export class CreateGrupoDto {
  @ApiProperty({ example: '4. Despesas Operacionais' })
  @IsString()
  nome: string;

  @ApiProperty({ enum: TipoCategoria })
  @IsEnum(TipoCategoria)
  tipo: TipoCategoria;

  @ApiPropertyOptional({ description: 'Ordem na DRE (1..n)' })
  @IsOptional()
  @IsInt()
  ordem?: number;
}
export class UpdateGrupoDto extends PartialType(CreateGrupoDto) {}

export class CreateCategoriaDto {
  @ApiProperty({ example: 'Energia Elétrica' })
  @IsString()
  nome: string;

  @ApiProperty({ description: 'Grupo do plano de contas' })
  @IsString()
  grupoId: string;

  @ApiProperty({ enum: TipoCategoria })
  @IsEnum(TipoCategoria)
  tipo: TipoCategoria;

  @ApiPropertyOptional({ enum: NaturezaCategoria, default: NaturezaCategoria.OPERACIONAL })
  @IsOptional()
  @IsEnum(NaturezaCategoria)
  natureza?: NaturezaCategoria;

  @ApiPropertyOptional({ enum: ComportamentoCusto, default: ComportamentoCusto.NAO_APLICAVEL })
  @IsOptional()
  @IsEnum(ComportamentoCusto)
  comportamento?: ComportamentoCusto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subgrupo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  ordem?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  codigoContabil?: string;
}
export class UpdateCategoriaDto extends PartialType(CreateCategoriaDto) {}
