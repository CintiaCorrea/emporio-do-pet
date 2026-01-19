/**
 * Interface para gerador de insight
 * Cada gerador produz um tipo específico de insight acionável
 */
export interface InsightGenerator {
  /** Tipo de insight gerado */
  type: InsightTypeEnum;

  /** Nome legível */
  name: string;

  /** Descrição do que este gerador faz */
  description: string;

  /** Avalia se deve gerar insight */
  evaluate: (context: InsightContext) => InsightEvaluation | null;
}

/**
 * Tipos de insight possíveis
 */
export enum InsightTypeEnum {
  HIGH_INTENT = 'HIGH_INTENT',
  REENGAGEMENT = 'REENGAGEMENT',
  CHURN_RISK = 'CHURN_RISK',
  COLD_LEAD = 'COLD_LEAD',
  HOT_LEAD = 'HOT_LEAD',
  SEND_WHATSAPP = 'SEND_WHATSAPP',
  SEND_EMAIL = 'SEND_EMAIL',
  OFFER_DISCOUNT = 'OFFER_DISCOUNT',
  NURTURE_CONTENT = 'NURTURE_CONTENT',
}

/**
 * Prioridade do insight
 */
export enum InsightPriorityEnum {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/**
 * Contexto para avaliação de insights
 */
export interface InsightContext {
  lead: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
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
    emailDisposable: boolean;
    purchaseIntent: string;
    preferredTimeSlot: string | null;
    daysSinceLastVisit: number;
    pricingPageViews: number;
    checkoutAbandons: number;
    totalSessions: number;
    avgSessionDuration: number;
    primaryChannel: string | null;
  } | null;

  /** Insights ativos existentes (para evitar duplicatas) */
  existingInsightTypes: string[];

  /** Score atual */
  currentScore: number;

  /** Contagem de eventos recentes */
  recentEvents: {
    pageViews: number;
    pricingViews: number;
    checkoutStarts: number;
    checkoutAbandons: number;
    whatsappClicks: number;
  };
}

/**
 * Resultado da avaliação de um gerador
 */
export interface InsightEvaluation {
  type: InsightTypeEnum;
  title: string;
  action: string;
  description: string;
  priority: InsightPriorityEnum;
  confidence: number; // 0-1
  rule: string;
  triggerData: Record<string, unknown>;
  expiresInHours?: number;
}
