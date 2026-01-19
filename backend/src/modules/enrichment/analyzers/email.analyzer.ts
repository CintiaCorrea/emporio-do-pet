import { Injectable, Logger } from '@nestjs/common';

export interface EmailAnalysis {
  provider: string;
  isValid: boolean;
  isDisposable: boolean;
  risk: 'low' | 'medium' | 'high';
  domain: string;
}

@Injectable()
export class EmailAnalyzer {
  private readonly logger = new Logger(EmailAnalyzer.name);

  // Provedores conhecidos e confiáveis
  private readonly trustedProviders = new Set([
    'gmail.com',
    'googlemail.com',
    'outlook.com',
    'hotmail.com',
    'live.com',
    'msn.com',
    'yahoo.com',
    'yahoo.com.br',
    'icloud.com',
    'me.com',
    'mac.com',
    'protonmail.com',
    'proton.me',
    'uol.com.br',
    'bol.com.br',
    'terra.com.br',
    'ig.com.br',
    'globo.com',
    'globomail.com',
    'r7.com',
  ]);

  // Domínios de email temporário/descartável
  private readonly disposableDomains = new Set([
    '10minutemail.com',
    '10minutemail.net',
    'tempmail.com',
    'temp-mail.org',
    'guerrillamail.com',
    'guerrillamail.org',
    'mailinator.com',
    'maildrop.cc',
    'yopmail.com',
    'throwaway.email',
    'fakeinbox.com',
    'dispostable.com',
    'getnada.com',
    'mohmal.com',
    'tempail.com',
    'tempr.email',
    'discard.email',
    'mailnesia.com',
    'sharklasers.com',
    'trashmail.com',
    'mytrashmail.com',
    'mt2009.com',
    'trash-mail.com',
    'bugmenot.com',
    'spamgourmet.com',
    'emailondeck.com',
    'mintemail.com',
    'tempinbox.com',
    'emailfake.com',
    'fakemailgenerator.com',
  ]);

  // Padrões suspeitos em emails
  private readonly suspiciousPatterns = [
    /^test\d*@/i,
    /^fake\d*@/i,
    /^spam\d*@/i,
    /^temp\d*@/i,
    /^asdf/i,
    /^qwerty/i,
    /^aaa+@/i,
    /^xxx+@/i,
    /^123+@/i,
    /noreply/i,
    /donotreply/i,
  ];

  /**
   * Analisa um endereço de email
   */
  analyze(email: string): EmailAnalysis {
    const normalizedEmail = email.toLowerCase().trim();
    const parts = normalizedEmail.split('@');

    if (parts.length !== 2) {
      return {
        provider: 'invalid',
        isValid: false,
        isDisposable: false,
        risk: 'high',
        domain: '',
      };
    }

    const [localPart, domain] = parts;

    // Verificar formato básico
    const isValidFormat = this.isValidEmailFormat(normalizedEmail);

    // Verificar se é descartável
    const isDisposable = this.isDisposableDomain(domain);

    // Identificar provedor
    const provider = this.identifyProvider(domain);

    // Verificar padrões suspeitos
    const hasSuspiciousPattern = this.hasSuspiciousPattern(localPart);

    // Calcular risco
    const risk = this.calculateRisk({
      isValidFormat,
      isDisposable,
      provider,
      hasSuspiciousPattern,
      domain,
    });

    return {
      provider,
      isValid: isValidFormat && !isDisposable,
      isDisposable,
      risk,
      domain,
    };
  }

  /**
   * Valida formato básico do email
   */
  private isValidEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Verifica se domínio é descartável
   */
  private isDisposableDomain(domain: string): boolean {
    // Verificar lista conhecida
    if (this.disposableDomains.has(domain)) {
      return true;
    }

    // Verificar padrões comuns de descartáveis
    const disposablePatterns = [
      /temp.*mail/i,
      /throw.*away/i,
      /fake.*mail/i,
      /trash.*mail/i,
      /spam.*mail/i,
      /disposable/i,
      /10minute/i,
      /guerrilla/i,
    ];

    return disposablePatterns.some((pattern) => pattern.test(domain));
  }

  /**
   * Identifica o provedor do email
   */
  private identifyProvider(domain: string): string {
    // Provedores conhecidos
    if (domain.includes('gmail') || domain === 'googlemail.com') {
      return 'gmail';
    }
    if (
      domain.includes('outlook') ||
      domain.includes('hotmail') ||
      domain.includes('live.') ||
      domain === 'msn.com'
    ) {
      return 'microsoft';
    }
    if (domain.includes('yahoo')) {
      return 'yahoo';
    }
    if (
      domain.includes('icloud') ||
      domain === 'me.com' ||
      domain === 'mac.com'
    ) {
      return 'apple';
    }
    if (domain.includes('proton')) {
      return 'protonmail';
    }
    if (
      domain.includes('uol') ||
      domain.includes('bol') ||
      domain.includes('terra') ||
      domain.includes('ig.com') ||
      domain.includes('globo') ||
      domain.includes('r7')
    ) {
      return 'brasileiro';
    }

    // Se não é conhecido, pode ser corporativo
    if (this.trustedProviders.has(domain)) {
      return 'trusted';
    }

    // Domínio customizado (pode ser corporativo)
    return 'custom';
  }

  /**
   * Verifica padrões suspeitos na parte local do email
   */
  private hasSuspiciousPattern(localPart: string): boolean {
    return this.suspiciousPatterns.some((pattern) => pattern.test(localPart));
  }

  /**
   * Calcula nível de risco do email
   */
  private calculateRisk(params: {
    isValidFormat: boolean;
    isDisposable: boolean;
    provider: string;
    hasSuspiciousPattern: boolean;
    domain: string;
  }): 'low' | 'medium' | 'high' {
    const { isValidFormat, isDisposable, provider, hasSuspiciousPattern } =
      params;

    // Formato inválido ou descartável = alto risco
    if (!isValidFormat || isDisposable) {
      return 'high';
    }

    // Padrão suspeito = médio risco
    if (hasSuspiciousPattern) {
      return 'medium';
    }

    // Provedor confiável = baixo risco
    if (['gmail', 'microsoft', 'yahoo', 'apple', 'protonmail', 'brasileiro', 'trusted'].includes(provider)) {
      return 'low';
    }

    // Domínio customizado = médio risco (pode ser corporativo legítimo)
    return 'medium';
  }
}
