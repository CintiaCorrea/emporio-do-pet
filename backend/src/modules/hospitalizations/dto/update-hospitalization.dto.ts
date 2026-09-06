import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class UpdateHospitalizationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roomNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyRate?: number;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  /**
   * CORRIGIR A HORA DE ENTRADA (06/09/2026).
   *
   * A Cintia: "alguns pacientes entraram e foram colocados no dia e horario errado".
   * Sem isto a unica saida era apagar a internacao e refazer — perdendo evolucao,
   * afericoes, prescricoes e conta.
   *
   * Nao e um campo qualquer: a hora de entrada e o relogio das DIARIAS. Mudar aqui muda
   * quantas ja comecaram e em que dia cada uma cai.
   */
  @ApiPropertyOptional({ example: '2026-09-01T14:19:00-03:00' })
  @IsOptional()
  @IsString()
  admissionAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  estimatedDischargeDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actualDischargeDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  vitalSigns?: Record<string, any>;
}
