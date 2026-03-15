import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum BoardType {
  APPOINTMENT = 'APPOINTMENT',
  CONSULTATION = 'CONSULTATION',
  HOSPITALIZATION = 'HOSPITALIZATION',
  TASK = 'TASK',
  PROJECT = 'PROJECT',
  LEAD = 'LEAD',
  CLIENT = 'CLIENT',
  SALES = 'SALES',
}

export class CreateBoardDto {
  @ApiProperty({ example: 'Atendimentos Diários' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: BoardType })
  @IsOptional()
  @IsEnum(BoardType)
  type?: BoardType;

  @ApiPropertyOptional({ example: 'bg-blue-500' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  favorite?: boolean;
}
