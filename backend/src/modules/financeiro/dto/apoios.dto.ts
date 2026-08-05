import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum, IsInt, IsNumber, Min, Max } from 'class-validator';
import { TipoUnidade } from '@prisma/client';

export class CreateUnidadeDto {
  @ApiProperty() @IsString() nome: string;
  @ApiProperty({ enum: TipoUnidade }) @IsEnum(TipoUnidade) tipo: TipoUnidade;
  @ApiPropertyOptional() @IsOptional() @IsString() cidade?: string;
  @ApiPropertyOptional({ description: '% que fica conosco na parceria (0..1, ex.: 0.65)' })
  @IsOptional() @IsNumber() @Min(0) @Max(1) percentualNos?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() marcaPadraoId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ativo?: boolean;
}
export class UpdateUnidadeDto extends PartialType(CreateUnidadeDto) {}

export class CreateMarcaDto {
  @ApiProperty() @IsString() nome: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ativo?: boolean;
}
export class UpdateMarcaDto extends PartialType(CreateMarcaDto) {}

export class CreateLinhaDto {
  @ApiProperty() @IsString() nome: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() ordem?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ativo?: boolean;
}
export class UpdateLinhaDto extends PartialType(CreateLinhaDto) {}

export class CreateContatoDto {
  @ApiProperty() @IsString() nome: string;
  @ApiPropertyOptional() @IsOptional() @IsString() documento?: string;
  @ApiPropertyOptional({ description: 'Fornecedor | Cliente | Ambos | Veterinario parceiro' }) @IsOptional() @IsString() tipo?: string;
  @ApiPropertyOptional({ description: 'CRMV (veterinario parceiro)' }) @IsOptional() @IsString() crmv?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() telefone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional({ description: 'Chave PIX p/ pagamento' }) @IsOptional() @IsString() pixChave?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ativo?: boolean;
}
export class UpdateContatoDto extends PartialType(CreateContatoDto) {}

export class CreateFormaDto {
  @ApiProperty() @IsString() nome: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() ordem?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ativo?: boolean;
}
export class UpdateFormaDto extends PartialType(CreateFormaDto) {}
