import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Serviço do Inbox Recepção.
 *
 * Espelha a tela "Inbox Recepção" do Base44: junta Leads em
 * triagem + Tutores com interação recente sem follow-up definido,
 * em UMA única lista temporal pra recepção atender o que importa
 * agora — sem Kanban (ver feedback-followup-sem-kanban).
 */
@Injectable()
export class InboxService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecepcaoInbox(params?: {
    period?: 'hoje' | 'semana' | 'mes' | 'tudo';
    tag?: string;
  }) {
    const since = this.periodToDate(params?.period || 'tudo');

    // 1) Leads em triagem ou novos (vindos do BotConversa, formulários, etc)
    const leads = await this.prisma.lead.findMany({
      where: {
        status: { in: ['AGUARDANDO_TRIAGEM', 'NEW'] as any },
        ...(since ? { lastSeenAt: { gte: since } } : {}),
        ...(params?.tag ? { tags: { has: params.tag } } : {}),
      },
      orderBy: { lastSeenAt: 'desc' },
      take: 200,
      include: {
        events: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // 2) Tutores com LeadEvent recente (últimas 48h) — proxy de
    //    "Tutor com interação recente sem follow-up definido"
    //    Até implementarmos o campo proximo_followup no Tutor,
    //    listamos tutores com mensagens recentes do BotConversa.
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 48);
    const recentEvents = await this.prisma.leadEvent.findMany({
      where: {
        createdAt: { gte: cutoff },
        eventType: 'whatsapp_message',
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { lead: true },
    });

    return {
      leads: leads.map((l) => ({
        kind: 'lead' as const,
        id: l.id,
        name: l.name || l.email || 'Sem nome',
        phone: l.phone,
        status: l.status,
        tags: l.tags || [],
        lastSeenAt: l.lastSeenAt,
        lastInteraction: l.events?.[0]?.eventData || null,
        source: l.sourceDetail || l.source,
      })),
      recentInteractions: recentEvents.map((e) => ({
        kind: 'interaction' as const,
        leadId: e.leadId,
        leadName: e.lead?.name || null,
        leadPhone: e.lead?.phone || null,
        eventType: e.eventType,
        eventData: e.eventData,
        createdAt: e.createdAt,
      })),
      counts: {
        triagem: leads.length,
        recentes: recentEvents.length,
      },
    };
  }

  private periodToDate(period: string): Date | null {
    const now = new Date();
    switch (period) {
      case 'hoje': {
        const d = new Date(now);
        d.setHours(0, 0, 0, 0);
        return d;
      }
      case 'semana': {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        return d;
      }
      case 'mes': {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        return d;
      }
      default:
        return null;
    }
  }
}
