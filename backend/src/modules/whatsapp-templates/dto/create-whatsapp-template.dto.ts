import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TemplateCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  MARKETING = 'MARKETING',
  UTILITY = 'UTILITY',
}

export enum TemplateLanguage {
  PT_BR = 'pt_BR',
  EN_US = 'en_US',
  ES = 'es',
}

export enum ComponentType {
  HEADER = 'HEADER',
  BODY = 'BODY',
  FOOTER = 'FOOTER',
  BUTTONS = 'BUTTONS',
}

export enum HeaderFormat {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
}

export enum ButtonType {
  QUICK_REPLY = 'QUICK_REPLY',
  URL = 'URL',
  PHONE_NUMBER = 'PHONE_NUMBER',
  COPY_CODE = 'COPY_CODE',
}

// Button DTOs
export class QuickReplyButtonDto {
  @IsEnum(ButtonType)
  type: ButtonType = ButtonType.QUICK_REPLY;

  @IsString()
  @MaxLength(25)
  text: string;
}

export class UrlButtonDto {
  @IsEnum(ButtonType)
  type: ButtonType = ButtonType.URL;

  @IsString()
  @MaxLength(25)
  text: string;

  @IsString()
  url: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  example?: string[];
}

export class PhoneButtonDto {
  @IsEnum(ButtonType)
  type: ButtonType = ButtonType.PHONE_NUMBER;

  @IsString()
  @MaxLength(25)
  text: string;

  @IsString()
  phone_number: string;
}

export class CopyCodeButtonDto {
  @IsEnum(ButtonType)
  type: ButtonType = ButtonType.COPY_CODE;

  @IsString()
  example: string;
}

// Header component
export class HeaderComponentDto {
  @IsEnum(ComponentType)
  type: ComponentType = ComponentType.HEADER;

  @IsEnum(HeaderFormat)
  format: HeaderFormat;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  text?: string;

  @IsOptional()
  example?: {
    header_text?: string[];
    header_handle?: string[];
  };
}

// Body component
export class BodyComponentDto {
  @IsEnum(ComponentType)
  type: ComponentType = ComponentType.BODY;

  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  text: string;

  @IsOptional()
  example?: {
    body_text?: string[][];
  };
}

// Footer component
export class FooterComponentDto {
  @IsEnum(ComponentType)
  type: ComponentType = ComponentType.FOOTER;

  @IsString()
  @MaxLength(60)
  text: string;
}

// Buttons component
export class ButtonsComponentDto {
  @IsEnum(ComponentType)
  type: ComponentType = ComponentType.BUTTONS;

  @IsArray()
  buttons: Array<QuickReplyButtonDto | UrlButtonDto | PhoneButtonDto | CopyCodeButtonDto>;
}

// Main DTO
export class CreateWhatsAppTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(512)
  name: string;

  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @IsEnum(TemplateLanguage)
  @IsOptional()
  language?: TemplateLanguage = TemplateLanguage.PT_BR;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  components: Array<HeaderComponentDto | BodyComponentDto | FooterComponentDto | ButtonsComponentDto>;

  @IsBoolean()
  @IsOptional()
  allowCategoryChange?: boolean = true;
}

// Simplified DTO for easier frontend usage
export class CreateSimpleTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  name: string;

  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @IsEnum(TemplateLanguage)
  @IsOptional()
  language?: TemplateLanguage = TemplateLanguage.PT_BR;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  headerText?: string;

  @IsOptional()
  @IsEnum(HeaderFormat)
  headerFormat?: HeaderFormat;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  bodyText: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  footerText?: string;

  @IsOptional()
  @IsArray()
  buttons?: Array<{
    type: ButtonType;
    text: string;
    url?: string;
    phone_number?: string;
    example?: string;
  }>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bodyExamples?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  headerExamples?: string[];
}
