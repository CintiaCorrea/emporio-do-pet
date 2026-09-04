import { PESO_MAX_KG, PESO_MIN_KG } from '../../../common/peso';
import {
  IsString,
  Max,
  Min,
  IsUUID,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsArray,
  IsBoolean,
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

  @ApiPropertyOptional({ description: 'Pet em cuidados paliativos (fim de vida)' })
  @IsOptional()
  @IsBoolean()
  cuidadoPaliativo?: boolean;

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

  // Trava do peso (04/09/2026). O Snoopy (#7974), poodle, estava com 8100 kg — 8,1 sem a
  // virgula. O peso e digitado em CINCO telas e nada validava. Como a diaria, a medicacao e
  // a caucao passaram a ser cobradas por FAIXA DE PESO, peso errado virou cobranca errada.
  // A trava no DTO cobre as cinco telas de uma vez. Limites e mensagem em common/peso.
  @ApiPropertyOptional({ example: 12.5, minimum: PESO_MIN_KG, maximum: PESO_MAX_KG })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'O peso nao pode ser negativo.' })
  @Max(PESO_MAX_KG, {
    message: `Peso acima de ${PESO_MAX_KG} kg nao e possivel para um cao ou gato. Confira se a virgula foi digitada.`,
  })
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  insurancePlan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  temperament?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secondaryTutorId?: string;

  @ApiPropertyOptional({
    description: 'Etiquetas do pet',
    type: [String],
    example: ['Manso', 'Alergia a frango'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
