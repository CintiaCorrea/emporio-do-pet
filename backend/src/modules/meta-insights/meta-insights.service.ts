import { Injectable, Logger } from '@nestjs/common';

export type MetaPeriod = 'last_7' | 'last_30' | 'this_month' | 'last_month';

const PRESET: Record<string, string> = {
  last_7: 'last_7d',
  last_30: 'last_30d',
  this_month: 'this_month',
  last_month: 'last_month',
};

export interface MetaCampaignRow {
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversas: number;
  custoPorConversa: number;
}

export interface MetaTotals {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversas: number;
  custoPorConversa: number;
}

export interface MetaInsightsResponse {
  period: string;
  accountId: string;
  totals: MetaTotals;
  campaigns: MetaCampaignRow[];
  notices: string[];
}

const CONV_TYPES = [
  'onsite_conversion.messaging_conversation_started_7d',
  'messaging_conversation_started_7d',
  'messaging_conversation_started',
];

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function emptyTotals(): MetaTotals {
  return { spend: 0, impressions: 0, clicks: 0, ctr: 0, conversas: 0, custoPorConversa: 0 };
}

@Injectable()
export class MetaInsightsService {
  private readonly logger = new Logger(MetaInsightsService.name);
  private readonly v = process.env.META_GRAPH_VERSION || 'v21.0';

  async getMetrics(period: string): Promise<MetaInsightsResponse> {
    const token = process.env.META_LEADS_TOKEN;
    const account = process.env.META_AD_ACCOUNT_ID || '';
    const notices: string[] = [];
    if (!token || !account) {
      notices.push('META_LEADS_TOKEN ou META_AD_ACCOUNT_ID nao configurados.');
      return { period, accountId: account, totals: emptyTotals(), campaigns: [], notices };
    }
    const preset = PRESET[period] || 'last_30d';
    const fields = 'campaign_id,campaign_name,spend,impressions,clicks,ctr,actions';
    let url =
      'https://graph.facebook.com/' + this.v + '/' + account +
      '/insights?level=campaign&date_preset=' + preset +
      '&fields=' + fields + '&limit=200&access_token=' + encodeURIComponent(token);
    const rows: any[] = [];
    try {
      let guard = 0;
      while (url && guard < 10) {
        guard++;
        const res = await fetch(url);
        const json: any = await res.json();
        if (!res.ok) {
          notices.push('Meta API ' + res.status + ': ' + (json && json.error && json.error.message ? json.error.message : 'erro'));
          break;
        }
        const data = (json && json.data) || [];
        for (const r of data) rows.push(r);
        url = (json && json.paging && json.paging.next) || '';
      }
    } catch (e) {
      notices.push('Falha ao consultar a Meta: ' + e);
    }

    const campaigns: MetaCampaignRow[] = rows.map((r) => {
      const spend = num(r.spend);
      const conversas = this.countConv(r.actions);
      return {
        campaignId: String(r.campaign_id || ''),
        campaignName: String(r.campaign_name || ''),
        spend,
        impressions: num(r.impressions),
        clicks: num(r.clicks),
        ctr: num(r.ctr),
        conversas,
        custoPorConversa: conversas > 0 ? spend / conversas : 0,
      };
    });

    const totals = campaigns.reduce((a, c) => {
      a.spend += c.spend;
      a.impressions += c.impressions;
      a.clicks += c.clicks;
      a.conversas += c.conversas;
      return a;
    }, emptyTotals());
    totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    totals.custoPorConversa = totals.conversas > 0 ? totals.spend / totals.conversas : 0;

    if (!campaigns.length && !notices.length) {
      notices.push('Sem dados de campanha no periodo (conta sem anuncios ativos?).');
    }
    return { period, accountId: account, totals, campaigns, notices };
  }

  private countConv(actions: any): number {
    if (!Array.isArray(actions)) return 0;
    let n = 0;
    for (const a of actions) if (a && CONV_TYPES.includes(a.action_type)) n += num(a.value);
    return n;
  }
}
