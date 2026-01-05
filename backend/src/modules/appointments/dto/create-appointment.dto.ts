import {
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

enum PetSpecies {
  CANINE = 'CANINE',
  FELINE = 'FELINE',
  BIRD = 'BIRD',
  RODENT = 'RODENT',
  REPTILE = 'REPTILE',
  OTHER = 'OTHER',
}

enum PaymentStatus {
  PAID = 'PAID',
  PENDING = 'PENDING',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export class CreateAppointmentPetDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: PetSpecies })
  @IsEnum(PetSpecies)
  species: PetSpecies;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  breed?: string;
}

export class CreateAppointmentDto {
  @ApiProperty({ description: 'ID do tutor' })
  @IsUUID()
  tutorId: string;

  @ApiPropertyOptional({ description: 'ID do pet (opcional se enviar `pet` para criar)' })
  @IsOptional()
  @IsUUID()
  petId?: string;

  @ApiProperty({ description: 'ID do veterinário responsável' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: '2024-01-15T10:00:00Z' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 150.0 })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({ description: 'Status do agendamento (string livre)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ description: 'ID do board (kanban)' })
  @IsOptional()
  @IsUUID()
  boardId?: string;

  @ApiPropertyOptional({ description: 'Tratamentos a serem criados junto do appointment' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAppointmentTreatmentDto)
  treatments?: CreateAppointmentTreatmentDto[];

  @ApiPropertyOptional({ description: 'Criar pet junto do appointment (quando petId não for enviado)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAppointmentPetDto)
  pet?: CreateAppointmentPetDto;
}

export class CreateAppointmentTreatmentDto {
  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  cost: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;
}

