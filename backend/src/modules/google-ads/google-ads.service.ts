import { Injectable, Logger } from '@nestjs/common';
import {
  CampaignRow,
  FunnelStep,
  GoogleAdsPeriod,
  GoogleAdsSegment,
  KpiValue,
  MetricsResponse,
} from './dto/google-ads.types';

/**
 * Painel de tráfego do Google Ads.
 *
 * - Métricas de topo (impressões, cliques, CPA, conversão, parcela de
 *   impressões, qualidade) vêm da API do Google Ads (chamadas HTTP diretas,
 *   sem biblioteca externa).
 * - Custo por agendamento e CAC dependem do cruzamento com o CRM por origem
 *   do lead. Enquanto a captura de origem (WhatsApp API) não estiver ligada,
 *   esses números voltam em estado "pending" ("aguardando origem").
 *
 * Tudo configurável por env (Fly secrets) — nada de número fixo de conta no
 * código. O mapeamento segmento->contas é editável via GOOGLE_ADS_SEGMENTS.
 */
@Injectable()
export class GoogleAdsService {
  private readonly logger = new Logger(GoogleAdsService.name);
  private tokenCache: { token: string; exp: number } | null = null;

  private get apiVersion(): string {
    return process.env.GOOGLE_ADS_API_VERSION || 'v18';
  }

  /** Mapeamento segmento -> lista de customerIds (só dígitos). Editável por env. */
  private segmentMap(): Record<Exclude<GoogleAdsSegment, 'consolidado'>, string[]> {
    const fallback = {
      clinica: this.digits(process.env.GOOGLE_ADS_ACCOUNT_CLINICA || '652-791-0717'),
      fisioterapia: this.digits(process.env.GOOGLE_ADS_ACCOUNT_FISIO || '160-256-3854'),
      'medicina-integrativa': this.digits(process.env.GOOGLE_ADS_ACCOUNT_INTEGRATIVA || ''),
    };
    const raw = process.env.GOOGLE_ADS_SEGMENTS;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return {
          clinica: (parsed.clinica || []).map((x: string) => this.digits(x)).filter(Boolean),
          fisioterapia: (parsed.fisioterapia || []).map((x: string) => this.digits(x)).filter(Boolean),
          'medicina-integrativa': (parsed['medicina-integrativa'] || []).map((x: string) => this.digits(x)).filter(Boolean),
        } as any;
      } catch {
        this.logger.warn('GOOGLE_ADS_SEGMENTS inválido (JSON), usando fallback');
      }
    }
    return {
      clinica: fallback.clinica ? [fallback.clinica] : [],
      fisioterapia: fallback.fisioterapia ? [fallback.fisioterapia] : [],
      'medicina-integrativa': fallback['medicina-integrativa'] ? [fallback['medicina-integrativa']] : [],
    };
  }

  private digits(s: string): string {
    return (s || '').replace(/\D/g, '');
  }

  private accountsForSegment(segment: GoogleAdsSegment): string[] {
    const map = this.segmentMap();
    if (segment === 'consolidado') {
      return Array.from(new Set([...map.clinica, ...map.fisioterapia, ...map['medicina-integrativa']]));
    }
    return map[segment] || [];
  }

  private credsConfigured(): boolean {
    return Boolean(
      process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
        process.env.GOOGLE_ADS_CLIENT_ID &&
        process.env.GOOGLE_ADS_CLIENT_SECRET &&
        process.env.GOOGLE_ADS_REFRESH_TOKEN,
    );
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
    if (!res.ok) {
      throw new Error(`OAuth token falhou: ${res.status} ${await res.text()}`);
    }
    const json: any = await res.json();
    this.tokenCache = { token: json.access_token, exp: now + (json.expires_in || 3500) * 1000 };
    return json.access_token;
  }

  /** Executa uma consulta GAQL numa conta e retorna todas as linhas. */
  private async search(customerId: string, query: string): Promise<any[]> {
    const token = await this.getAccessToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
      'Content-Type': 'application/json',
    };
    const loginCid = this.digits(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '');
    if (loginCid) headers['login-customer-id'] = loginCid;

    const rows: any[] = [];
    let pageToken: string | undefined;
    do {
      const res = await fetch(
        `https://googleads.googleapis.com/${this.apiVersion}/customers/${customerId}/googleAds:search`,
        { method: 'POST', headers, body: JSON.stringify({ query, pageToken }) },
      );
      if (!res.ok) {
        throw new Error(`GAQL ${res.status} (conta ${customerId}): ${await res.text()}`);
      }
      const json: any = await res.json();
      (json.results || []).forEach((r: any) => rows.push(r));
      pageToken = json.nextPageToken;
    } while (pageToken);
    return rows;
  }

  private periodDates(period: GoogleAdsPeriod): { start: string; end: string; prevStart: string; prevEnd: string } {
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() - 1); // ontem (dados consolidados)
    const start = new Date(end);
    if (period === 'last_7') start.setDate(start.getDate() - 6);
    else if (period === 'this_month') start.setDate(1);
    else start.setDate(start.getDate() - 29);
    const spanMs = end.getTime() - start.getTime();
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd.getTime() - spanMs);
    return { start: fmt(start), end: fmt(end), prevStart: fmt(prevStart), prevEnd: fmt(prevEnd) };
  }

  private async accountTotals(customerId: string, start: string, end: string) {
    const query = `SELECT metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.search_impression_share, metrics.search_budget_lost_impression_share, metrics.search_rank_lost_impression_share FROM campaign WHERE segments.date BETWEEN '${start}' AND '${end}'`;
    const rows = await this.search(customerId, query);
    const t = { impressions: 0, clicks: 0, cost: 0, conversions: 0, isWeighted: 0, isBudget: 0, isRank: 0, isImpr: 0 };
    for (const r of rows) {
      const m = r.metrics || {};
      const impr = Number(m.impressions || 0);
      t.impressions += impr;
      t.clicks += Number(m.clicks || 0);
      t.cost += Number(m.costMicros || 0) / 1e6;
      t.conversions += Number(m.conversions || 0);
      if (m.searchImpressionShare != null) { t.isWeighted += Number(m.searchImpressionShare) * impr; t.isImpr += impr; }
      if (m.searchBudgetLostImpressionShare != null) t.isBudget += Number(m.searchBudgetLostImpressionShare) * impr;
      if (m.searchRankLostImpressionShare != null) t.isRank += Number(m.searchRankLostImpressionShare) * impr;
    }
    return t;
  }

  private async campaignRows(customerId: string, start: string, end: string): Promise<CampaignRow[]> {
    const query = `SELECT campaign.id, campaign.name, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.search_impression_share FROM campaign WHERE segments.date BETWEEN '${start}' AND '${end}' ORDER BY metrics.conversions DESC`;
    const rows = await this.search(customerId, query);
    return rows.map((r) => {
      const m = r.metrics || {};
      const leads = Number(m.conversions || 0);
      const clicks = Number(m.clicks || 0);
      const cost = Number(m.costMicros || 0) / 1e6;
      const cpa = leads > 0 ? cost / leads : null;
      const convRate = clicks > 0 ? leads / clicks : null;
      const is = m.searchImpressionShare != null ? Number(m.searchImpressionShare) : null;
      let status: CampaignRow['status'] = 'sem-dados';
      const meta = Number(process.env.GOOGLE_ADS_CPA_META || 60);
      if (leads >= 5 && cpa != null && cpa <= meta) status = 'escalar';
      else if (convRate != null && convRate < 0.015) status = 'revisar-lp';
      else if (leads > 0) status = 'manter';
      return { id: String(r.campaign?.id || ''), name: r.campaign?.name || '—', leads, cpa, convRate, impressionShare: is, status };
    });
  }

  private async quality(customerId: string, start: string, end: string) {
    let qs: number | null = null;
    let ctr: number | null = null;
    let cpc: number | null = null;
    let negatives: number | null = null;
    try {
      const kw = await this.search(
        customerId,
        `SELECT ad_group_criterion.quality_info.quality_score, metrics.impressions FROM keyword_view WHERE segments.date BETWEEN '${start}' AND '${end}'`,
      );
      let sum = 0, w = 0;
      for (const r of kw) {
        const score = r.adGroupCriterion?.qualityInfo?.qualityScore;
        const impr = Number(r.metrics?.impressions || 0);
        if (score != null) { sum += Number(score) * (impr || 1); w += impr || 1; }
      }
      if (w > 0) qs = sum / w;
    } catch (e) { this.logger.warn(`quality score indisponível: ${e}`); }
    try {
      const acc = await this.search(
        customerId,
        `SELECT metrics.ctr, metrics.average_cpc FROM customer WHERE segments.date BETWEEN '${start}' AND '${end}'`,
      );
      const m = acc[0]?.metrics;
      if (m) { ctr = m.ctr != null ? Number(m.ctr) : null; cpc = m.averageCpc != null ? Number(m.averageCpc) / 1e6 : null; }
    } catch (e) { this.logger.warn(`ctr/cpc indisponível: ${e}`); }
    try {
      const st = await this.search(
        customerId,
        `SELECT search_term_view.search_term, metrics.clicks, metrics.conversions FROM search_term_view WHERE segments.date BETWEEN '${start}' AND '${end}'`,
      );
      negatives = st.filter((r) => Number(r.metrics?.clicks || 0) >= 3 && Number(r.metrics?.conversions || 0) === 0).length;
    } catch (e) { this.logger.warn(`search terms indisponível: ${e}`); }
    return { qs, ctr, cpc, negatives };
  }

  private kpi(value: number | null, prev: number | null, source: 'ads' | 'crm', pending = false): KpiValue {
    let deltaPct: number | null = null;
    if (!pending && value != null && prev != null && prev !== 0) deltaPct = ((value - prev) / prev) * 100;
    return { value: pending ? null : value, deltaPct, source, pending: pending || undefined };
  }

  async getMetrics(segment: GoogleAdsSegment, period: GoogleAdsPeriod): Promise<MetricsResponse> {
    const accounts = this.accountsForSegment(segment);
    const { start, end, prevStart, prevEnd } = this.periodDates(period);
    const notices: string[] = [];

    const empty = (): MetricsResponse => ({
      segment, period, accountsUsed: accounts, insight: null,
      kpis: {
        cpa: this.kpi(null, null, 'ads'), convRate: this.kpi(null, null, 'ads'), leads: this.kpi(null, null, 'ads'),
        custoPorAgendamento: this.kpi(null, null, 'crm', true), cac: this.kpi(null, null, 'crm', true),
      },
      funnel: [], impressionShare: { captured: null, lostBudget: null, lostRank: null },
      quality: { ctr: null, qualityScore: null, cpc: null, negativeTermsSuggested: null },
      campaigns: [], notices,
    });

    if (!this.credsConfigured()) {
      notices.push('Credenciais do Google Ads ainda não cadastradas no servidor.');
      return empty();
    }
    if (accounts.length === 0) {
      notices.push('Nenhuma conta do Google Ads vinculada a este segmento ainda.');
      return empty();
    }

    try {
      const cur = { impressions: 0, clicks: 0, cost: 0, conversions: 0, isWeighted: 0, isBudget: 0, isRank: 0, isImpr: 0 };
      const prev = { impressions: 0, clicks: 0, cost: 0, conversions: 0 };
      let campaigns: CampaignRow[] = [];
      const q = { qs: [] as number[], ctr: [] as number[], cpc: [] as number[], neg: 0 };

      for (const cid of accounts) {
        const c = await this.accountTotals(cid, start, end);
        cur.impressions += c.impressions; cur.clicks += c.clicks; cur.cost += c.cost; cur.conversions += c.conversions;
        cur.isWeighted += c.isWeighted; cur.isBudget += c.isBudget; cur.isRank += c.isRank; cur.isImpr += c.isImpr;
        const p = await this.accountTotals(cid, prevStart, prevEnd);
        prev.impressions += p.impressions; prev.clicks += p.clicks; prev.cost += p.cost; prev.conversions += p.conversions;
        campaigns = campaigns.concat(await this.campaignRows(cid, start, end));
        const ql = await this.quality(cid, start, end);
        if (ql.qs != null) q.qs.push(ql.qs);
        if (ql.ctr != null) q.ctr.push(ql.ctr);
        if (ql.cpc != null) q.cpc.push(ql.cpc);
        if (ql.negatives != null) q.neg += ql.negatives;
      }

      const cpaCur = cur.conversions > 0 ? cur.cost / cur.conversions : null;
      const cpaPrev = prev.conversions > 0 ? prev.cost / prev.conversions : null;
      const convCur = cur.clicks > 0 ? cur.conversions / cur.clicks : null;
      const convPrev = prev.clicks > 0 ? prev.conversions / prev.clicks : null;
      const captured = cur.isImpr > 0 ? cur.isWeighted / cur.isImpr : null;
      const lostBudget = cur.isImpr > 0 ? cur.isBudget / cur.isImpr : null;
      const lostRank = cur.isImpr > 0 ? cur.isRank / cur.isImpr : null;
      const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

      const funnel: FunnelStep[] = [
        { label: 'Impressões', value: cur.impressions, source: 'ads', convFromPrev: null },
        { label: 'Cliques', value: cur.clicks, source: 'ads', convFromPrev: cur.impressions > 0 ? cur.clicks / cur.impressions : null },
        { label: 'Leads no WhatsApp', value: cur.conversions, source: 'ads', convFromPrev: cur.clicks > 0 ? cur.conversions / cur.clicks : null },
        { label: 'Agendamentos', value: null, source: 'crm', convFromPrev: null, pending: true },
        { label: 'Clientes', value: null, source: 'crm', convFromPrev: null, pending: true },
      ];

      notices.push('Custo por agendamento, CAC e fundo do funil aguardam a captura de origem do lead (WhatsApp API).');

      return {
        segment, period, accountsUsed: accounts,
        insight: this.buildInsight(lostBudget, convCur, captured),
        kpis: {
          cpa: this.kpi(cpaCur, cpaPrev, 'ads'),
          convRate: this.kpi(convCur, convPrev, 'ads'),
          leads: this.kpi(cur.conversions, prev.conversions, 'ads'),
          custoPorAgendamento: this.kpi(null, null, 'crm', true),
          cac: this.kpi(null, null, 'crm', true),
        },
        funnel,
        impressionShare: { captured, lostBudget, lostRank },
        quality: { ctr: avg(q.ctr), qualityScore: avg(q.qs), cpc: avg(q.cpc), negativeTermsSuggested: q.neg },
        campaigns,
        notices,
      };
    } catch (e: any) {
      this.logger.error(`Falha ao buscar métricas Google Ads: ${e?.message || e}`);
      notices.push(`Não foi possível consultar a API do Google Ads agora (${e?.message || e}).`);
      return empty();
    }
  }

  private buildInsight(lostBudget: number | null, convRate: number | null, captured: number | null): string | null {
    if (lostBudget != null && lostBudget >= 0.2) {
      return `${Math.round(lostBudget * 100)}% das impressões estão sendo perdidas por orçamento — há demanda não atendida. Considere aumentar a verba.`;
    }
    if (convRate != null && convRate < 0.015) {
      return `Taxa de conversão baixa (${(convRate * 100).toFixed(1)}%). Vale revisar a página de destino e a mensagem do anúncio.`;
    }
    if (captured != null && captured >= 0.8) {
      return `Boa presença na busca (${Math.round(captured * 100)}% das impressões capturadas). Foque em melhorar conversão.`;
    }
    return null;
  }
}
