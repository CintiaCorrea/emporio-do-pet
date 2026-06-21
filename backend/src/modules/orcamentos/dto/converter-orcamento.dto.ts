import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ConverterOrcamentoDto {
  @ApiPropertyOptional({ description: 'Profissional do atendimento (default: usuário logado)' })
  @IsOptional() @IsString() userId?: string;

  @ApiPropertyOptional({ description: 'Data do atendimento (default: agora)' })
  @IsOptional() @IsDateString() date?: string;
}
