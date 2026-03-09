export type LeadStatus = 'NEW' | 'ENRICHING' | 'ENRICHED' | 'QUALIFIED' | 'CONTACTED' | 'CONVERTED' | 'LOST';

export type LeadSource =
  | 'ORGANIC'
  | 'GOOGLE_ADS'
  | 'INSTAGRAM'
  | 'FACEBOOK'
  | 'TIKTOK'
  | 'REFERRAL'
  | 'LANDING_PAGE'
  | 'WHATSAPP'
  | 'EMAIL'
  | 'DIRECT'
  | 'OTHER';

export type DeviceType = 'DESKTOP' | 'MOBILE' | 'TABLET' | 'UNKNOWN';

export type InsightType =
  | 'HIGH_INTENT'
  | 'REENGAGEMENT'
  | 'CHURN_RISK'
  | 'COLD_LEAD'
  | 'HOT_LEAD'
  | 'SEND_WHATSAPP'
  | 'SEND_EMAIL'
  | 'OFFER_DISCOUNT'
  | 'NURTURE_CONTENT';

export type InsightPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Lead {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  source: LeadSource;
  sourceDetail: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  referrer: string | null;
  landingPage: string | null;
  device: DeviceType;
  userAgent: string | null;
  ip: string | null;
  city: string | null;
  state: string | null;
  country: string;
  status: LeadStatus;
  firstSeenAt: string;
  lastSeenAt: string;
  lastActivityAt: string | null;
  convertedAt: string | null;
  currentScore: number;
  scoreUpdatedAt: string | null;
  visitedPricing: boolean;
  abandonedCart: boolean;
  returnedWithin24h: boolean;
  tags: string[];
  customFields: Record<string, unknown> | null;
  notes: string | null;
  convertedToClientId: string | null;
  whatsappConversationId: string | null;
  events?: LeadEvent[];
  enrichment?: LeadEnrichment | null;
  scores?: LeadScore[];
  insights?: LeadInsight[];
  history?: LeadHistory[];
}

export interface LeadEvent {
  id: string;
  leadId: string;
  eventType: string;
  eventData: Record<string, unknown> | null;
  page: string | null;
  sessionId: string | null;
  duration: number | null;
  device: DeviceType;
  createdAt: string;
}

export interface LeadEnrichment {
  id: string;
  leadId: string;
  emailProvider: string | null;
  emailValid: boolean;
  emailDisposable: boolean;
  emailRisk: string | null;
  totalPageViews: number;
  uniquePages: number;
  pricingPageViews: number;
  checkoutStarts: number;
  checkoutAbandons: number;
  formSubmissions: number;
  totalSessions: number;
  avgSessionDuration: number;
  totalTimeOnSite: number;
  preferredTimeSlot: string | null;
  preferredDayOfWeek: string | null;
  mostActiveHour: number | null;
  daysActive: number;
  daysSinceFirstVisit: number;
  daysSinceLastVisit: number;
  visitFrequency: number;
  primaryChannel: string | null;
  purchaseIntent: string;
  rawData: Record<string, unknown> | null;
  enrichedAt: string;
  version: number;
}

export interface LeadScore {
  id: string;
  leadId: string;
  score: number;
  breakdown: Record<string, unknown>;
  version: number;
  algorithm: string;
  createdAt: string;
}

export interface LeadInsight {
  id: string;
  leadId: string;
  lead?: Lead;
  type: InsightType;
  action: string;
  title: string;
  description: string | null;
  priority: InsightPriority;
  confidence: number;
  rule: string;
  triggerData: Record<string, unknown> | null;
  dismissed: boolean;
  dismissedAt: string | null;
  actedOn: boolean;
  actedOnAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadHistory {
  id: string;
  leadId: string;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  metadata: Record<string, unknown> | null;
  triggeredBy: string | null;
  createdAt: string;
}

export interface CreateLeadData {
  email: string;
  name?: string;
  phone?: string;
  source?: LeadSource;
  sourceDetail?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  referrer?: string;
  landingPage?: string;
  tags?: string[];
  notes?: string;
  customFields?: Record<string, unknown>;
}

export interface UpdateLeadData extends Partial<CreateLeadData> {
  status?: LeadStatus;
}

export interface LeadFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: LeadStatus;
  source?: LeadSource;
  minScore?: number;
  maxScore?: number;
  tag?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'currentScore' | 'lastSeenAt' | 'name';
  sortOrder?: 'asc' | 'desc';
  hasInsights?: boolean;
  hotOnly?: boolean;
}

export interface ConvertLeadData {
  name?: string;
  companyName?: string;
  taxId?: string;
  address?: string;
  notes?: string;
  tags?: string[];
}

export interface CrmStats {
  leads: {
    total: number;
    new: number;
    qualified: number;
    converted: number;
    averageScore: number;
  };
  clients: {
    total: number;
    active: number;
    fromLeads: number;
    totalRevenue: number;
  };
  conversions: {
    rate: number;
    thisMonth: number;
    lastMonth: number;
  };
}

export interface LeadStats {
  total: number;
  byStatus: Record<LeadStatus, number>;
  bySource: Record<LeadSource, number>;
  averageScore: number;
  hotLeads: number;
}

export interface InsightStats {
  total: number;
  pending: number;
  dismissed: number;
  actedOn: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'Novo',
  ENRICHING: 'Enriquecendo',
  ENRICHED: 'Enriquecido',
  QUALIFIED: 'Qualificado',
  CONTACTED: 'Contactado',
  CONVERTED: 'Convertido',
  LOST: 'Perdido',
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  ORGANIC: 'Orgânico',
  GOOGLE_ADS: 'Google Ads',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  TIKTOK: 'TikTok',
  REFERRAL: 'Indicação',
  LANDING_PAGE: 'Landing Page',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'E-mail',
  DIRECT: 'Direto',
  OTHER: 'Outro',
};

export const INSIGHT_TYPE_LABELS: Record<InsightType, string> = {
  HIGH_INTENT: 'Alta Intenção',
  REENGAGEMENT: 'Reengajamento',
  CHURN_RISK: 'Risco de Churn',
  COLD_LEAD: 'Lead Frio',
  HOT_LEAD: 'Lead Quente',
  SEND_WHATSAPP: 'Enviar WhatsApp',
  SEND_EMAIL: 'Enviar E-mail',
  OFFER_DISCOUNT: 'Oferecer Desconto',
  NURTURE_CONTENT: 'Conteúdo Educativo',
};

export const INSIGHT_PRIORITY_LABELS: Record<InsightPriority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

export function getScoreColor(score: number): string {
  if (score >= 71) return 'text-red-600 bg-red-50 border-red-200';
  if (score >= 51) return 'text-orange-600 bg-orange-50 border-orange-200';
  if (score >= 31) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  return 'text-blue-600 bg-blue-50 border-blue-200';
}

export function getScoreLabel(score: number): string {
  if (score >= 71) return 'Muito Quente';
  if (score >= 51) return 'Quente';
  if (score >= 31) return 'Morno';
  return 'Frio';
}

export function getStatusColor(status: LeadStatus): string {
  const colors: Record<LeadStatus, string> = {
    NEW: 'text-blue-600 bg-blue-50 border-blue-200',
    ENRICHING: 'text-purple-600 bg-purple-50 border-purple-200',
    ENRICHED: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    QUALIFIED: 'text-green-600 bg-green-50 border-green-200',
    CONTACTED: 'text-amber-600 bg-amber-50 border-amber-200',
    CONVERTED: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    LOST: 'text-gray-600 bg-gray-50 border-gray-200',
  };
  return colors[status] || 'text-gray-600 bg-gray-50 border-gray-200';
}

export function getInsightPriorityColor(priority: InsightPriority): string {
  const colors: Record<InsightPriority, string> = {
    LOW: 'text-gray-600 bg-gray-50 border-gray-200',
    MEDIUM: 'text-blue-600 bg-blue-50 border-blue-200',
    HIGH: 'text-orange-600 bg-orange-50 border-orange-200',
    URGENT: 'text-red-600 bg-red-50 border-red-200',
  };
  return colors[priority] || 'text-gray-600 bg-gray-50 border-gray-200';
}
