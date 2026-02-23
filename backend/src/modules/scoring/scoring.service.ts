import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { scoringRules, ScoringContext, ScoringResult } from './rules';

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);
  private readonly ALGORITHM_VERSION = 'rules_v1';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Calcula score de um lead baseado em regras
   */
  async calculateScore(leadId: string): Promise<ScoringResult> {
    this.logger.debug(`Calculando score do lead ${leadId}`);

    // 1. Buscar dados do lead
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        enrichment: true,
      },
    });

    if (!lead) {
      throw new Error(`Lead ${leadId} não encontrado`);
    }

    // 2. Buscar eventos recentes (últimos 7 dias)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentEvents = await this.prisma.leadEvent.groupBy({
      by: ['eventType'],
      where: {
        leadId,
        createdAt: { gte: sevenDaysAgo },
      },
      _count: { id: true },
    });

    // 3. Montar contexto para avaliação
    const context: ScoringContext = {
      lead: {
        id: lead.id,
        email: lead.email,
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
            emailValid: lead.enrichment.emailValid,
            emailDisposable: lead.enrichment.emailDisposable,
            emailRisk: lead.enrichment.emailRisk,
            totalPageViews: lead.enrichment.totalPageViews,
            pricingPageViews: lead.enrichment.pricingPageViews,
            checkoutStarts: lead.enrichment.checkoutStarts,
            checkoutAbandons: lead.enrichment.checkoutAbandons,
            formSubmissions: lead.enrichment.formSubmissions,
            totalSessions: lead.enrichment.totalSessions,
            avgSessionDuration: lead.enrichment.avgSessionDuration,
            daysActive: lead.enrichment.daysActive,
            daysSinceFirstVisit: lead.enrichment.daysSinceFirstVisit,
            daysSinceLastVisit: lead.enrichment.daysSinceLastVisit,
            visitFrequency: lead.enrichment.visitFrequency,
            purchaseIntent: lead.enrichment.purchaseIntent,
          }
        : null,
      recentEvents: {
        pageViews: this.getEventCount(recentEvents, 'page_view'),
        pricingViews: this.getEventCount(recentEvents, 'pricing_view'),
        checkoutStarts: this.getEventCount(recentEvents, 'checkout_start'),
        checkoutAbandons: this.getEventCount(recentEvents, 'checkout_abandon'),
        formSubmits: this.getEventCount(recentEvents, 'form_submit'),
        whatsappClicks: this.getEventCount(recentEvents, 'whatsapp_click'),
      },
    };

    // 4. Avaliar cada regra
    const breakdown: Record<string, number> = {};
    const appliedRules: string[] = [];
    let totalScore = 0;

    for (const rule of scoringRules) {
      try {
        const applies = rule.evaluate(context);

        if (applies) {
          breakdown[rule.name] = rule.score;
          appliedRules.push(rule.name);
          totalScore += rule.score;

          this.logger.debug(
            `Regra ${rule.name} aplicada: ${rule.score > 0 ? '+' : ''}${rule.score}`,
          );
        }
      } catch (error) {
        this.logger.warn(`Erro ao avaliar regra ${rule.name}:`, error);
      }
    }

    // 5. Normalizar score para 0-100
    const finalScore = Math.max(0, Math.min(100, totalScore));

    const result: ScoringResult = {
      score: finalScore,
      breakdown,
      appliedRules,
      algorithm: this.ALGORITHM_VERSION,
    };

    // 6. Persistir score
    await this.persistScore(leadId, result);

    const previousScore = lead.currentScore;

    // 7. Atualizar score no lead (desnormalizado para queries rápidas)
    await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        currentScore: finalScore,
        scoreUpdatedAt: new Date(),
        // Atualizar status se score alto e ainda não qualificado
        ...(finalScore >= 70 && lead.status === 'ENRICHED' && { status: 'QUALIFIED' }),
      },
    });

    // 8. Invalidar cache
    await this.redis.del(`lead:${leadId}`);

    // 9. Emit score change event for CRM integrations
    if (previousScore !== finalScore) {
      this.eventEmitter.emit('crm.lead.score_changed', {
        leadId,
        previousScore,
        newScore: finalScore,
        scoreDelta: finalScore - previousScore,
      });
    }

    // Emit qualification event if lead became qualified
    if (finalScore >= 70 && lead.status === 'ENRICHED') {
      this.eventEmitter.emit('crm.lead.qualified', {
        leadId,
        score: finalScore,
      });
    }

    this.logger.log(
      `Lead ${leadId} score: ${finalScore} (${appliedRules.length} regras aplicadas)`,
    );

    return result;
  }

  /**
   * Busca score atual de um lead
   */
  async getCurrentScore(leadId: string): Promise<number> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: { currentScore: true },
    });

    return lead?.currentScore ?? 0;
  }

  /**
   * Busca histórico de scores
   */
  async getScoreHistory(leadId: string, limit = 30) {
    return this.prisma.leadScore.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Busca último score com breakdown
   */
  async getLastScoreWithBreakdown(leadId: string) {
    const score = await this.prisma.leadScore.findFirst({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });

    if (!score) return null;

    // Adicionar descrições das regras
    const breakdownWithDescriptions = Object.entries(score.breakdown as Record<string, number>).map(
      ([ruleName, points]) => {
        const rule = scoringRules.find((r) => r.name === ruleName);
        return {
          rule: ruleName,
          description: rule?.description ?? 'Regra desconhecida',
          category: rule?.category ?? 'unknown',
          points,
        };
      },
    );

    return {
      score: score.score,
      breakdown: breakdownWithDescriptions,
      algorithm: score.algorithm,
      createdAt: score.createdAt,
    };
  }

  /**
   * Explica o score de um lead em linguagem natural
   */
  async explainScore(leadId: string): Promise<string> {
    const scoreData = await this.getLastScoreWithBreakdown(leadId);

    if (!scoreData) {
      return 'Lead ainda não foi pontuado.';
    }

    const positive = scoreData.breakdown.filter((b) => b.points > 0);
    const negative = scoreData.breakdown.filter((b) => b.points < 0);

    let explanation = `**Score: ${scoreData.score}/100**\n\n`;

    if (positive.length > 0) {
      explanation += '✅ **Pontos positivos:**\n';
      positive
        .sort((a, b) => b.points - a.points)
        .forEach((b) => {
          explanation += `- ${b.description} (+${b.points})\n`;
        });
    }

    if (negative.length > 0) {
      explanation += '\n⚠️ **Pontos negativos:**\n';
      negative
        .sort((a, b) => a.points - b.points)
        .forEach((b) => {
          explanation += `- ${b.description} (${b.points})\n`;
        });
    }

    // Adicionar classificação
    if (scoreData.score >= 70) {
      explanation += '\n🔥 **Classificação: Lead muito quente** - Ação urgente recomendada';
    } else if (scoreData.score >= 50) {
      explanation += '\n🌡️ **Classificação: Lead quente** - Bom momento para abordagem';
    } else if (scoreData.score >= 30) {
      explanation += '\n☁️ **Classificação: Lead morno** - Nutrir com conteúdo';
    } else {
      explanation += '\n❄️ **Classificação: Lead frio** - Continuar nutrição';
    }

    return explanation;
  }

  /**
   * Persiste score no banco
   */
  private async persistScore(leadId: string, result: ScoringResult): Promise<void> {
    // Buscar versão anterior
    const lastScore = await this.prisma.leadScore.findFirst({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });

    const version = lastScore ? lastScore.version + 1 : 1;

    await this.prisma.leadScore.create({
      data: {
        leadId,
        score: result.score,
        breakdown: JSON.parse(JSON.stringify(result.breakdown)),
        algorithm: result.algorithm,
        version,
      },
    });

    // Registrar mudança significativa no histórico
    if (lastScore && Math.abs(result.score - lastScore.score) >= 10) {
      await this.prisma.leadHistory.create({
        data: {
          leadId,
          action: 'score_change',
          field: 'currentScore',
          oldValue: String(lastScore.score),
          newValue: String(result.score),
          metadata: JSON.parse(
            JSON.stringify({
              change: result.score - lastScore.score,
              appliedRules: result.appliedRules,
            }),
          ),
          triggeredBy: 'system',
        },
      });
    }
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

  /**
   * Recalcula scores de todos os leads (batch)
   * Use com cuidado - operação pesada
   */
  async recalculateAllScores(batchSize = 100): Promise<number> {
    let processed = 0;
    let skip = 0;

    while (true) {
      const leads = await this.prisma.lead.findMany({
        where: {
          status: { in: ['ENRICHED', 'QUALIFIED'] },
        },
        select: { id: true },
        skip,
        take: batchSize,
      });

      if (leads.length === 0) break;

      for (const lead of leads) {
        try {
          await this.calculateScore(lead.id);
          processed++;
        } catch (error) {
          this.logger.error(`Erro ao recalcular score do lead ${lead.id}:`, error);
        }
      }

      skip += batchSize;
      this.logger.log(`Recalculados ${processed} scores...`);
    }

    return processed;
  }
}
