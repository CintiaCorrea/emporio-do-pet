import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { EmailAnalyzer } from './analyzers/email.analyzer';
import { BehaviorAnalyzer } from './analyzers/behavior.analyzer';

@Injectable()
export class EnrichmentService {
  private readonly logger = new Logger(EnrichmentService.name);
  private readonly CACHE_TTL = 3600; // 1 hora

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly emailAnalyzer: EmailAnalyzer,
    private readonly behaviorAnalyzer: BehaviorAnalyzer,
  ) {}

  /**
   * Enriquece um lead com análise de email e comportamento
   * Este método é idempotente - pode ser chamado múltiplas vezes
   */
  async enrichLead(leadId: string): Promise<void> {
    this.logger.log(`Iniciando enriquecimento do lead ${leadId}`);

    // Buscar lead com eventos
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        events: {
          orderBy: { createdAt: 'desc' },
        },
        enrichment: true,
      },
    });

    if (!lead) {
      this.logger.warn(`Lead ${leadId} não encontrado para enriquecimento`);
      return;
    }

    // Verificar se precisa enriquecer (cache)
    const cacheKey = `enrichment:${leadId}`;
    const cached = await this.redis.get<{ enrichedAt: string }>(cacheKey);

    if (cached) {
      const enrichedAt = new Date(cached.enrichedAt);
      const hoursSinceEnrichment = (Date.now() - enrichedAt.getTime()) / (1000 * 60 * 60);

      // Se foi enriquecido há menos de 1 hora, pular
      if (hoursSinceEnrichment < 1) {
        this.logger.debug(`Lead ${leadId} foi enriquecido recentemente, pulando`);
        return;
      }
    }

    try {
      // 1. Análise de Email
      const emailAnalysis = this.emailAnalyzer.analyze(lead.email);

      // 2. Análise de Comportamento
      const behaviorAnalysis = this.behaviorAnalyzer.analyze(
        lead.events.map((e: any) => ({
          eventType: e.eventType,
          page: e.page || undefined,
          sessionId: e.sessionId || undefined,
          duration: e.duration || undefined,
          createdAt: e.createdAt,
          eventData: e.eventData as Record<string, unknown> | undefined,
        })),
        lead.source,
        lead.firstSeenAt,
        lead.lastSeenAt,
      );

      // 3. Preparar dados de enriquecimento
      const enrichmentData = {
        // Email
        emailProvider: emailAnalysis.provider,
        emailValid: emailAnalysis.isValid,
        emailDisposable: emailAnalysis.isDisposable,
        emailRisk: emailAnalysis.risk,

        // Comportamento
        totalPageViews: behaviorAnalysis.totalPageViews,
        uniquePages: behaviorAnalysis.uniquePages,
        pricingPageViews: behaviorAnalysis.pricingPageViews,
        checkoutStarts: behaviorAnalysis.checkoutStarts,
        checkoutAbandons: behaviorAnalysis.checkoutAbandons,
        formSubmissions: behaviorAnalysis.formSubmissions,
        totalSessions: behaviorAnalysis.totalSessions,
        avgSessionDuration: behaviorAnalysis.avgSessionDuration,
        totalTimeOnSite: behaviorAnalysis.totalTimeOnSite,

        // Padrões temporais
        preferredTimeSlot: behaviorAnalysis.preferredTimeSlot,
        preferredDayOfWeek: behaviorAnalysis.preferredDayOfWeek,
        mostActiveHour: behaviorAnalysis.mostActiveHour,

        // Engajamento
        daysActive: behaviorAnalysis.daysActive,
        daysSinceFirstVisit: behaviorAnalysis.daysSinceFirstVisit,
        daysSinceLastVisit: behaviorAnalysis.daysSinceLastVisit,
        visitFrequency: behaviorAnalysis.visitFrequency,

        // Canal e intenção
        primaryChannel: behaviorAnalysis.primaryChannel,
        purchaseIntent: behaviorAnalysis.purchaseIntent,

        // Metadata
        enrichedAt: new Date(),
        version: lead.enrichment ? lead.enrichment.version + 1 : 1,
        rawData: JSON.parse(
          JSON.stringify({
            emailAnalysis,
            behaviorAnalysis,
            analyzedAt: new Date().toISOString(),
          }),
        ),
      };

      // 4. Upsert enrichment
      await this.prisma.leadEnrichment.upsert({
        where: { leadId },
        create: {
          leadId,
          ...enrichmentData,
        },
        update: enrichmentData,
      });

      // 5. Atualizar status do lead
      await this.prisma.lead.update({
        where: { id: leadId },
        data: {
          status: 'ENRICHED',
        },
      });

      // 6. Registrar no histórico
      await this.prisma.leadHistory.create({
        data: {
          leadId,
          action: 'enrichment_complete',
          metadata: JSON.parse(
            JSON.stringify({
              version: enrichmentData.version,
              purchaseIntent: enrichmentData.purchaseIntent,
              emailRisk: enrichmentData.emailRisk,
            }),
          ),
          triggeredBy: 'worker',
        },
      });

      // 7. Atualizar cache
      await this.redis.set(cacheKey, { enrichedAt: new Date().toISOString() }, this.CACHE_TTL);

      // 8. Invalidar cache do lead
      await this.redis.del(`lead:${leadId}`);

      this.logger.log(
        `Lead ${leadId} enriquecido com sucesso (intent: ${enrichmentData.purchaseIntent})`,
      );
    } catch (error) {
      this.logger.error(`Erro ao enriquecer lead ${leadId}:`, error);
      throw error;
    }
  }

  /**
   * Busca dados de enriquecimento de um lead
   */
  async getEnrichment(leadId: string) {
    return this.prisma.leadEnrichment.findUnique({
      where: { leadId },
    });
  }

  /**
   * Força re-enriquecimento (limpa cache)
   */
  async forceEnrichment(leadId: string): Promise<void> {
    await this.redis.del(`enrichment:${leadId}`);
    await this.enrichLead(leadId);
  }
}
