import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  insightGenerators,
  InsightContext,
  InsightEvaluation,
  InsightPriorityEnum,
} from './generators';

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Gera insights para um lead baseado em suas características e comportamento
   */
  async generateInsights(leadId: string): Promise<number> {
    this.logger.debug(`Gerando insights para lead ${leadId}`);

    // 1. Buscar dados do lead
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        enrichment: true,
        insights: {
          where: {
            dismissed: false,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        },
      },
    });

    if (!lead) {
      this.logger.warn(`Lead ${leadId} não encontrado`);
      return 0;
    }

    // 2. Buscar eventos recentes
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentEvents = await this.prisma.leadEvent.groupBy({
      by: ['eventType'],
      where: {
        leadId,
        createdAt: { gte: sevenDaysAgo },
      },
      _count: { id: true },
    });

    // 3. Montar contexto
    const context: InsightContext = {
      lead: {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        status: lead.status,
        currentScore: lead.currentScore,
        visitedPricing: lead.visitedPricing,
        abandonedCart: lead.abandonedCart,
        returnedWithin24h: lead.returnedWithin24h,
        firstSeenAt: lead.firstSeenAt,
        lastSeenAt: lead.lastSeenAt,
        lastActivityAt: lead.lastActivityAt,
        tags: lead.tags,
      },
      enrichment: lead.enrichment
        ? {
            emailDisposable: lead.enrichment.emailDisposable,
            purchaseIntent: lead.enrichment.purchaseIntent,
            preferredTimeSlot: lead.enrichment.preferredTimeSlot,
            daysSinceLastVisit: lead.enrichment.daysSinceLastVisit,
            pricingPageViews: lead.enrichment.pricingPageViews,
            checkoutAbandons: lead.enrichment.checkoutAbandons,
            totalSessions: lead.enrichment.totalSessions,
            avgSessionDuration: lead.enrichment.avgSessionDuration,
            primaryChannel: lead.enrichment.primaryChannel,
          }
        : null,
      existingInsightTypes: lead.insights.map((i: { type: string }) => i.type),
      currentScore: lead.currentScore,
      recentEvents: {
        pageViews: this.getEventCount(recentEvents, 'page_view'),
        pricingViews: this.getEventCount(recentEvents, 'pricing_view'),
        checkoutStarts: this.getEventCount(recentEvents, 'checkout_start'),
        checkoutAbandons: this.getEventCount(recentEvents, 'checkout_abandon'),
        whatsappClicks: this.getEventCount(recentEvents, 'whatsapp_click'),
      },
    };

    // 4. Avaliar cada gerador
    const newInsights: InsightEvaluation[] = [];

    for (const generator of insightGenerators) {
      try {
        const result = generator.evaluate(context);

        if (result) {
          newInsights.push(result);
          this.logger.debug(`Insight gerado: ${result.type} - ${result.title}`);
        }
      } catch (error) {
        this.logger.warn(`Erro ao avaliar gerador ${generator.name}:`, error);
      }
    }

    // 5. Persistir novos insights
    let created = 0;

    for (const insight of newInsights) {
      try {
        await this.prisma.leadInsight.create({
          data: {
            leadId,
            type: insight.type,
            title: insight.title,
            action: insight.action,
            description: insight.description,
            priority: insight.priority,
            confidence: insight.confidence,
            rule: insight.rule,
            triggerData: JSON.parse(JSON.stringify(insight.triggerData)),
            expiresAt: insight.expiresInHours
              ? new Date(Date.now() + insight.expiresInHours * 60 * 60 * 1000)
              : null,
          },
        });

        created++;

        // Registrar no histórico se insight urgente
        if (
          insight.priority === InsightPriorityEnum.URGENT ||
          insight.priority === InsightPriorityEnum.HIGH
        ) {
          await this.prisma.leadHistory.create({
            data: {
              leadId,
              action: 'insight_generated',
              metadata: JSON.parse(
                JSON.stringify({
                  type: insight.type,
                  priority: insight.priority,
                  title: insight.title,
                }),
              ),
              triggeredBy: 'system',
            },
          });
        }
      } catch (error) {
        // Pode ser duplicata ou outro erro - log e continua
        this.logger.warn(`Erro ao criar insight ${insight.type}:`, error);
      }
    }

    // 6. Invalidar cache
    await this.redis.del(`lead:${leadId}`);

    this.logger.log(`${created} insights gerados para lead ${leadId}`);

    return created;
  }

  /**
   * Busca insights ativos de um lead
   */
  async getActiveInsights(leadId: string) {
    return this.prisma.leadInsight.findMany({
      where: {
        leadId,
        dismissed: false,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Busca todos os insights pendentes de ação
   */
  async getPendingInsights(limit = 50) {
    return this.prisma.leadInsight.findMany({
      where: {
        dismissed: false,
        actedOn: false,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            currentScore: true,
            source: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
  }

  /**
   * Busca insights por prioridade
   */
  async getInsightsByPriority(priority: InsightPriorityEnum, limit = 50) {
    return this.prisma.leadInsight.findMany({
      where: {
        priority,
        dismissed: false,
        actedOn: false,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            currentScore: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Busca insights urgentes
   */
  async getUrgentInsights(limit = 20) {
    return this.getInsightsByPriority(InsightPriorityEnum.URGENT, limit);
  }

  /**
   * Dismissar insight
   */
  async dismissInsight(insightId: string) {
    return this.prisma.leadInsight.update({
      where: { id: insightId },
      data: {
        dismissed: true,
        dismissedAt: new Date(),
      },
    });
  }

  /**
   * Marcar insight como acionado
   */
  async actOnInsight(insightId: string) {
    const insight = await this.prisma.leadInsight.update({
      where: { id: insightId },
      data: {
        actedOn: true,
        actedOnAt: new Date(),
      },
    });

    // Registrar no histórico
    await this.prisma.leadHistory.create({
      data: {
        leadId: insight.leadId,
        action: 'insight_acted',
        metadata: JSON.parse(
          JSON.stringify({
            insightId,
            type: insight.type,
          }),
        ),
        triggeredBy: 'user',
      },
    });

    return insight;
  }

  /**
   * Estatísticas de insights
   */
  async getInsightStats() {
    const cacheKey = 'insights:stats';

    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    const [total, byPriority, byType, pending, actedOn, dismissed] = await Promise.all([
      this.prisma.leadInsight.count(),
      this.prisma.leadInsight.groupBy({
        by: ['priority'],
        where: {
          dismissed: false,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        _count: { id: true },
      }),
      this.prisma.leadInsight.groupBy({
        by: ['type'],
        where: {
          dismissed: false,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        _count: { id: true },
      }),
      this.prisma.leadInsight.count({
        where: {
          dismissed: false,
          actedOn: false,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      }),
      this.prisma.leadInsight.count({ where: { actedOn: true } }),
      this.prisma.leadInsight.count({ where: { dismissed: true } }),
    ]);

    const stats = {
      total,
      pending,
      actedOn,
      dismissed,
      byPriority: byPriority.reduce(
        (acc: Record<string, number>, curr: { priority: string; _count: { id: number } }) => ({ ...acc, [curr.priority]: curr._count.id }),
        {},
      ),
      byType: byType.reduce((acc: Record<string, number>, curr: { type: string; _count: { id: number } }) => ({ ...acc, [curr.type]: curr._count.id }), {}),
    };

    await this.redis.set(cacheKey, stats, 60); // Cache 1 minuto

    return stats;
  }

  /**
   * Limpa insights expirados
   */
  async cleanupExpiredInsights(): Promise<number> {
    const result = await this.prisma.leadInsight.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        dismissed: false,
      },
      data: {
        dismissed: true,
        dismissedAt: new Date(),
      },
    });

    this.logger.log(`${result.count} insights expirados limpos`);
    return result.count;
  }

  /**
   * Regenera insights para um lead (limpa e recria)
   */
  async regenerateInsights(leadId: string): Promise<number> {
    // Dismissar insights ativos
    await this.prisma.leadInsight.updateMany({
      where: {
        leadId,
        dismissed: false,
      },
      data: {
        dismissed: true,
        dismissedAt: new Date(),
      },
    });

    // Gerar novos
    return this.generateInsights(leadId);
  }

  /**
   * Helper para extrair contagem de eventos
   */
  private getEventCount(
    events: Array<{ eventType: string; _count: { id: number } }>,
    eventType: string,
  ): number {
    const event = events.find((e) => e.eventType === eventType);
    return event?._count.id ?? 0;
  }
}
