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

  // ---- Campos clínicos da ficha de atendimento ----
  @ApiPropertyOptional({
    enum: ['CONSULTA','RETORNO','AVALIACAO','EMERGENCIA','PROCEDIMENTO','VACINACAO','CIRURGIA','SESSAO_FISIO','OUTRO'],
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Motivo da consulta / queixa principal' })
  @IsOptional() @IsString()
  chiefComplaint?: string;

  @ApiPropertyOptional({ description: 'Anamnese' })
  @IsOptional() @IsString()
  anamnesis?: string;

  @ApiPropertyOptional({ description: 'Exame físico' })
  @IsOptional() @IsString()
  physicalExam?: string;

  @ApiPropertyOptional({ description: 'Diagnóstico' })
  @IsOptional() @IsString()
  diagnosis?: string;

  @ApiPropertyOptional({ description: 'Conduta / tratamento adotado' })
  @IsOptional() @IsString()
  conduct?: string;

  @ApiPropertyOptional({ description: 'Prescrição médica' })
  @IsOptional() @IsString()
  prescription?: string;

  @ApiPropertyOptional({ description: 'Exames solicitados' })
  @IsOptional() @IsString()
  examsRequested?: string;

  @ApiPropertyOptional({ description: 'Acompanhamento para próximo contato (recepção)' })
  @IsOptional() @IsString()
  followUpNotes?: string;

  @ApiPropertyOptional({ description: 'Data sugerida do próximo retorno (ISO date)' })
  @IsOptional() @IsDateString()
  nextReturnDate?: string;

  @ApiPropertyOptional({ description: 'Peso do pet no atendimento (kg)' })
  @IsOptional() @IsNumber()
  petWeight?: number;

  @ApiPropertyOptional({ description: 'Temperatura (ºC)' })
  @IsOptional() @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({ description: 'Forma de pagamento' })
  @IsOptional() @IsString()
  paymentMethod?: string;

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

  @ApiPropertyOptional({
    description: 'Criar pet junto do appointment (quando petId não for enviado)',
  })
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
