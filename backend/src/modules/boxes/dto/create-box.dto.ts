import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';

export class CreateBoxDto {
  @ApiProperty({ example: 'B-01', description: 'Código único do box (ex.: B-01, ISO-01)' })
  @IsString()
  codigo: string;

  @ApiPropertyOptional({ description: 'Rótulo livre (ex.: "Box grande porte")' })
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiPropertyOptional({ example: 'CANINO', description: 'CANINO | FELINO | ISOLAMENTO | UTI' })
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  ativa?: boolean;

  @ApiPropertyOptional({ description: 'Posição no mapa' })
  @IsOptional()
  @IsInt()
  ordem?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;
}
