import { IsString, IsOptional, IsEnum, IsBoolean, IsArray, IsNumber } from 'class-validator';

export enum ClinicalDocType {
  ANAMNESIS = 'ANAMNESIS',
  PRESCRIPTION = 'PRESCRIPTION',
  DIAGNOSIS = 'DIAGNOSIS',
  TUTOR_REPORT = 'TUTOR_REPORT',
  MEDICAL_CERTIFICATE = 'MEDICAL_CERTIFICATE',
  EXAM_REQUEST = 'EXAM_REQUEST',
  SURGICAL_REPORT = 'SURGICAL_REPORT',
  DISCHARGE_SUMMARY = 'DISCHARGE_SUMMARY',
  VACCINATION_CARD = 'VACCINATION_CARD',
  GENERAL = 'GENERAL',
}

export class CreateClinicalDocumentDto {
  @IsString()
  appointmentId: string;

  @IsEnum(ClinicalDocType)
  type: ClinicalDocType;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  htmlContent?: string;

  @IsOptional()
  @IsString()
  recordingId?: string;

  @IsOptional()
  @IsString()
  signedBy?: string;

  @IsOptional()
  @IsString()
  crmv?: string;

  @IsOptional()
  metadata?: any;
}

export class GenerateDocumentsDto {
  @IsString()
  appointmentId: string;

  @IsOptional()
  @IsString()
  recordingId?: string;

  @IsArray()
  @IsEnum(ClinicalDocType, { each: true })
  types: ClinicalDocType[];

  @IsOptional()
  @IsString()
  provider?: 'openai' | 'gemini' | 'deepseek';

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  signedBy?: string;

  @IsOptional()
  @IsString()
  crmv?: string;

  @IsOptional()
  @IsString()
  additionalContext?: string;
}

export class UpdateClinicalDocumentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  htmlContent?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  signedBy?: string;

  @IsOptional()
  @IsString()
  crmv?: string;

  @IsOptional()
  metadata?: any;
}

export class ShareDocumentDto {
  @IsString()
  method: 'whatsapp' | 'email';

  @IsString()
  recipient: string; // phone or email

  @IsOptional()
  @IsString()
  message?: string;
}
