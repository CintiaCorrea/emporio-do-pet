import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

enum ContactType {
  MOBILE = 'MOBILE',
  PHONE = 'PHONE',
  BUSINESS = 'BUSINESS',
}

export class CreateContactDto {
  @ApiProperty({ enum: ContactType })
  @IsEnum(ContactType)
  type: ContactType;

  @ApiProperty()
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

  @ApiProperty()
  @IsUUID()
  tutorId: string;
}


