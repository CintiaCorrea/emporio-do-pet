import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

enum PersonType {
  INDIVIDUAL = 'INDIVIDUAL',
  LEGAL_ENTITY = 'LEGAL_ENTITY',
}

enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

enum ContactType {
  MOBILE = 'MOBILE',
  PHONE = 'PHONE',
  BUSINESS = 'BUSINESS',
}

export class CreateTutorContactDto {
  @ApiProperty({ enum: ContactType })
  @IsEnum(ContactType)
  type: ContactType;

  @ApiProperty({ example: '11999999999' })
  @IsString()
  number: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isWhatsApp?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateTutorDto {
  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: true, default: true, description: 'Status do tutor' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'maria@email.com' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: PersonType })
  @IsOptional()
  @IsEnum(PersonType)
  type?: PersonType;

  @ApiPropertyOptional({ example: 'Brasileira', default: 'Brasileira' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  nationality?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: '12345678900' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  cpf?: string;

  @ApiPropertyOptional({ example: '1234567' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  rg?: string;

  @ApiPropertyOptional({ example: '1990-01-15' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  profession?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  howFoundUs?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  acceptsEmail?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  acceptsWhatsApp?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  acceptsSMS?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  acceptsSmsCampaign?: boolean;

  @ApiPropertyOptional({ example: '01310100' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  cep?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  addressNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  complement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  referencePoint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  neighborhood?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  state?: string;

  @ApiPropertyOptional({ isArray: true, type: String })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: '2026-01-11T12:00:00.000Z' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsDateString()
  formDate?: string;

  @ApiPropertyOptional({ example: '2026-01-11T12:00:00.000Z' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsDateString()
  inclusionDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  observations?: string;

  @ApiPropertyOptional({
    description: 'Contatos do tutor (mínimo 1)',
    type: [CreateTutorContactDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTutorContactDto)
  @ArrayMinSize(1)
  contacts?: CreateTutorContactDto[];
}
