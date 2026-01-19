import { ScoringRule } from './base.rule';

/**
 * Regras de scoring B2C
 * Baseadas em comportamento, intenção e qualidade do lead
 *
 * Escala: 0-100
 * - 0-30: Lead frio
 * - 31-50: Lead morno
 * - 51-70: Lead quente
 * - 71-100: Lead muito quente (ação urgente)
 */
export const scoringRules: ScoringRule[] = [
  // ============================================
  // COMPORTAMENTO DE ALTA INTENÇÃO (+)
  // ============================================
  {
    name: 'pricing_view',
    description: 'Visitou página de preços',
    category: 'behavior',
    score: 25,
    evaluate: (ctx) =>
      ctx.lead.visitedPricing ||
      (ctx.enrichment?.pricingPageViews ?? 0) > 0,
  },
  {
    name: 'pricing_multiple_views',
    description: 'Visitou página de preços 3+ vezes',
    category: 'behavior',
    score: 15,
    evaluate: (ctx) => (ctx.enrichment?.pricingPageViews ?? 0) >= 3,
  },
  {
    name: 'checkout_start',
    description: 'Iniciou checkout',
    category: 'behavior',
    score: 30,
    evaluate: (ctx) => (ctx.enrichment?.checkoutStarts ?? 0) > 0,
  },
  {
    name: 'checkout_abandon',
    description: 'Abandonou carrinho (oportunidade de recuperação)',
    category: 'behavior',
    score: 20,
    evaluate: (ctx) =>
      ctx.lead.abandonedCart ||
      (ctx.enrichment?.checkoutAbandons ?? 0) > 0,
  },
  {
    name: 'form_submit',
    description: 'Submeteu formulário de contato',
    category: 'behavior',
    score: 20,
    evaluate: (ctx) => (ctx.enrichment?.formSubmissions ?? 0) > 0,
  },
  {
    name: 'whatsapp_click',
    description: 'Clicou em WhatsApp recentemente',
    category: 'behavior',
    score: 25,
    evaluate: (ctx) => ctx.recentEvents.whatsappClicks > 0,
  },

  // ============================================
  // ENGAJAMENTO (+)
  // ============================================
  {
    name: 'returned_24h',
    description: 'Retornou ao site em menos de 24h',
    category: 'engagement',
    score: 15,
    evaluate: (ctx) => ctx.lead.returnedWithin24h,
  },
  {
    name: 'multiple_sessions',
    description: 'Mais de 3 sessões no site',
    category: 'engagement',
    score: 10,
    evaluate: (ctx) => (ctx.enrichment?.totalSessions ?? 0) >= 3,
  },
  {
    name: 'high_page_views',
    description: 'Visualizou 10+ páginas',
    category: 'engagement',
    score: 10,
    evaluate: (ctx) => (ctx.enrichment?.totalPageViews ?? 0) >= 10,
  },
  {
    name: 'long_session',
    description: 'Sessão média > 2 minutos',
    category: 'engagement',
    score: 10,
    evaluate: (ctx) => (ctx.enrichment?.avgSessionDuration ?? 0) >= 120,
  },
  {
    name: 'frequent_visitor',
    description: 'Visita frequente (mais de 0.5 visitas/dia)',
    category: 'engagement',
    score: 10,
    evaluate: (ctx) => (ctx.enrichment?.visitFrequency ?? 0) >= 0.5,
  },
  {
    name: 'recent_activity',
    description: 'Ativo nos últimos 3 dias',
    category: 'recency',
    score: 15,
    evaluate: (ctx) => (ctx.enrichment?.daysSinceLastVisit ?? 999) <= 3,
  },

  // ============================================
  // ORIGEM (+)
  // ============================================
  {
    name: 'organic_source',
    description: 'Origem orgânica ou direta (alta intenção)',
    category: 'source',
    score: 10,
    evaluate: (ctx) =>
      ctx.lead.source === 'ORGANIC' || ctx.lead.source === 'DIRECT',
  },
  {
    name: 'referral_source',
    description: 'Veio por indicação',
    category: 'source',
    score: 15,
    evaluate: (ctx) => ctx.lead.source === 'REFERRAL',
  },
  {
    name: 'whatsapp_source',
    description: 'Veio pelo WhatsApp (canal quente)',
    category: 'source',
    score: 15,
    evaluate: (ctx) => ctx.lead.source === 'WHATSAPP',
  },

  // ============================================
  // QUALIDADE DO EMAIL (+ ou -)
  // ============================================
  {
    name: 'email_valid',
    description: 'Email válido e confiável',
    category: 'email',
    score: 5,
    evaluate: (ctx) => ctx.enrichment?.emailValid ?? false,
  },
  {
    name: 'email_disposable',
    description: 'Email descartável (baixa qualidade)',
    category: 'email',
    score: -25,
    evaluate: (ctx) => ctx.enrichment?.emailDisposable ?? false,
  },
  {
    name: 'email_high_risk',
    description: 'Email de alto risco',
    category: 'email',
    score: -15,
    evaluate: (ctx) => ctx.enrichment?.emailRisk === 'high',
  },

  // ============================================
  // SINAIS NEGATIVOS (-)
  // ============================================
  {
    name: 'bounce_fast',
    description: 'Bounce rápido (sessão < 10 segundos)',
    category: 'engagement',
    score: -15,
    evaluate: (ctx) =>
      (ctx.enrichment?.avgSessionDuration ?? 999) < 10 &&
      (ctx.enrichment?.totalSessions ?? 0) > 0,
  },
  {
    name: 'inactive_long',
    description: 'Inativo há mais de 14 dias',
    category: 'recency',
    score: -10,
    evaluate: (ctx) => (ctx.enrichment?.daysSinceLastVisit ?? 0) > 14,
  },
  {
    name: 'very_inactive',
    description: 'Inativo há mais de 30 dias',
    category: 'recency',
    score: -15,
    evaluate: (ctx) => (ctx.enrichment?.daysSinceLastVisit ?? 0) > 30,
  },
  {
    name: 'single_page_view',
    description: 'Apenas 1 página visualizada',
    category: 'engagement',
    score: -5,
    evaluate: (ctx) =>
      (ctx.enrichment?.totalPageViews ?? 0) === 1 &&
      (ctx.enrichment?.avgSessionDuration ?? 0) < 30,
  },

  // ============================================
  // BÔNUS COMPOSTOS
  // ============================================
  {
    name: 'very_high_intent',
    description: 'Intenção de compra muito alta (comportamento combinado)',
    category: 'behavior',
    score: 15,
    evaluate: (ctx) => ctx.enrichment?.purchaseIntent === 'very_high',
  },
  {
    name: 'conversion_ready',
    description: 'Pronto para converter (preço + checkout + retorno)',
    category: 'behavior',
    score: 20,
    evaluate: (ctx) =>
      ctx.lead.visitedPricing &&
      (ctx.enrichment?.checkoutStarts ?? 0) > 0 &&
      ctx.lead.returnedWithin24h,
  },
];

export * from './base.rule';
