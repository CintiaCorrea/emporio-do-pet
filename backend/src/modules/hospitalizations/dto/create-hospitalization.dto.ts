import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';

enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class CreateHospitalizationDto {
  @ApiProperty()
  @IsUUID()
  tutorId: string;

  @ApiProperty()
  @IsUUID()
  petId: string;

  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsString()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roomNumber?: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  dailyRate: number;

  // Diária vinda do catálogo (serviço/produto) — leva custo pra comanda do dia.
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  diariaServicoId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  diariaCatalogoItemId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  diariaCusto?: number;

  @ApiProperty({ enum: Priority })
  @IsEnum(Priority)
  priority: Priority;

  /**
   * QUANDO O ANIMAL ENTROU (ISO, com hora). Não é quando alguém digitou a ficha.
   *
   * A diária conta 1 a cada 24 horas começadas a partir daqui. Sem este campo o sistema
   * gravava `new Date()` — a hora da digitação — então um animal que chegou às 8h e foi
   * cadastrado às 14h tinha a diária virando 6 horas atrasada, todo dia da internação.
   */
  @ApiPropertyOptional({ example: '2026-09-05T08:30:00-03:00' })
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
  diagnosis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  vitalSigns?: Record<string, any>;
}
