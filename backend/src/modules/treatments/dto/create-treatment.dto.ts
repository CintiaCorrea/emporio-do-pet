import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateTreatmentDto {
  @ApiProperty()
  @IsUUID()
  appointmentId: string;

  @ApiProperty()
  @IsUUID()
  petId: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  cost: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string | null;
}


