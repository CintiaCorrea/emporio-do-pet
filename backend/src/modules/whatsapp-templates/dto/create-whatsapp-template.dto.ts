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
  IsNumber,
  IsObject,
  ValidateIf,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TemplateCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  MARKETING = 'MARKETING',
  UTILITY = 'UTILITY',
}

export enum ComponentType {
  HEADER = 'HEADER',
  BODY = 'BODY',
  FOOTER = 'FOOTER',
  BUTTONS = 'BUTTONS',
  CAROUSEL = 'CAROUSEL',
  LIMITED_TIME_OFFER = 'LIMITED_TIME_OFFER',
  ORDER_DETAILS = 'ORDER_DETAILS',
}

export enum HeaderFormat {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
  LOCATION = 'LOCATION',
}

export enum ButtonType {
  QUICK_REPLY = 'QUICK_REPLY',
  URL = 'URL',
  PHONE_NUMBER = 'PHONE_NUMBER',
  COPY_CODE = 'COPY_CODE',
  FLOW = 'FLOW',
  OTP = 'OTP',
  MPM = 'MPM',
}

export enum OtpType {
  COPY_CODE = 'COPY_CODE',
  ONE_TAP = 'ONE_TAP',
  ZERO_TAP = 'ZERO_TAP',
}

export class HeaderLocationExampleDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

// Button DTOs
export class TemplateButtonDto {
  @IsEnum(ButtonType)
  type: ButtonType;

  @ValidateIf((o) => ![ButtonType.OTP, ButtonType.MPM].includes(o.type))
  @IsString()
  @MaxLength(25)
  text?: string;

  @ValidateIf((o) => o.type === ButtonType.URL)
  @IsString()
  url?: string;

  @ValidateIf((o) => o.type === ButtonType.PHONE_NUMBER)
  @IsString()
  phone_number?: string;

  @ValidateIf((o) => o.type === ButtonType.COPY_CODE || o.type === ButtonType.URL)
  @IsString()
  example?: string;

  @ValidateIf((o) => o.type === ButtonType.FLOW)
  @IsString()
  flow_id?: string;

  @ValidateIf((o) => o.type === ButtonType.FLOW)
  @IsString()
  flow_name?: string;

  @ValidateIf((o) => o.type === ButtonType.FLOW)
  @IsString()
  flow_json?: string;

  @ValidateIf((o) => o.type === ButtonType.FLOW)
  @IsString()
  navigate_screen?: string;

  @ValidateIf((o) => o.type === ButtonType.FLOW)
  @IsString()
  flow_action?: 'navigate' | 'data_exchange';

  @ValidateIf((o) => o.type === ButtonType.OTP)
  @IsEnum(OtpType)
  otp_type?: OtpType;

  @ValidateIf((o) => o.type === ButtonType.OTP)
  @IsString()
  package_name?: string;

  @ValidateIf((o) => o.type === ButtonType.OTP)
  @IsString()
  signature_hash?: string;

  @ValidateIf((o) => o.type === ButtonType.MPM)
  @IsOptional()
  @IsString()
  mpm_button_text?: string;
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
  @ValidateNested()
  @Type(() => Object)
  example?: {
    header_text?: string[];
    header_handle?: string[];
    header_location?: HeaderLocationExampleDto[];
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
  @IsObject()
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
  @ValidateNested({ each: true })
  @Type(() => TemplateButtonDto)
  buttons: TemplateButtonDto[];
}

export class CarouselCardDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  components: Array<HeaderComponentDto | BodyComponentDto | ButtonsComponentDto>;
}

export class CarouselComponentDto {
  @IsEnum(ComponentType)
  type: ComponentType = ComponentType.CAROUSEL;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CarouselCardDto)
  cards: CarouselCardDto[];
}

export class LimitedTimeOfferComponentDto {
  @IsEnum(ComponentType)
  type: ComponentType = ComponentType.LIMITED_TIME_OFFER;

  @IsObject()
  limited_time_offer: {
    text: string;
    has_expiration: boolean;
  };
}

export class OrderDetailsComponentDto {
  @IsEnum(ComponentType)
  type: ComponentType = ComponentType.ORDER_DETAILS;

  @IsObject()
  order: Record<string, unknown>;
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

  @IsString()
  @IsOptional()
  language?: string = 'pt_BR';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  components: Array<
    | HeaderComponentDto
    | BodyComponentDto
    | FooterComponentDto
    | ButtonsComponentDto
    | CarouselComponentDto
    | LimitedTimeOfferComponentDto
    | OrderDetailsComponentDto
  >;

  @IsBoolean()
  @IsOptional()
  allow_category_change?: boolean = true;

  @IsOptional()
  @IsBoolean()
  add_security_recommendation?: boolean;

  @IsOptional()
  @IsNumber()
  code_expiration_minutes?: number;
}

// Simplified DTO for easier frontend usage
export class CreateSimpleTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  name: string;

  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @IsString()
  @IsOptional()
  language?: string = 'pt_BR';

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
    text?: string;
    url?: string;
    phone_number?: string;
    example?: string;
    flow_id?: string;
    flow_name?: string;
    flow_json?: string;
    navigate_screen?: string;
    flow_action?: 'navigate' | 'data_exchange';
    otp_type?: OtpType;
    package_name?: string;
    signature_hash?: string;
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
