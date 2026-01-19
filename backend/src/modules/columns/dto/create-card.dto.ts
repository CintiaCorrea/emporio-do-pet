import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateCardDto {
  @ApiProperty({ example: 'Consulta de retorno' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({ example: 'Observações...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'c5a0a0b4-1e65-4d4f-9db2-8a3f0c2fb8d0' })
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  /**
   * Índice 0-based vindo do frontend.
   */
  @ApiPropertyOptional({ example: 0, description: 'Índice 0-based da posição do card na coluna' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}


