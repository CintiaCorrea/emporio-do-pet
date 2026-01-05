import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePetDto } from './create-pet.dto';

export class UpdatePetDto extends PartialType(
  OmitType(CreatePetDto, ['tutorId'] as const),
) {}

