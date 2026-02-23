import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateColumnDto {
  @ApiProperty({ example: 'Nova Coluna' })
  @IsString()
  @MinLength(1)
  name: string;

  /**
   * Índice 0-based vindo do frontend (ex.: 0 = primeira coluna).
   * No banco, usamos position 1-based para manter compatibilidade com dados existentes.
   */
  @ApiPropertyOptional({ example: 3, description: 'Índice 0-based da posição desejada' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ example: '#6B7280' })
  @IsOptional()
  @IsString()
  color?: string;
}
