import { Injectable, Logger } from '@nestjs/common';

/**
 * International phone number formatting service
 * Supports country codes and formatting for major countries
 */

export interface PhoneNumberInfo {
  original: string;
  formatted: string;
  e164: string; // International format: +<country_code><number>
  countryCode: string;
  countryName: string;
  nationalNumber: string;
  isValid: boolean;
  isMobile: boolean;
}

export interface CountryConfig {
  code: string;
  name: string;
  dialCode: string;
  nationalLength: number[];
  mobilePrefix?: string[];
  format: string; // e.g., "+XX (XX) XXXXX-XXXX"
}

@Injectable()
export class PhoneFormatterService {
  private readonly logger = new Logger(PhoneFormatterService.name);

  private readonly countries: Map<string, CountryConfig> = new Map([
    ['BR', {
      code: 'BR',
      name: 'Brasil',
      dialCode: '55',
      nationalLength: [10, 11], // 10 for landline, 11 for mobile
      mobilePrefix: ['9'],
      format: '+55 (XX) XXXXX-XXXX',
    }],
    ['US', {
      code: 'US',
      name: 'United States',
      dialCode: '1',
      nationalLength: [10],
      format: '+1 (XXX) XXX-XXXX',
    }],
    ['AR', {
      code: 'AR',
      name: 'Argentina',
      dialCode: '54',
      nationalLength: [10, 11],
      mobilePrefix: ['9'],
      format: '+54 X XXXX-XXXX',
    }],
    ['MX', {
      code: 'MX',
      name: 'México',
      dialCode: '52',
      nationalLength: [10],
      mobilePrefix: ['1'],
      format: '+52 XXX XXX XXXX',
    }],
    ['CO', {
      code: 'CO',
      name: 'Colombia',
      dialCode: '57',
      nationalLength: [10],
      mobilePrefix: ['3'],
      format: '+57 XXX XXX XXXX',
    }],
    ['PT', {
      code: 'PT',
      name: 'Portugal',
      dialCode: '351',
      nationalLength: [9],
      mobilePrefix: ['9'],
      format: '+351 XXX XXX XXX',
    }],
    ['ES', {
      code: 'ES',
      name: 'España',
      dialCode: '34',
      nationalLength: [9],
      mobilePrefix: ['6', '7'],
      format: '+34 XXX XX XX XX',
    }],
    ['DE', {
      code: 'DE',
      name: 'Germany',
      dialCode: '49',
      nationalLength: [10, 11],
      mobilePrefix: ['15', '16', '17'],
      format: '+49 XXX XXXXXXXX',
    }],
    ['FR', {
      code: 'FR',
      name: 'France',
      dialCode: '33',
      nationalLength: [9],
      mobilePrefix: ['6', '7'],
      format: '+33 X XX XX XX XX',
    }],
    ['GB', {
      code: 'GB',
      name: 'United Kingdom',
      dialCode: '44',
      nationalLength: [10],
      mobilePrefix: ['7'],
      format: '+44 XXXX XXXXXX',
    }],
    ['IT', {
      code: 'IT',
      name: 'Italy',
      dialCode: '39',
      nationalLength: [9, 10],
      mobilePrefix: ['3'],
      format: '+39 XXX XXX XXXX',
    }],
    ['CL', {
      code: 'CL',
      name: 'Chile',
      dialCode: '56',
      nationalLength: [9],
      mobilePrefix: ['9'],
      format: '+56 X XXXX XXXX',
    }],
    ['PE', {
      code: 'PE',
      name: 'Perú',
      dialCode: '51',
      nationalLength: [9],
      mobilePrefix: ['9'],
      format: '+51 XXX XXX XXX',
    }],
    ['UY', {
      code: 'UY',
      name: 'Uruguay',
      dialCode: '598',
      nationalLength: [8],
      mobilePrefix: ['9'],
      format: '+598 XX XXX XXX',
    }],
    ['PY', {
      code: 'PY',
      name: 'Paraguay',
      dialCode: '595',
      nationalLength: [9],
      mobilePrefix: ['9'],
      format: '+595 XXX XXX XXX',
    }],
  ]);

  /**
   * Parse and format a phone number
   */
  parse(phone: string, defaultCountry: string = 'BR'): PhoneNumberInfo {
    // Remove all non-digit characters except + at the start
    let digits = phone.replace(/[^\d+]/g, '');
    
    // Handle + prefix
    const hasPlus = digits.startsWith('+');
    digits = digits.replace(/\D/g, '');

    // Try to detect country from number
    const detected = this.detectCountry(digits, hasPlus, defaultCountry);
    const country = this.countries.get(detected.countryCode);

    if (!country) {
      return {
        original: phone,
        formatted: phone,
        e164: `+${digits}`,
        countryCode: detected.countryCode,
        countryName: 'Unknown',
        nationalNumber: detected.nationalNumber,
        isValid: false,
        isMobile: false,
      };
    }

    const nationalNumber = detected.nationalNumber;
    const isValid = country.nationalLength.includes(nationalNumber.length);
    const isMobile = this.isMobileNumber(nationalNumber, country);

    // Format the number
    const e164 = `+${country.dialCode}${nationalNumber}`;
    const formatted = this.formatNumber(nationalNumber, country);

    return {
      original: phone,
      formatted,
      e164,
      countryCode: country.code,
      countryName: country.name,
      nationalNumber,
      isValid,
      isMobile,
    };
  }

  /**
   * Format a phone number to E.164 format (for WhatsApp API)
   */
  toE164(phone: string, defaultCountry: string = 'BR'): string {
    const info = this.parse(phone, defaultCountry);
    return info.e164.replace('+', '');
  }

  /**
   * Format a phone number for display
   */
  toDisplay(phone: string, defaultCountry: string = 'BR'): string {
    const info = this.parse(phone, defaultCountry);
    return info.formatted;
  }

  /**
   * Validate a phone number
   */
  isValid(phone: string, defaultCountry: string = 'BR'): boolean {
    const info = this.parse(phone, defaultCountry);
    return info.isValid;
  }

  /**
   * Check if a phone number is a mobile number
   */
  isMobile(phone: string, defaultCountry: string = 'BR'): boolean {
    const info = this.parse(phone, defaultCountry);
    return info.isMobile;
  }

  /**
   * Get country from phone number
   */
  getCountry(phone: string): string | null {
    const digits = phone.replace(/\D/g, '');

    for (const [code, config] of this.countries) {
      if (digits.startsWith(config.dialCode)) {
        return code;
      }
    }

    return null;
  }

  /**
   * Get all supported countries
   */
  getSupportedCountries(): Array<{ code: string; name: string; dialCode: string }> {
    return Array.from(this.countries.values()).map(c => ({
      code: c.code,
      name: c.name,
      dialCode: c.dialCode,
    }));
  }

  /**
   * Detect country from phone number
   */
  private detectCountry(
    digits: string,
    hasPlus: boolean,
    defaultCountry: string,
  ): { countryCode: string; nationalNumber: string } {
    // If number starts with + or is long enough, try to match country code
    if (hasPlus || digits.length > 11) {
      for (const [code, config] of this.countries) {
        if (digits.startsWith(config.dialCode)) {
          return {
            countryCode: code,
            nationalNumber: digits.slice(config.dialCode.length),
          };
        }
      }
    }

    // Use default country
    const defaultConfig = this.countries.get(defaultCountry);
    if (defaultConfig) {
      // Remove leading zeros
      let national = digits.replace(/^0+/, '');

      // Brazil-specific: handle 9-digit mobile transition
      if (defaultCountry === 'BR' && national.length === 10) {
        // Check if it's a mobile number that needs the 9 prefix
        const ddd = national.substring(0, 2);
        const number = national.substring(2);
        const dddNum = parseInt(ddd);
        
        // Brazilian DDDs are 11-99
        if (dddNum >= 11 && dddNum <= 99 && !number.startsWith('9')) {
          // It might be a landline or old format, check if first digit is 2-5 (landline)
          if (!['2', '3', '4', '5'].includes(number[0])) {
            national = ddd + '9' + number;
          }
        }
      }

      return {
        countryCode: defaultCountry,
        nationalNumber: national,
      };
    }

    return {
      countryCode: defaultCountry,
      nationalNumber: digits,
    };
  }

  /**
   * Check if number is mobile based on country rules
   */
  private isMobileNumber(nationalNumber: string, country: CountryConfig): boolean {
    if (!country.mobilePrefix || country.mobilePrefix.length === 0) {
      return true; // Can't determine, assume it's valid for WhatsApp
    }

    // For Brazil, the 9 is the 3rd digit (after DDD)
    if (country.code === 'BR' && nationalNumber.length >= 3) {
      const digit = nationalNumber[2];
      return digit === '9';
    }

    // For other countries, check the start of the national number
    for (const prefix of country.mobilePrefix) {
      if (nationalNumber.startsWith(prefix)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Format number according to country format
   */
  private formatNumber(nationalNumber: string, country: CountryConfig): string {
    const dialCode = country.dialCode;

    // Country-specific formatting
    switch (country.code) {
      case 'BR':
        return this.formatBrazil(nationalNumber, dialCode);
      case 'US':
        return this.formatUS(nationalNumber, dialCode);
      case 'AR':
        return this.formatArgentina(nationalNumber, dialCode);
      default:
        return `+${dialCode} ${nationalNumber}`;
    }
  }

  /**
   * Format Brazilian phone number
   */
  private formatBrazil(national: string, dialCode: string): string {
    if (national.length === 11) {
      // Mobile: (XX) 9XXXX-XXXX
      const ddd = national.substring(0, 2);
      const first = national.substring(2, 7);
      const second = national.substring(7);
      return `+${dialCode} (${ddd}) ${first}-${second}`;
    } else if (national.length === 10) {
      // Landline: (XX) XXXX-XXXX
      const ddd = national.substring(0, 2);
      const first = national.substring(2, 6);
      const second = national.substring(6);
      return `+${dialCode} (${ddd}) ${first}-${second}`;
    }
    return `+${dialCode} ${national}`;
  }

  /**
   * Format US phone number
   */
  private formatUS(national: string, dialCode: string): string {
    if (national.length === 10) {
      const area = national.substring(0, 3);
      const exchange = national.substring(3, 6);
      const subscriber = national.substring(6);
      return `+${dialCode} (${area}) ${exchange}-${subscriber}`;
    }
    return `+${dialCode} ${national}`;
  }

  /**
   * Format Argentine phone number
   */
  private formatArgentina(national: string, dialCode: string): string {
    // Remove the mobile prefix 9 if present for formatting
    let number = national;
    if (number.startsWith('9') && number.length === 11) {
      number = number.substring(1);
    }

    if (number.length === 10) {
      const area = number.substring(0, 2);
      const first = number.substring(2, 6);
      const second = number.substring(6);
      return `+${dialCode} ${area} ${first}-${second}`;
    }
    return `+${dialCode} ${national}`;
  }

  /**
   * Normalize phone number for storage/comparison
   */
  normalize(phone: string, defaultCountry: string = 'BR'): string {
    return this.toE164(phone, defaultCountry);
  }

  /**
   * Compare two phone numbers
   */
  areEqual(phone1: string, phone2: string, defaultCountry: string = 'BR'): boolean {
    const e164_1 = this.toE164(phone1, defaultCountry);
    const e164_2 = this.toE164(phone2, defaultCountry);
    return e164_1 === e164_2;
  }

  /**
   * Extract all phone numbers from text
   */
  extractFromText(text: string): string[] {
    // Pattern to match phone numbers in various formats
    const patterns = [
      /\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
      /\(\d{2,3}\)\s*\d{4,5}[-.\s]?\d{4}/g,
      /\d{10,15}/g,
    ];

    const numbers = new Set<string>();

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          const digits = match.replace(/\D/g, '');
          if (digits.length >= 10 && digits.length <= 15) {
            numbers.add(digits);
          }
        }
      }
    }

    return Array.from(numbers);
  }

  /**
   * Mask phone number for privacy
   */
  mask(phone: string, visibleDigits: number = 4): string {
    const info = this.parse(phone);
    const national = info.nationalNumber;

    if (national.length <= visibleDigits) {
      return '*'.repeat(national.length);
    }

    const masked = '*'.repeat(national.length - visibleDigits);
    const visible = national.slice(-visibleDigits);

    return `+${info.countryCode} ${masked}${visible}`;
  }
}
