import { OmitType, PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateTutorDto } from './create-tutor.dto';
import { IsOptional, IsString, IsDateString } from 'class-validator';

/**
 * Atualização de tutor não gerencia contatos.
 * Contatos são gerenciados pelo módulo `contacts`.
 */
export class UpdateTutorDto extends PartialType(OmitType(CreateTutorDto, ['contacts'] as const)) {
  @ApiPropertyOptional() @IsOptional() @IsString()
  estadoRelacionamento?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  proximoFollowupAt?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  resumoIa?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  resumoIaUpdatedAt?: string;
}
