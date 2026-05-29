import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { EventsService } from '../events/events.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CreateLeadDto, UpdateLeadDto, TrackEventDto, ListLeadsQueryDto, SortByDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);
  private readonly CACHE_TTL = 300; // 5 minutos
  private readonly ENRICHMENT_CACHE_TTL = 3600; // 1 hora
  private readonly STATS_CACHE_KEY = 'leads:stats';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @InjectQueue('lead-enrichment') private enrichmentQueue: Queue,
    private readonly eventsService: EventsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Lista leads com filtros e paginação
   */
  async findAll(query: ListLeadsQueryDto) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      source,
      minScore,
      maxScore,
      tag,
      sortBy = SortByDto.CREATED_AT,
      sortOrder = 'desc',
      hasInsights,
      hotOnly,
    } = query;

    const skip = (page - 1) * limit;

    // Construir filtros
    const where: Prisma.LeadWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    if (status) where.status = status;
    if (source) where.source = source;
    if (tag) where.tags = { has: tag };

    if (minScore !== undefined || maxScore !== undefined) {
      where.currentScore = {};
      if (minScore !== undefined) where.currentScore.gte = minScore;
      if (maxScore !== undefined) where.currentScore.lte = maxScore;
    }

    if (hotOnly) {
      where.currentScore = { gte: 70 };
    }

    if (hasInsights) {
      where.insights = {
        some: {
          dismissed: false,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      };
    }

    // Executar query
    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          enrichment: {
            select: {
              purchaseIntent: true,
              emailDisposable: true,
              primaryChannel: true,
            },
          },
          insights: {
            where: {
              dismissed: false,
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            orderBy: { priority: 'desc' },
            take: 3,
          },
          _count: {
            select: {
              events: true,
              insights: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      leads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca lead por ID com dados completos
   */
  async findById(id: string) {
    const cacheKey = `lead:${id}`;

    // Tentar cache primeiro
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) {
      this.logger.debug(`Lead ${id} from cache`);
      return cached;
    }

    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        enrichment: true,
        scores: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        insights: {
          where: {
            dismissed: false,
          },
          orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        history: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: {
          select: {
            events: true,
            insights: true,
            scores: true,
          },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException(`Lead ${id} não encontrado`);
    }

    // Cache por 5 minutos
    await this.redis.set(cacheKey, lead, this.CACHE_TTL);

    return lead;
  }

  /**
   * Busca lead por email
   */
  async findByEmail(email: string) {
    return this.prisma.lead.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        enrichment: true,
        _count: {
          select: { events: true, insights: true },
        },
      },
    });
  }

  /**
   * Cria novo lead e enfileira enriquecimento
   */
  async create(dto: CreateLeadDto) {
    const email = dto.email.toLowerCase();

    // Verificar se já existe
    const existing = await this.prisma.lead.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException(`Lead com email ${email} já existe`);
    }

    // Criar lead
    const lead = await this.prisma.lead.create({
      data: {
        ...dto,
        email,
        status: 'NEW',
        customFields: dto.customFields ? JSON.parse(JSON.stringify(dto.customFields)) : undefined,
      },
    });

    // Registrar no histórico
    await this.createHistory(lead.id, 'lead_created', null, null, null, {
      source: dto.source,
    });

    // Enfileirar enriquecimento
    await this.queueEnrichment(lead.id);
    await this.invalidateStatsCache();

    // Emit lead created event for CRM integrations
    this.eventEmitter.emit('crm.lead.created', {
      leadId: lead.id,
      source: dto.source,
    });

    this.logger.log(`Lead ${lead.id} criado e enfileirado para enriquecimento`);

    return lead;
  }

  /**
   * Cria ou atualiza lead (upsert) - útil para tracking
   */
  async upsert(dto: CreateLeadDto) {
    const email = dto.email.toLowerCase();

    const existing = await this.prisma.lead.findUnique({
      where: { email },
    });

    if (existing) {
      // Atualizar lastSeenAt e dados que podem ter mudado
      const updatedLead = await this.prisma.lead.update({
        where: { id: existing.id },
        data: {
          lastSeenAt: new Date(),
          // Só atualizar campos se vieram novos valores
          ...(dto.name && !existing.name && { name: dto.name }),
          ...(dto.phone && !existing.phone && { phone: dto.phone }),
          ...(dto.city && !existing.city && { city: dto.city }),
          ...(dto.state && !existing.state && { state: dto.state }),
        },
      });
      await this.invalidateStatsCache();
      return updatedLead;
    }

    return this.create(dto);
  }

  /**
   * Atualiza lead
   */
  async update(id: string, dto: UpdateLeadDto) {
    const existing = await this.prisma.lead.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Lead ${id} não encontrado`);
    }

    const previousStatus = existing.status;

    // Registrar mudança de status se houver
    if (dto.status && dto.status !== existing.status) {
      await this.createHistory(id, 'status_change', 'status', existing.status, dto.status);
    }

    const updated = await this.prisma.lead.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.status === 'CONVERTED' && { convertedAt: new Date() }),
        customFields: dto.customFields ? JSON.parse(JSON.stringify(dto.customFields)) : undefined,
      },
    });

    // Invalidar cache
    await this.redis.del(`lead:${id}`);
    await this.invalidateStatsCache();

    // Emit status change event for CRM integrations
    if (dto.status && dto.status !== previousStatus) {
      this.eventEmitter.emit('crm.lead.status_changed', {
        leadId: id,
        previousStatus,
        newStatus: dto.status,
      });

      // Emit converted event if status changed to CONVERTED
      if (dto.status === 'CONVERTED') {
        this.eventEmitter.emit('crm.lead.converted', {
          leadId: id,
          tutorId: existing.convertedToTutorId,
        });
      }
    }

    return updated;
  }

  /**
   * Remove lead
   */
  async remove(id: string) {
    const existing = await this.prisma.lead.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Lead ${id} não encontrado`);
    }

    await this.prisma.lead.delete({ where: { id } });
    await this.redis.del(`lead:${id}`);
    await this.invalidateStatsCache();

    return { message: 'Lead removido com sucesso' };
  }

  /**
   * Registra evento comportamental
   */
  async trackEvent(leadId: string, dto: TrackEventDto) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });

    if (!lead) {
      throw new NotFoundException(`Lead ${leadId} não encontrado`);
    }

    // Criar evento
    const event = await this.prisma.leadEvent.create({
      data: {
        leadId,
        eventType: dto.eventType,
        page: dto.page,
        sessionId: dto.sessionId,
        duration: dto.duration,
        device: dto.device || 'UNKNOWN',
        eventData: dto.eventData as any,
      },
    });

    // Atualizar flags comportamentais no lead
    const updateData: Prisma.LeadUpdateInput = {
      lastSeenAt: new Date(),
      lastActivityAt: new Date(),
    };

    if (dto.eventType === 'pricing_view') {
      updateData.visitedPricing = true;
    }

    if (dto.eventType === 'checkout_abandon') {
      updateData.abandonedCart = true;
    }

    // Verificar se retornou em menos de 24h
    const hoursSinceLastSeen = (Date.now() - lead.lastSeenAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastSeen > 0.5 && hoursSinceLastSeen < 24) {
      updateData.returnedWithin24h = true;
    }

    await this.prisma.lead.update({
      where: { id: leadId },
      data: updateData,
    });

    // Invalidar cache
    await this.redis.del(`lead:${leadId}`);

    // Reprocessar score/insights se evento importante
    const importantEvents = [
      'pricing_view',
      'checkout_start',
      'checkout_abandon',
      'checkout_complete',
      'form_submit',
      'whatsapp_click',
    ];

    if (importantEvents.includes(dto.eventType)) {
      await this.queueScoring(leadId);
    }

    this.logger.debug(`Evento ${dto.eventType} registrado para lead ${leadId}`);

    return event;
  }

  /**
   * Registra evento por email (sem precisar do ID)
   */
  async trackEventByEmail(email: string, dto: TrackEventDto) {
    const lead = await this.findByEmail(email);

    if (!lead) {
      throw new NotFoundException(`Lead com email ${email} não encontrado`);
    }

    return this.trackEvent(lead.id, dto);
  }

  /**
   * Busca eventos de um lead
   */
  async getEvents(leadId: string, limit?: number) {
    const take = limit && Number.isFinite(limit) ? limit : 100;
    return this.prisma.leadEvent.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  /**
   * Busca insights ativos de um lead
   */
  async getInsights(leadId: string) {
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
    return this.prisma.leadInsight.update({
      where: { id: insightId },
      data: {
        actedOn: true,
        actedOnAt: new Date(),
      },
    });
  }

  /**
   * Busca histórico de score
   */
  async getScoreHistory(leadId: string, limit?: number) {
    const take = limit && Number.isFinite(limit) ? limit : 30;
    return this.prisma.leadScore.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  /**
   * Estatísticas gerais dos leads
   */
  async getStats() {
    const cacheKey = this.STATS_CACHE_KEY;

    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    const [total, byStatus, bySource, avgScore, hotLeads, recentLeads, pendingInsights] =
      await Promise.all([
        this.prisma.lead.count(),
        this.prisma.lead.groupBy({
          by: ['status'],
          _count: { id: true },
        }),
        this.prisma.lead.groupBy({
          by: ['source'],
          _count: { id: true },
        }),
        this.prisma.lead.aggregate({
          _avg: { currentScore: true },
        }),
        this.prisma.lead.count({
          where: { currentScore: { gte: 70 } },
        }),
        this.prisma.lead.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
        this.prisma.leadInsight.count({
          where: {
            dismissed: false,
            actedOn: false,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        }),
      ]);

    const stats = {
      total,
      byStatus: byStatus.reduce((acc: Record<string, number>, curr: { status: string; _count: { id: number } }) => ({ ...acc, [curr.status]: curr._count.id }), {}),
      bySource: bySource.reduce((acc: Record<string, number>, curr: { source: string; _count: { id: number } }) => ({ ...acc, [curr.source]: curr._count.id }), {}),
      avgScore: Math.round(avgScore._avg.currentScore || 0),
      hotLeads,
      recentLeads,
      pendingInsights,
    };

    await this.redis.set(cacheKey, stats, 60); // Cache 1 minuto

    return stats;
  }

  /**
   * Enfileira job de enriquecimento
   */
  async queueEnrichment(leadId: string) {
    const cacheKey = `enrichment:queued:${leadId}`;

    // Verificar se já foi enfileirado recentemente
    const alreadyQueued = await this.redis.exists(cacheKey);
    if (alreadyQueued) {
      this.logger.debug(`Lead ${leadId} já está na fila de enriquecimento`);
      return;
    }

    await this.enrichmentQueue.add(
      'enrich-lead',
      { leadId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    // Marcar como enfileirado por 10 minutos
    await this.redis.set(cacheKey, true, 600);

    // Atualizar status
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { status: 'ENRICHING' },
    });
  }

  /**
   * Enfileira recálculo de score
   */
  async queueScoring(leadId: string) {
    await this.enrichmentQueue.add(
      'score-lead',
      { leadId },
      {
        attempts: 2,
        backoff: { type: 'fixed', delay: 2000 },
        removeOnComplete: true,
      },
    );
  }

  /**
   * Cria registro no histórico
   */
  private async createHistory(
    leadId: string,
    action: string,
    field?: string | null,
    oldValue?: string | null,
    newValue?: string | null,
    metadata?: Record<string, unknown>,
  ) {
    return this.prisma.leadHistory.create({
      data: {
        leadId,
        action,
        field,
        oldValue,
        newValue,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        triggeredBy: 'system',
      },
    });
  }

  private async invalidateStatsCache() {
    await this.redis.del(this.STATS_CACHE_KEY);
  }

  // === Qualificação (5 perguntas) ===
  async updateQualification(id: string, dto: any) {
    const updated = await this.prisma.lead.update({
      where: { id },
      data: { ...dto, lastActivityAt: new Date() },
    });

    // Recalcular score baseado em quantas respostas foram dadas
    const answered = [
      updated.qualSituacaoPet,
      updated.qualQueMaisIncomoda,
      updated.qualTentouOutroVet,
      updated.qualOQueMudaResolver,
      updated.qualQuemDecide,
    ].filter((v) => v && v.trim().length > 0).length;

    const newScore = Math.min(100, (updated.currentScore || 0) + answered * 10);

    if (newScore !== updated.currentScore) {
      await this.prisma.lead.update({
        where: { id },
        data: { currentScore: newScore, scoreUpdatedAt: new Date() },
      });
    }

    return { ...updated, currentScore: newScore };
  }

  // === Pipeline stage com automações ===
  // Aceita string e mapeia pro enum LeadStatus.
  // Automações:
  //   - Compareceu → vira Cliente (Tutor.classificacao=Cliente, status=CONVERTED)
  //   - Agendado → marca proximo follow-up
  async updatePipelineStage(id: string, stage: string) {
    const normalized = stage.toUpperCase().replace(/ /g, '_');

    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new Error('Lead not found');

    // Compareceu → convert
    if (normalized === 'COMPARECEU') {
      return this.convertToTutor(id);
    }

    // Agendado → marca FU em 2 dias
    if (normalized === 'AGENDADO') {
      const fu = new Date();
      fu.setDate(fu.getDate() + 2);
      return this.prisma.lead.update({
        where: { id },
        data: {
          status: 'AGUARDANDO_TRIAGEM' as any, // placeholder até definirmos todos
          lastActivityAt: new Date(),
        },
      });
    }

    return this.prisma.lead.update({
      where: { id },
      data: { lastActivityAt: new Date() },
    });
  }

  // === Conversão Lead → Tutor (Cliente) ===
  async convertToTutor(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new Error('Lead not found');

    // Buscar Tutor existente por email/phone
    let tutor = lead.email
      ? await this.prisma.tutor.findUnique({ where: { email: lead.email } })
      : null;

    if (!tutor && lead.phone) {
      const last8 = lead.phone.replace(/\D/g, '').slice(-8);
      const contact = await this.prisma.contact.findFirst({
        where: { number: { endsWith: last8 } },
        include: { tutor: true },
      });
      tutor = contact?.tutor || null;
    }

    if (tutor) {
      await this.prisma.tutor.update({
        where: { id: tutor.id },
        data: { classificacao: 'Cliente', status: 'ACTIVE' },
      });
    } else {
      tutor = await this.prisma.tutor.create({
        data: {
          name: lead.name || 'Lead convertido',
          email: lead.email,
          classificacao: 'Cliente',
          status: 'ACTIVE',
          tags: lead.tags || [],
          observations: lead.notes,
          convertedFromLeadId: lead.id,
          ...(lead.phone
            ? {
                contacts: {
                  create: [
                    {
                      number: lead.phone,
                      type: 'MOBILE',
                      isWhatsApp: true,
                      isPrimary: true,
                    },
                  ],
                },
              }
            : {}),
        },
      });
    }

    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: 'CONVERTED' as any,
        convertedAt: new Date(),
        convertedToTutorId: tutor.id,
      },
    });

    return { ok: true, tutorId: tutor.id, leadId: lead.id };
  }

}
