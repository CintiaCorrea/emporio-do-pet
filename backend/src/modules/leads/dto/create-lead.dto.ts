import { IsEmail, IsEnum, IsOptional, IsString, IsArray, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum LeadSourceDto {
  ORGANIC = 'ORGANIC',
  GOOGLE_ADS = 'GOOGLE_ADS',
  INSTAGRAM = 'INSTAGRAM',
  FACEBOOK = 'FACEBOOK',
  TIKTOK = 'TIKTOK',
  REFERRAL = 'REFERRAL',
  LANDING_PAGE = 'LANDING_PAGE',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  DIRECT = 'DIRECT',
  OTHER = 'OTHER',
}

export enum DeviceTypeDto {
  MOBILE = 'MOBILE',
  DESKTOP = 'DESKTOP',
  TABLET = 'TABLET',
  UNKNOWN = 'UNKNOWN',
}

export class CreateLeadDto {
  @ApiProperty({ example: 'João Silva' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '11999998888' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: LeadSourceDto, default: LeadSourceDto.OTHER })
  @IsOptional()
  @IsEnum(LeadSourceDto)
  source?: LeadSourceDto;

  @ApiPropertyOptional({ example: 'campanha_verao_2024' })
  @IsOptional()
  @IsString()
  sourceDetail?: string;

  @ApiPropertyOptional({ example: 'google' })
  @IsOptional()
  @IsString()
  utmSource?: string;

  @ApiPropertyOptional({ example: 'cpc' })
  @IsOptional()
  @IsString()
  utmMedium?: string;

  @ApiPropertyOptional({ example: 'verao_2024' })
  @IsOptional()
  @IsString()
  utmCampaign?: string;

  @ApiPropertyOptional({ example: 'banner_principal' })
  @IsOptional()
  @IsString()
  utmContent?: string;

  @ApiPropertyOptional({ example: 'https://google.com' })
  @IsOptional()
  @IsString()
  referrer?: string;

  @ApiPropertyOptional({ example: '/landing/promocao' })
  @IsOptional()
  @IsString()
  landingPage?: string;

  @ApiPropertyOptional({ enum: DeviceTypeDto })
  @IsOptional()
  @IsEnum(DeviceTypeDto)
  device?: DeviceTypeDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ example: '189.100.xxx.xxx' })
  @IsOptional()
  @IsString()
  ip?: string;

  @ApiPropertyOptional({ example: 'São Paulo' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'SP' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: ['interessado', 'promocao'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Custom fields as JSON object' })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
