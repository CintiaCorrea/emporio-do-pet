import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CadenciaGatilho, TipoPasso, UnidadeTempo } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateCadenciaDto {
  @ApiProperty() @IsString() nome!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descricao?: string;
  @ApiProperty({ enum: CadenciaGatilho }) @IsEnum(CadenciaGatilho) gatilho!: CadenciaGatilho;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ativo?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() ordem?: number;
}
export class UpdateCadenciaDto extends PartialType(CreateCadenciaDto) {}

export class CreatePassoDto {
  @ApiProperty() @IsString() cadenciaId!: string;
  @ApiProperty() @IsInt() ordem!: number;
  @ApiPropertyOptional({ enum: TipoPasso }) @IsOptional() @IsEnum(TipoPasso) tipo?: TipoPasso;
  @ApiPropertyOptional() @IsOptional() @IsString() titulo?: string;
  @ApiProperty() @IsString() conteudo!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() atrasoValor?: number;
  @ApiPropertyOptional({ enum: UnidadeTempo }) @IsOptional() @IsEnum(UnidadeTempo) atrasoUnidade?: UnidadeTempo;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ativo?: boolean;
}
export class UpdatePassoDto extends PartialType(CreatePassoDto) {}

export class InscreverDto {
  @ApiPropertyOptional() @IsOptional() @IsString() tutorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() petId?: string;
  @ApiProperty() @IsString() phone!: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() vars?: Record<string, any>;
}
