import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export enum CommissionStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum CommissionType {
  CONSULTATION = 'CONSULTATION',
  SURGERY = 'SURGERY',
  HOSPITALIZATION = 'HOSPITALIZATION',
  SERVICE = 'SERVICE',
  PRODUCT = 'PRODUCT',
}

export class CreateCommissionDto {
  @ApiProperty()
  @IsUUID()
  appointmentId: string;

  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: CommissionType })
  @IsEnum(CommissionType)
  serviceType: CommissionType;

  @ApiProperty()
  @IsString()
  serviceName: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  totalValue: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  commissionRate: number;

  @ApiPropertyOptional({ enum: CommissionStatus })
  @IsOptional()
  @IsEnum(CommissionStatus)
  status?: CommissionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
