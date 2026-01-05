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

  @ApiProperty({ enum: Priority })
  @IsEnum(Priority)
  priority: Priority;

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


