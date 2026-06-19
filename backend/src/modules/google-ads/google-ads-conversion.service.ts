import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Fase 4 — Conversões offline (Enhanced Conversions for Leads).
 *
 * Quando um lead vira cliente (Tutor) no CRM, enviamos uma conversão offline
 * ao Google Ads casando por e-mail/telefone com hash (SHA-256). O Google casa
 * com o clique do anúncio que originou aquele contato, mesmo sem gclid.
 *
 * Tudo por env (Fly secrets), nada fixo:
 *  - reaproveita as credenciais do painel (GOOGLE_ADS_CLIENT_ID/SECRET/
 *    REFRESH_TOKEN, DEVELOPER_TOKEN, LOGIN_CUSTOMER_ID, API_VERSION).
 *  - ações de conversão por conta:
 *    GOOGLE_ADS_CONVERSION_ACTION_CLINICA/_FISIO/_INTEGRATIVA (só os dígitos do
 *    ID da ação de conversão criada no Google Ads).
 *  - valor opcional: GOOGLE_ADS_CONVERSION_VALUE (interno; nunca exibido).
 *
 * Se as credenciais OU as ações de conversão não estiverem configuradas, o
 * envio vira no-op (apenas log) — não quebra nada.
 */
@Injectable()
export class GoogleAdsConversionService {
  private readonly logger = new Logger(GoogleAdsConversionService.name);
  private tokenCache: { token: string; exp: number } | null = null;

  private get apiVersion(): string {
    return process.env.GOOGLE_ADS_API_VERSION || 'v18';
  }

  private digits(s: string): string {
    return (s || '').replace(/\D/g, '');
  }

  private credsConfigured(): boolean {
    return Boolean(
      process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
        process.env.GOOGLE_ADS_CLIENT_ID &&
        process.env.GOOGLE_ADS_CLIENT_SECRET &&
        process.env.GOOGLE_ADS_REFRESH_TOKEN,
    );
  }

  /** Pares conta(cid) -> id da ação de conversão, montados a partir de env. */
  private conversionTargets(): { cid: string; actionId: string }[] {
    const out: { cid: string; actionId: string }[] = [];
    const add = (accountEnv?: string, actionEnv?: string) => {
      const cid = this.digits(accountEnv || '');
      const actionId = this.digits(actionEnv || '');
      if (cid && actionId) out.push({ cid, actionId });
    };
    add(process.env.GOOGLE_ADS_ACCOUNT_CLINICA, process.env.GOOGLE_ADS_CONVERSION_ACTION_CLINICA);
    add(process.env.GOOGLE_ADS_ACCOUNT_FISIO, process.env.GOOGLE_ADS_CONVERSION_ACTION_FISIO);
    add(process.env.GOOGLE_ADS_ACCOUNT_INTEGRATIVA, process.env.GOOGLE_ADS_CONVERSION_ACTION_INTEGRATIVA);
    return out;
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.exp > now + 60_000) return this.tokenCache.token;
    const body = new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || '',
      grant_type: 'refresh_token',
    });
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) throw new Error(`OAuth token falhou: ${res.status} ${await res.text()}`);
    const json: any = await res.json();
    this.tokenCache = { token: json.access_token, exp: now + (json.expires_in || 3500) * 1000 };
    return json.access_token;
  }

  private sha256(s: string): string {
    return crypto.createHash('sha256').update(s).digest('hex');
  }

  private normEmail(e: string): string {
    return (e || '').trim().toLowerCase();
  }

  /** Telefone -> E.164 (assume Brasil quando não há código de país). */
  private normPhone(p: string): string {
    let d = this.digits(p);
    if (!d) return '';
    if (d.length <= 11) d = '55' + d;
    return '+' + d;
  }

  private conversionDateTime(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}+00:00`;
  }

  private async post(customerId: string, conversions: any[]): Promise<void> {
    const token = await this.getAccessToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
      'Content-Type': 'application/json',
    };
    const loginCid = this.digits(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '');
    if (loginCid) headers['login-customer-id'] = loginCid;
    const res = await fetch(
      `https://googleads.googleapis.com/${this.apiVersion}/customers/${customerId}:uploadClickConversions`,
      { method: 'POST', headers, body: JSON.stringify({ conversions, partialFailure: true }) },
    );
    if (!res.ok) throw new Error(`uploadClickConversions ${res.status}: ${await res.text()}`);
    const json: any = await res.json();
    if (json.partialFailureError) {
      throw new Error(
        `partialFailure: ${JSON.stringify(json.partialFailureError.message || json.partialFailureError)}`,
      );
    }
  }

  /**
   * Envia uma conversão "lead virou cliente" ao Google Ads para todas as contas
   * que tenham ação de conversão configurada. O Google casa pelo e-mail/telefone;
   * contas sem clique correspondente simplesmente ignoram (sem prejuízo).
   */
  async uploadClientConversion(input: {
    email?: string | null;
    phone?: string | null;
    occurredAt?: Date;
  }): Promise<void> {
    if (!this.credsConfigured()) {
      this.logger.warn('Conversão offline ignorada: credenciais Google Ads não cadastradas.');
      return;
    }
    const targets = this.conversionTargets();
    if (targets.length === 0) {
      this.logger.warn(
        'Conversão offline ignorada: nenhuma ação de conversão configurada (GOOGLE_ADS_CONVERSION_ACTION_*).',
      );
      return;
    }
    const identifiers: any[] = [];
    const email = input.email ? this.normEmail(input.email) : '';
    const phone = input.phone ? this.normPhone(input.phone) : '';
    if (email) identifiers.push({ hashedEmail: this.sha256(email) });
    if (phone) identifiers.push({ hashedPhoneNumber: this.sha256(phone) });
    if (identifiers.length === 0) {
      this.logger.warn('Conversão offline ignorada: cliente sem e-mail/telefone.');
      return;
    }

    const dt = this.conversionDateTime(input.occurredAt || new Date());
    const valueRaw = process.env.GOOGLE_ADS_CONVERSION_VALUE;
    const value = valueRaw ? Number(valueRaw) : null;

    for (const t of targets) {
      const conv: any = {
        conversionAction: `customers/${t.cid}/conversionActions/${t.actionId}`,
        conversionDateTime: dt,
        userIdentifiers: identifiers,
      };
      if (value != null && !Number.isNaN(value) && value > 0) {
        conv.conversionValue = value;
        conv.currencyCode = 'BRL';
      }
      try {
        await this.post(t.cid, [conv]);
        this.logger.log(`Conversão offline enviada ao Google Ads (conta ${t.cid}).`);
      } catch (e: any) {
        this.logger.warn(`Falha ao enviar conversão (conta ${t.cid}): ${e?.message || e}`);
      }
    }
  }
}
