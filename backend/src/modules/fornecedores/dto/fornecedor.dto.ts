import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ComissaoTipo, FornecedorTipo, ModeloPagamento } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateFornecedorDto {
  @ApiProperty() @IsString() nome!: string;
  @ApiProperty({ enum: FornecedorTipo }) @IsEnum(FornecedorTipo) tipo!: FornecedorTipo;
  @ApiPropertyOptional() @IsOptional() @IsString() especialidade?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() telefone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contatoResponsavel?: string;
  @ApiPropertyOptional({ enum: ModeloPagamento }) @IsOptional() @IsEnum(ModeloPagamento) modeloPagamento?: ModeloPagamento;
  @ApiPropertyOptional({ enum: ComissaoTipo }) @IsOptional() @IsEnum(ComissaoTipo) comissaoTipo?: ComissaoTipo;
  @ApiPropertyOptional() @IsOptional() @IsNumber() comissaoValor?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() diaFechamentoLote?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ativo?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() observacoes?: string;
}

export class UpdateFornecedorDto extends PartialType(CreateFornecedorDto) {}
