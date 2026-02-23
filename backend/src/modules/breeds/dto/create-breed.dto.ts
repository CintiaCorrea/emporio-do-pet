import { IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum PetSpecies {
  CANINE = 'CANINE',
  FELINE = 'FELINE',
  BIRD = 'BIRD',
  RODENT = 'RODENT',
  REPTILE = 'REPTILE',
  OTHER = 'OTHER',
}

export class CreateBreedDto {
  @ApiProperty({ enum: PetSpecies })
  @IsEnum(PetSpecies)
  species: PetSpecies;

  @ApiProperty({ example: 'Labrador' })
  @IsString()
  name: string;
}

