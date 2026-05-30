import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsEmail, IsBoolean, IsNumber, IsDateString } from 'class-validator';
import { ProfissionalTipo, Role } from '@prisma/client';

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

  // ========================================
  // Campos pra integração com User (acesso ao sistema)
  // ========================================

  @ApiPropertyOptional({ description: 'Se marcado, cria/atualiza User vinculado pra acesso ao sistema' })
  @IsOptional() @IsBoolean()
  criarAcesso?: boolean;

  @ApiPropertyOptional({ enum: ['ADMIN', 'VETERINARIAN', 'RECEPTIONIST'] })
  @IsOptional() @IsEnum(['ADMIN', 'VETERINARIAN', 'RECEPTIONIST'] as any)
  role?: Role;

  @ApiPropertyOptional({ description: 'Senha do User (obrigatória ao criar novo acesso)' })
  @IsOptional() @IsString()
  password?: string;
}
