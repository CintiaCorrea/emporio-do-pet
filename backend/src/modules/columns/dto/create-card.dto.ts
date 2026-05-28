import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min, MinLength, IsArray, IsDateString, IsIn } from 'class-validator';

export class CreateCardDto {
  @ApiProperty({ example: 'Consulta de retorno' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({ example: 'Observações...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'c5a0a0b4-1e65-4d4f-9db2-8a3f0c2fb8d0', description: 'Link to appointment' })
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiPropertyOptional({ example: 'c5a0a0b4-1e65-4d4f-9db2-8a3f0c2fb8d0', description: 'Link to lead' })
  @IsOptional()
  @IsUUID()
  leadId?: string;

  @ApiPropertyOptional({ example: 'c5a0a0b4-1e65-4d4f-9db2-8a3f0c2fb8d0', description: 'Link to client' })
  @IsOptional()
  @IsUUID()
  tutorId?: string;

  @ApiPropertyOptional({ example: 0, description: '0-based position index in column' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ example: 'medium', enum: ['low', 'medium', 'high', 'urgent'] })
  @IsOptional()
  @IsString()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @ApiPropertyOptional({ example: '2026-03-01T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'user-uuid', description: 'User ID to assign this card to' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ example: ['vip', 'urgent'], description: 'Tags for the card' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata as JSON' })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
