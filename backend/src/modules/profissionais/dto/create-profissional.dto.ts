import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsEmail, IsBoolean, IsNumber, IsDateString } from 'class-validator';
import { ProfissionalTipo } from '@prisma/client';

export class CreateProfissionalDto {
  @ApiProperty()
  @IsString()
  nomeCompleto!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  nomeExibicao?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  iniciais?: string;

  @ApiProperty({ enum: ProfissionalTipo })
  @IsEnum(ProfissionalTipo)
  tipo!: ProfissionalTipo;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  especialidade?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  crmv?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  telefone?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  fotoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  corAvatar?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  comissaoPercentual?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  dataInicio?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  observacoes?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  ativo?: boolean;
}
