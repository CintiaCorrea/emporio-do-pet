import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum, IsInt, IsDateString } from 'class-validator';
import { TipoConta } from '@prisma/client';

export class CreateContaDto {
  @ApiProperty({ example: 'Conta Corrente PJ' })
  @IsString()
  nome: string;

  @ApiProperty({ enum: TipoConta })
  @IsEnum(TipoConta)
  tipo: TipoConta;

  @ApiPropertyOptional({ description: 'Unidade dona da conta (ajuda a inferir no lançamento)' })
  @IsOptional()
  @IsString()
  unidadeId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  // ---- dados bancários (opcionais) ----
  @ApiPropertyOptional() @IsOptional() @IsString() banco?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() agencia?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() numeroConta?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() titular?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pixChave?: string;

  // ---- saldo de abertura (pode ser negativo) ----
  @ApiPropertyOptional({ description: 'Saldo inicial em centavos; pode ser negativo' })
  @IsOptional() @IsInt() saldoInicialCentavos?: number;

  @ApiPropertyOptional({ description: 'Data do saldo inicial (ISO)' })
  @IsOptional() @IsDateString() saldoInicialData?: string;
}

export class UpdateContaDto extends PartialType(CreateContaDto) {}
