import { PartialType, OmitType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatePetDto } from './create-pet.dto';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdatePetDto extends PartialType(OmitType(CreatePetDto, ['tutorId'] as const)) {
  @ApiPropertyOptional() @IsOptional() @IsString()
  pipelineClinicoEtapa?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  pipelineFisioEtapa?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  proximoFollowupAt?: string;
}
