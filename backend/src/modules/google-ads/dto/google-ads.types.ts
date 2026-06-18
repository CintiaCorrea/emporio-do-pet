/** Tipos de resposta do painel de tráfego Google Ads. */

export type GoogleAdsSegment =
  | 'consolidado'
  | 'clinica'
  | 'fisioterapia'
  | 'medicina-integrativa';

export type GoogleAdsPeriod = 'last_7' | 'last_30' | 'this_month';

export interface KpiValue {
  /** valor do período atual (null = sem dado / não disponível) */
  value: number | null;
  /** variação vs período anterior em % (null quando não dá pra comparar) */
  deltaPct: number | null;
  /** origem do número: 'ads' = API Google Ads; 'crm' = cruzamento com o CRM */
  source: 'ads' | 'crm';
  /** quando source='crm' e ainda não há captura de origem */
  pending?: boolean;
}

export interface FunnelStep {
  label: string;
  value: number | null;
  source: 'ads' | 'crm';
  /** taxa de conversão a partir da etapa anterior (0-1) */
  convFromPrev: number | null;
  pending?: boolean;
}

export interface CampaignRow {
  id: string;
  name: string;
  leads: number;
  cpa: number | null;
  convRate: number | null;
  impressionShare: number | null;
  status: 'escalar' | 'manter' | 'revisar-lp' | 'sem-dados';
}

export interface ImpressionShareBreakdown {
  captured: number | null;
  lostBudget: number | null;
  lostRank: number | null;
}

export interface QualitySummary {
  ctr: number | null;
  qualityScore: number | null;
  cpc: number | null;
  negativeTermsSuggested: number | null;
}

export interface MetricsResponse {
  segment: GoogleAdsSegment;
  period: GoogleAdsPeriod;
  /** contas do Google Ads que alimentam este segmento */
  accountsUsed: string[];
  insight: string | null;
  kpis: {
    cpa: KpiValue;
    convRate: KpiValue;
    leads: KpiValue;
    custoPorAgendamento: KpiValue;
    cac: KpiValue;
  };
  funnel: FunnelStep[];
  impressionShare: ImpressionShareBreakdown;
  quality: QualitySummary;
  campaigns: CampaignRow[];
  /** avisos pra UI (ex.: origem não capturada ainda) */
  notices: string[];
}
