import { IsString, IsOptional, IsEnum, IsObject, IsDateString, IsArray } from 'class-validator';
import { WhatsAppMessageType } from '@prisma/client';

export class CreateCampaignDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  messageContent: string;

  @IsOptional()
  @IsEnum(WhatsAppMessageType)
  messageType?: WhatsAppMessageType = 'TEXT';

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsString()
  templateLanguage?: string = 'pt_BR';

  @IsOptional()
  @IsString()
  audienceType?: string = 'all'; // all, tutors, leads, custom

  @IsOptional()
  @IsObject()
  audienceFilter?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  messageContent?: string;

  @IsOptional()
  @IsEnum(WhatsAppMessageType)
  messageType?: WhatsAppMessageType;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsString()
  templateLanguage?: string;

  @IsOptional()
  @IsString()
  audienceType?: string;

  @IsOptional()
  @IsObject()
  audienceFilter?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}

export class AddRecipientsDto {
  @IsArray()
  recipients: Array<{
    phone: string;
    name?: string;
    tutorId?: string;
    variables?: Record<string, string>;
  }>;
}
