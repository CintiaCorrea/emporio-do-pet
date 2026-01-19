/**
 * Interface base para regras de scoring
 * Cada regra é explicável e auditável
 */
export interface ScoringRule {
  /** Nome único da regra */
  name: string;

  /** Descrição legível para humanos */
  description: string;

  /** Categoria da regra (comportamento, email, engajamento, etc.) */
  category: 'behavior' | 'email' | 'engagement' | 'recency' | 'source';

  /** Pontos a adicionar/subtrair se a regra se aplicar */
  score: number;

  /** Função que avalia se a regra se aplica */
  evaluate: (context: ScoringContext) => boolean;
}

/**
 * Contexto com todos os dados disponíveis para scoring
 */
export interface ScoringContext {
  lead: {
    id: string;
    email: string;
    source: string;
    status: string;
    currentScore: number;
    visitedPricing: boolean;
    abandonedCart: boolean;
    returnedWithin24h: boolean;
    firstSeenAt: Date;
    lastSeenAt: Date;
    lastActivityAt: Date | null;
    tags: string[];
  };

  enrichment: {
    emailValid: boolean;
    emailDisposable: boolean;
    emailRisk: string | null;
    totalPageViews: number;
    pricingPageViews: number;
    checkoutStarts: number;
    checkoutAbandons: number;
    formSubmissions: number;
    totalSessions: number;
    avgSessionDuration: number;
    daysActive: number;
    daysSinceFirstVisit: number;
    daysSinceLastVisit: number;
    visitFrequency: number;
    purchaseIntent: string;
  } | null;

  /** Contadores de eventos recentes (últimos 7 dias) */
  recentEvents: {
    pageViews: number;
    pricingViews: number;
    checkoutStarts: number;
    checkoutAbandons: number;
    formSubmits: number;
    whatsappClicks: number;
  };
}

/**
 * Resultado do scoring com breakdown explicável
 */
export interface ScoringResult {
  /** Score final (0-100) */
  score: number;

  /** Breakdown de cada regra aplicada */
  breakdown: Record<string, number>;

  /** Regras que foram aplicadas */
  appliedRules: string[];

  /** Versão do algoritmo */
  algorithm: string;
}
