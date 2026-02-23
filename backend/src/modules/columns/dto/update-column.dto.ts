import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateColumnDto {
  @ApiPropertyOptional({ example: 'Coluna Renomeada' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  /**
   * Índice 0-based vindo do frontend.
   */
  @ApiPropertyOptional({ example: 1, description: 'Índice 0-based da nova posição' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ example: '#FF6B6B' })
  @IsOptional()
  @IsString()
  color?: string;
}
