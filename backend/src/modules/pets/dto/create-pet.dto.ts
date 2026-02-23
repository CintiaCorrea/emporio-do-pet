import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum CoatType {
  SHORT = 'SHORT',
  LONG = 'LONG',
  SMOOTH = 'SMOOTH',
  WAVY = 'WAVY',
  CURLY = 'CURLY',
  GOLDEN = 'GOLDEN',
  BLACK = 'BLACK',
  WHITE = 'WHITE',
  BROWN = 'BROWN',
  MIXED = 'MIXED',
}

enum PetSpecies {
  CANINE = 'CANINE',
  FELINE = 'FELINE',
  BIRD = 'BIRD',
  RODENT = 'RODENT',
  REPTILE = 'REPTILE',
  OTHER = 'OTHER',
}

enum PetStatus {
  ACTIVE = 'ACTIVE',
  DECEASED = 'DECEASED',
  TRANSFERRED = 'TRANSFERRED',
  INACTIVE = 'INACTIVE',
}

enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

enum SterilizationStatus {
  NOT_STERILIZED = 'NOT_STERILIZED',
  STERILIZED = 'STERILIZED',
  SCHEDULED = 'SCHEDULED',
}

export class CreatePetDto {
  @ApiProperty({ example: 'Rex' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'ID do tutor' })
  @IsUUID()
  tutorId: string;

  @ApiPropertyOptional({ enum: PetSpecies })
  @IsOptional()
  @IsEnum(PetSpecies)
  species?: PetSpecies;

  @ApiPropertyOptional({ example: 'Labrador' })
  @IsOptional()
  @IsString()
  breed?: string;

  @ApiPropertyOptional({ enum: PetStatus })
  @IsOptional()
  @IsEnum(PetStatus)
  status?: PetStatus;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ enum: SterilizationStatus })
  @IsOptional()
  @IsEnum(SterilizationStatus)
  sterilization?: SterilizationStatus;

  @ApiPropertyOptional({ example: '2020-03-15' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ example: 12.5 })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ enum: CoatType })
  @IsOptional()
  @IsEnum(CoatType)
  coat?: CoatType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coatColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  microchip?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  medicalNotes?: string;

  @ApiPropertyOptional({
    description: 'Lista de documentos do pet (ex.: URLs ou nomes)',
    type: [String],
    example: ['https://.../arquivo.pdf', 'Carteira de vacinação - Jan/2026'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];
}
