export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

export type TemplateType =
  | 'STANDARD'
  | 'CATALOG'
  | 'FLOWS'
  | 'ORDER_DETAILS'
  | 'CALL_PERMISSION'
  | 'CAROUSEL'
  | 'LIMITED_TIME_OFFER'
  | 'MPM';

export type HeaderFormat = 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION';
export type ButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE' | 'FLOW' | 'OTP' | 'MPM';
export type OtpType = 'COPY_CODE' | 'ONE_TAP' | 'ZERO_TAP';

export interface TemplateButton {
  id: string;
  type: ButtonType;
  text: string;
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
  mpm_button_text?: string;
}

export interface HeaderLocation {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface CarouselCard {
  id: string;
  mediaFormat: 'IMAGE' | 'VIDEO';
  mediaHandle?: string;
  bodyText: string;
  buttons: TemplateButton[];
}

export interface MpmSection {
  id: string;
  title: string;
  productRetailerIds: string[];
}

export interface OrderItem {
  id: string;
  name: string;
  amount: number;
  quantity: number;
}

export interface TemplateFormData {
  name: string;
  category: TemplateCategory;
  templateType: TemplateType;
  language: string;
  headerFormat: HeaderFormat;
  headerText: string;
  headerMediaHandle?: string;
  headerLocation?: HeaderLocation;
  bodyText: string;
  footerText: string;
  buttons: TemplateButton[];
  bodyExamples: string[];
  headerExamples: string[];
  addSecurityRecommendation: boolean;
  codeExpirationMinutes?: number;
  carouselCards: CarouselCard[];
  limitedTimeOfferText: string;
  mpmSections: MpmSection[];
  orderItems: OrderItem[];
}

export interface LanguageOption {
  value: string;
  label: string;
}

export interface MetaFlow {
  id: string;
  name: string;
}
