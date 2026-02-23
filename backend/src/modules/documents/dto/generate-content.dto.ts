import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, MinLength } from 'class-validator';

export class GenerateContentDto {
  @ApiProperty({ description: 'Transcrição do áudio a ser formatada' })
  @IsString()
  @MinLength(10, { message: 'Transcrição deve ter pelo menos 10 caracteres' })
  transcription: string;

  @ApiPropertyOptional({
    description: 'Tipo de documento',
    default: 'document',
  })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({
    description: 'Provedor de IA',
    default: 'openai',
    enum: ['openai', 'gemini', 'deepseek'],
  })
  @IsIn(['openai', 'gemini', 'deepseek'])
  @IsOptional()
  provider?: 'openai' | 'gemini' | 'deepseek';
}
