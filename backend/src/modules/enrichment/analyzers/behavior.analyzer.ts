import { Injectable, Logger } from '@nestjs/common';

export interface BehaviorAnalysis {
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
  purchaseIntent: 'low' | 'medium' | 'high' | 'very_high';
}

export interface LeadEvent {
  eventType: string;
  page?: string;
  sessionId?: string;
  duration?: number;
  createdAt: Date;
  eventData?: Record<string, unknown>;
}

@Injectable()
export class BehaviorAnalyzer {
  private readonly logger = new Logger(BehaviorAnalyzer.name);

  // Páginas que indicam intenção de compra
  private readonly highIntentPages = [
    '/preco',
    '/precos',
    '/pricing',
    '/planos',
    '/checkout',
    '/carrinho',
    '/cart',
    '/comprar',
    '/buy',
    '/assinar',
    '/subscribe',
    '/orcamento',
    '/quote',
  ];

  // Eventos que indicam alta intenção
  private readonly highIntentEvents = [
    'pricing_view',
    'checkout_start',
    'add_to_cart',
    'form_submit',
    'whatsapp_click',
    'contact_click',
  ];

  /**
   * Analisa comportamento baseado em eventos
   */
  analyze(
    events: LeadEvent[],
    leadSource: string,
    firstSeenAt: Date,
    lastSeenAt: Date,
  ): BehaviorAnalysis {
    if (events.length === 0) {
      return this.getEmptyAnalysis();
    }

    // Agrupar eventos por tipo
    const eventsByType = this.groupByEventType(events);

    // Agrupar por sessão
    const sessions = this.groupBySessions(events);

    // Agrupar por hora/dia
    const timeAnalysis = this.analyzeTimePatterns(events);

    // Calcular métricas básicas
    const totalPageViews = eventsByType['page_view']?.length || 0;
    const uniquePages = this.countUniquePages(events);
    const pricingPageViews =
      (eventsByType['pricing_view']?.length || 0) + this.countHighIntentPageViews(events);
    const checkoutStarts = eventsByType['checkout_start']?.length || 0;
    const checkoutAbandons = eventsByType['checkout_abandon']?.length || 0;
    const formSubmissions = eventsByType['form_submit']?.length || 0;

    // Métricas de sessão
    const totalSessions = sessions.size || 1;
    const avgSessionDuration = this.calculateAvgSessionDuration(events);
    const totalTimeOnSite = this.calculateTotalTime(events);

    // Métricas temporais
    const now = new Date();
    const daysActive = this.countDaysActive(events);
    const daysSinceFirstVisit = Math.floor(
      (now.getTime() - firstSeenAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysSinceLastVisit = Math.floor(
      (now.getTime() - lastSeenAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    const visitFrequency = daysSinceFirstVisit > 0 ? totalSessions / daysSinceFirstVisit : 1;

    // Canal primário
    const primaryChannel = this.inferPrimaryChannel(leadSource, events);

    // Intenção de compra
    const purchaseIntent = this.calculatePurchaseIntent({
      pricingPageViews,
      checkoutStarts,
      checkoutAbandons,
      formSubmissions,
      totalPageViews,
      totalSessions,
      avgSessionDuration,
      events,
    });

    return {
      totalPageViews,
      uniquePages,
      pricingPageViews,
      checkoutStarts,
      checkoutAbandons,
      formSubmissions,
      totalSessions,
      avgSessionDuration: Math.round(avgSessionDuration),
      totalTimeOnSite: Math.round(totalTimeOnSite),
      preferredTimeSlot: timeAnalysis.preferredTimeSlot,
      preferredDayOfWeek: timeAnalysis.preferredDayOfWeek,
      mostActiveHour: timeAnalysis.mostActiveHour,
      daysActive,
      daysSinceFirstVisit,
      daysSinceLastVisit,
      visitFrequency: Math.round(visitFrequency * 100) / 100,
      primaryChannel,
      purchaseIntent,
    };
  }

  /**
   * Retorna análise vazia
   */
  private getEmptyAnalysis(): BehaviorAnalysis {
    return {
      totalPageViews: 0,
      uniquePages: 0,
      pricingPageViews: 0,
      checkoutStarts: 0,
      checkoutAbandons: 0,
      formSubmissions: 0,
      totalSessions: 0,
      avgSessionDuration: 0,
      totalTimeOnSite: 0,
      preferredTimeSlot: null,
      preferredDayOfWeek: null,
      mostActiveHour: null,
      daysActive: 0,
      daysSinceFirstVisit: 0,
      daysSinceLastVisit: 0,
      visitFrequency: 0,
      primaryChannel: null,
      purchaseIntent: 'low',
    };
  }

  /**
   * Agrupa eventos por tipo
   */
  private groupByEventType(events: LeadEvent[]): Record<string, LeadEvent[]> {
    return events.reduce(
      (acc, event) => {
        if (!acc[event.eventType]) {
          acc[event.eventType] = [];
        }
        acc[event.eventType].push(event);
        return acc;
      },
      {} as Record<string, LeadEvent[]>,
    );
  }

  /**
   * Agrupa eventos por sessão
   */
  private groupBySessions(events: LeadEvent[]): Map<string, LeadEvent[]> {
    const sessions = new Map<string, LeadEvent[]>();

    for (const event of events) {
      const sessionId = event.sessionId || 'unknown';
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, []);
      }
      sessions.get(sessionId)!.push(event);
    }

    return sessions;
  }

  /**
   * Conta páginas únicas visitadas
   */
  private countUniquePages(events: LeadEvent[]): number {
    const pages = new Set(events.filter((e) => e.page).map((e) => e.page));
    return pages.size;
  }

  /**
   * Conta visualizações de páginas de alta intenção
   */
  private countHighIntentPageViews(events: LeadEvent[]): number {
    return events.filter((event) => {
      if (!event.page) return false;
      const pageLower = event.page.toLowerCase();
      return this.highIntentPages.some((p) => pageLower.includes(p));
    }).length;
  }

  /**
   * Calcula duração média de sessão
   */
  private calculateAvgSessionDuration(events: LeadEvent[]): number {
    const durations = events.filter((e) => e.duration && e.duration > 0).map((e) => e.duration!);

    if (durations.length === 0) return 0;

    return durations.reduce((sum, d) => sum + d, 0) / durations.length;
  }

  /**
   * Calcula tempo total no site
   */
  private calculateTotalTime(events: LeadEvent[]): number {
    return events
      .filter((e) => e.duration && e.duration > 0)
      .reduce((sum, e) => sum + e.duration!, 0);
  }

  /**
   * Analisa padrões temporais
   */
  private analyzeTimePatterns(events: LeadEvent[]): {
    preferredTimeSlot: string | null;
    preferredDayOfWeek: string | null;
    mostActiveHour: number | null;
  } {
    if (events.length === 0) {
      return {
        preferredTimeSlot: null,
        preferredDayOfWeek: null,
        mostActiveHour: null,
      };
    }

    // Contar eventos por hora
    const hourCounts: Record<number, number> = {};
    const dayOfWeekCounts: Record<number, number> = {};
    const timeSlotCounts: Record<string, number> = {
      morning: 0, // 6-12
      afternoon: 0, // 12-18
      evening: 0, // 18-22
      night: 0, // 22-6
    };

    for (const event of events) {
      const date = new Date(event.createdAt);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();

      // Contar por hora
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;

      // Contar por dia da semana
      dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1;

      // Contar por período
      if (hour >= 6 && hour < 12) {
        timeSlotCounts['morning']++;
      } else if (hour >= 12 && hour < 18) {
        timeSlotCounts['afternoon']++;
      } else if (hour >= 18 && hour < 22) {
        timeSlotCounts['evening']++;
      } else {
        timeSlotCounts['night']++;
      }
    }

    // Encontrar hora mais ativa
    const mostActiveHour = Object.entries(hourCounts).reduce(
      (max, [hour, count]) => (count > max.count ? { hour: Number(hour), count } : max),
      { hour: 0, count: 0 },
    ).hour;

    // Encontrar período preferido
    const preferredTimeSlot = Object.entries(timeSlotCounts).reduce(
      (max, [slot, count]) => (count > max.count ? { slot, count } : max),
      { slot: 'afternoon', count: 0 },
    ).slot;

    // Encontrar dia da semana preferido
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const preferredDayIndex = Object.entries(dayOfWeekCounts).reduce(
      (max, [day, count]) => (count > max.count ? { day: Number(day), count } : max),
      { day: 0, count: 0 },
    ).day;

    return {
      preferredTimeSlot,
      preferredDayOfWeek: dayNames[preferredDayIndex],
      mostActiveHour,
    };
  }

  /**
   * Conta dias ativos (dias com pelo menos um evento)
   */
  private countDaysActive(events: LeadEvent[]): number {
    const days = new Set(events.map((e) => new Date(e.createdAt).toISOString().split('T')[0]));
    return days.size;
  }

  /**
   * Infere canal primário baseado na origem e comportamento
   */
  private inferPrimaryChannel(leadSource: string, events: LeadEvent[]): string | null {
    // Mapear source para canal
    const sourceToChannel: Record<string, string> = {
      GOOGLE_ADS: 'google',
      INSTAGRAM: 'instagram',
      FACEBOOK: 'facebook',
      TIKTOK: 'tiktok',
      WHATSAPP: 'whatsapp',
      EMAIL: 'email',
      ORGANIC: 'organic',
      DIRECT: 'direct',
      REFERRAL: 'referral',
      LANDING_PAGE: 'landing_page',
    };

    return sourceToChannel[leadSource] || 'other';
  }

  /**
   * Calcula intenção de compra baseada em comportamento
   */
  private calculatePurchaseIntent(params: {
    pricingPageViews: number;
    checkoutStarts: number;
    checkoutAbandons: number;
    formSubmissions: number;
    totalPageViews: number;
    totalSessions: number;
    avgSessionDuration: number;
    events: LeadEvent[];
  }): 'low' | 'medium' | 'high' | 'very_high' {
    let score = 0;

    // Visualização de preços (forte sinal)
    if (params.pricingPageViews > 0) score += 30;
    if (params.pricingPageViews >= 3) score += 15;

    // Início de checkout (muito forte)
    if (params.checkoutStarts > 0) score += 40;

    // Abandono de carrinho (oportunidade)
    if (params.checkoutAbandons > 0) score += 20;

    // Submissão de formulário
    if (params.formSubmissions > 0) score += 25;

    // Engajamento geral
    if (params.totalPageViews >= 5) score += 10;
    if (params.totalSessions >= 3) score += 10;
    if (params.avgSessionDuration >= 60) score += 10; // Mais de 1 minuto

    // Eventos de alta intenção
    const highIntentEventsCount = params.events.filter((e) =>
      this.highIntentEvents.includes(e.eventType),
    ).length;
    if (highIntentEventsCount >= 2) score += 15;

    // Mapear score para intenção
    if (score >= 80) return 'very_high';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }
}
