import { Injectable, Logger } from '@nestjs/common';
import { LeadSource, LeadStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BotconversaPayload } from './dto/botconversa-payload.dto';

/**
 * Processa eventos do BotConversa.
 *
 * Regras (espelham botconversaLeadCapture do Base44):
 *  - Idempotência por telefone (last 8 dígitos).
 *  - Tag "Cliente" ou "FU-cliente" (case-insensitive) → upsert em Tutor.
 *  - Caso contrário, upsert em Lead.
 *  - Cria Interacao canal "WhatsApp BC" para alimentar Caixa de Entrada.
 *  - Tags do BotConversa preservadas.
 *  - LeadEvent registra rastro adicional.
 */
@Injectable()
export class BotconversaWebhookService {
  private readonly logger = new Logger(BotconversaWebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  private resolvePhone(payload: BotconversaPayload): string | null {
    return (
      payload.full_phone ||
      payload.phone ||
      payload['Telefone'] ||
      payload['telefone'] ||
      null
    );
  }

  private resolveName(payload: BotconversaPayload): string | undefined {
    return (
      payload.nome_completo ||
      payload['name'] ||
      payload['Nome'] ||
      payload['nome'] ||
      undefined
    );
  }

  private resolveTags(payload: BotconversaPayload): string[] {
    const raw = payload['tags'] || payload['Tags'] || [];
    if (Array.isArray(raw)) return raw.filter((t) => typeof t === 'string');
    if (typeof raw === 'string') {
      return raw.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }

  private last8(phone: string): string {
    return (phone || '').replace(/\D/g, '').slice(-8);
  }

  /**
   * Detecta cliente por tags (case-insensitive: "Cliente", "FU-cliente")
   * OU pelo tipo_contato vindo do poll.
   */
  private isClienteContact(tags: string[], payload: BotconversaPayload): boolean {
    if ((payload as any).tipo_contato === 'cliente') return true;
    return tags.some((t) => /^(fu-)?cliente$/i.test(t));
  }

  /**
   * Detecta se o payload representa uma mensagem do BotConversa (espelhamento).
   * Aceita várias chaves possíveis (BotConversa varia por flow).
   */
  private extractMessageContent(payload: BotconversaPayload): { content: string; direction: 'INBOUND' | 'OUTBOUND' } | null {
    const content =
      payload.message ||
      payload.Message ||
      payload.mensagem ||
      payload.Mensagem ||
      payload.Conteudo ||
      payload.conteudo ||
      payload.text ||
      payload.body ||
      null;
    if (!content || typeof content !== 'string' || !content.trim()) return null;
    const dirRaw = (payload.direction || payload.Direcao || payload.tipo || '').toString().toUpperCase();
    const direction: 'INBOUND' | 'OUTBOUND' =
      dirRaw === 'OUTBOUND' || dirRaw === 'OUT' || dirRaw === 'SENT' || dirRaw === 'SAIDA' ? 'OUTBOUND' : 'INBOUND';
    return { content: content.trim(), direction };
  }

  /**
   * Pega o user "dono" da clínica para autoria das interações automáticas.
   */
  private async getOwnerUserId(): Promise<string | null> {
    const owner =
      (await this.prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' } })) ||
      (await this.prisma.user.findFirst({ orderBy: { createdAt: 'asc' } }));
    return owner?.id || null;
  }

  /**
   * Cria/atualiza WhatsAppConversation e grava WhatsAppMessage refletindo o BotConversa.
   * Usado quando o BotConversa dispara webhook a cada mensagem (não só lead).
   */
  private async mirrorMessage(
    payload: BotconversaPayload,
    phoneRaw: string,
    last8: string,
    msg: { content: string; direction: 'INBOUND' | 'OUTBOUND' },
  ): Promise<{ ok: boolean; kind: 'message'; conversationId: string; created: boolean }> {
    const ownerId = await this.getOwnerUserId();
    if (!ownerId) {
      this.logger.error('BotConversa mirror: nenhum user encontrado pra atribuir a conversa');
      return { ok: false as any, kind: 'message', conversationId: '', created: false };
    }

    const existingContact = await this.prisma.contact.findFirst({
      where: { number: { endsWith: last8 } },
      include: { tutor: true },
    });
    const tutorId = existingContact?.tutor?.id || null;
    const contactName = this.resolveName(payload) || null;

    let conversation = await this.prisma.whatsAppConversation.findFirst({
      where: { userId: ownerId, contactPhone: { endsWith: last8 } },
    });
    let createdConv = false;
    if (!conversation) {
      conversation = await this.prisma.whatsAppConversation.create({
        data: {
          userId: ownerId,
          contactPhone: phoneRaw,
          contactName: contactName,
          tutorId,
          metadata: { source: 'BOTCONVERSA' } as any,
          lastMessageAt: new Date(),
          lastMessagePreview: msg.content.substring(0, 100),
          unreadCount: msg.direction === 'INBOUND' ? 1 : 0,
        },
      });
      createdConv = true;
    } else {
      await this.prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          lastMessagePreview: msg.content.substring(0, 100),
          unreadCount: msg.direction === 'INBOUND' ? { increment: 1 } : conversation.unreadCount,
          ...(tutorId && !conversation.tutorId ? { tutorId } : {}),
          ...(contactName && !conversation.contactName ? { contactName } : {}),
        },
      });
    }

    await this.prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        direction: msg.direction as any,
        type: 'TEXT' as any,
        status: 'DELIVERED' as any,
        content: msg.content,
        metadata: { source: 'BOTCONVERSA', raw_trigger: payload.trigger || null } as any,
        sentAt: msg.direction === 'OUTBOUND' ? new Date() : null,
        deliveredAt: new Date(),
      },
    });

    this.logger.log(
      `BotConversa mirror: ${msg.direction} message in conversation ${conversation.id} (created=${createdConv})`,
    );
    return { ok: true, kind: 'message', conversationId: conversation.id, created: createdConv };
  }

  async handle(payload: BotconversaPayload) {
    const phoneRaw = this.resolvePhone(payload);
    const last8 = this.last8(phoneRaw || '');
    if (!last8) {
      this.logger.warn(
        `BotConversa webhook: phone ausente. trigger=${payload.trigger} keys=${Object.keys(
          payload,
        ).join(',')}`,
      );
      return { ok: false, reason: 'invalid_phone', received: Object.keys(payload) };
    }

    // === Espelhamento de mensagem (se o payload trouxer conteúdo) ===
    const msg = this.extractMessageContent(payload);
    if (msg && phoneRaw) {
      return this.mirrorMessage(payload, phoneRaw, last8, msg) as any;
    }

    const name = this.resolveName(payload);
    const email = payload.email || payload['Email'];
    const tags = this.resolveTags(payload);
    const isClient = this.isClienteContact(tags, payload);
    const resumoIA = payload.ResumoIA || payload['resumoIA'] || payload['resumo_ia'];
    const ownerId = await this.getOwnerUserId();

    // 1) Tutor existente via Contact
    const existingContact = await this.prisma.contact.findFirst({
      where: { number: { endsWith: last8 } },
      include: { tutor: true },
    });

    if (existingContact?.tutor) {
      const tutor = existingContact.tutor;
      const mergedTags = Array.from(new Set([...(tutor.tags || []), ...tags]));
      const updated = await this.prisma.tutor.update({
        where: { id: tutor.id },
        data: {
          tags: mergedTags,
          ...(email && !tutor.email ? { email } : {}),
          ...(name && !tutor.name ? { name } : {}),
        },
      });
      await this.recordInteracaoBC({ tutorId: updated.id, ownerId, payload, resumoIA, tags });
      this.logger.log(`BotConversa: Tutor existente atualizado ${updated.id}`);
      return { ok: true, kind: 'tutor', id: updated.id, created: false };
    }

    // 2) Lead existente por phone
    const existingLead = await this.prisma.lead.findFirst({
      where: { phone: { endsWith: last8 } },
    });

    if (existingLead) {
      // Se a tag agora indica Cliente, promove Lead → Tutor
      if (isClient) {
        const tutor = await this.prisma.tutor.create({
          data: {
            name: name || existingLead.name || 'Cliente BotConversa',
            email: email || existingLead.email || undefined,
            classificacao: 'Cliente',
            status: 'ACTIVE',
            tags: Array.from(new Set([...(existingLead.tags || []), ...tags])),
            observations: resumoIA || existingLead.notes,
            contacts: {
              create: [
                {
                  number: phoneRaw!,
                  type: 'MOBILE',
                  isWhatsApp: true,
                  isPrimary: true,
                },
              ],
            },
          },
        });
        // Marca o Lead como convertido
        await this.prisma.lead.update({
          where: { id: existingLead.id },
          data: { status: LeadStatus.CONVERTIDO as any, lastActivityAt: new Date() },
        }).catch(() => {});
        await this.recordInteracaoBC({ tutorId: tutor.id, ownerId, payload, resumoIA, tags });
        this.logger.log(`BotConversa: Lead ${existingLead.id} promovido a Tutor ${tutor.id}`);
        return { ok: true, kind: 'tutor', id: tutor.id, created: true };
      }

      const mergedTags = Array.from(new Set([...(existingLead.tags || []), ...tags]));
      const updated = await this.prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          tags: mergedTags,
          lastSeenAt: new Date(),
          lastActivityAt: new Date(),
          ...(name && !existingLead.name ? { name } : {}),
        },
      });
      await this.recordEvent(updated.id, payload, resumoIA, tags);
      await this.recordInteracaoBC({ leadId: updated.id, ownerId, payload, resumoIA, tags });
      this.logger.log(`BotConversa: Lead existente atualizado ${updated.id}`);
      return { ok: true, kind: 'lead', id: updated.id, created: false };
    }

    // 3) Criar Tutor ou Lead novo
    if (isClient) {
      const tutor = await this.prisma.tutor.create({
        data: {
          name: name || 'Cliente BotConversa',
          email,
          classificacao: 'Cliente',
          status: 'ACTIVE',
          tags,
          observations: resumoIA,
          contacts: {
            create: [
              {
                number: phoneRaw!,
                type: 'MOBILE',
                isWhatsApp: true,
                isPrimary: true,
              },
            ],
          },
        },
      });
      await this.recordInteracaoBC({ tutorId: tutor.id, ownerId, payload, resumoIA, tags });
      this.logger.log(`BotConversa: Tutor novo criado ${tutor.id}`);
      return { ok: true, kind: 'tutor', id: tutor.id, created: true };
    }

    const lead = await this.prisma.lead.create({
      data: {
        name,
        email: email || `${last8}@botconversa.unknown`,
        phone: phoneRaw,
        source: LeadSource.OTHER,
        sourceDetail: 'botconversa',
        status: LeadStatus.AGUARDANDO_TRIAGEM,
        tags,
        notes: resumoIA,
      },
    });
    await this.recordEvent(lead.id, payload, resumoIA, tags);
    await this.recordInteracaoBC({ leadId: lead.id, ownerId, payload, resumoIA, tags });
    this.logger.log(`BotConversa: Lead novo criado ${lead.id}`);
    return { ok: true, kind: 'lead', id: lead.id, created: true };
  }

  /**
   * Cria Interacao com canal "WhatsApp BC" para alimentar a Caixa de Entrada
   * do app. Idempotente: se já existir uma interacao do mesmo dia pro mesmo
   * lead/tutor, atualiza ela em vez de criar nova.
   */
  private async recordInteracaoBC(opts: {
    leadId?: string;
    tutorId?: string;
    ownerId: string | null;
    payload: BotconversaPayload;
    resumoIA: string | undefined;
    tags: string[];
  }) {
    if (!opts.ownerId) {
      this.logger.warn('recordInteracaoBC: sem ownerId, pulando');
      return;
    }
    const texto = opts.resumoIA
      ? opts.resumoIA
      : `Contato via BotConversa (trigger: ${opts.payload.trigger || 'desconhecido'})`;
    try {
      // Verifica se já tem interacao BC do mesmo dia
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const existing = await this.prisma.interacao.findFirst({
        where: {
          canal: 'WhatsApp BC',
          createdAt: { gte: todayStart },
          OR: [
            opts.leadId ? { leadId: opts.leadId } : undefined,
            opts.tutorId ? { tutorId: opts.tutorId } : undefined,
          ].filter(Boolean) as any,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) {
        await this.prisma.interacao.update({
          where: { id: existing.id },
          data: { texto, updatedAt: new Date() },
        });
        return;
      }
      await this.prisma.interacao.create({
        data: {
          canal: 'WhatsApp BC',
          tipo: 'NOTA' as any,
          texto,
          autorUserId: opts.ownerId,
          leadId: opts.leadId,
          tutorId: opts.tutorId,
        },
      });
    } catch (e) {
      this.logger.warn(`Falha ao registrar Interacao BC: ${e}`);
    }
  }

  private async recordEvent(
    leadId: string,
    payload: BotconversaPayload,
    resumoIA: string | undefined,
    tags: string[],
  ) {
    try {
      await this.prisma.leadEvent.create({
        data: {
          leadId,
          eventType: 'whatsapp_message',
          eventData: {
            source: 'botconversa',
            trigger: payload.trigger || null,
            resumoIA: resumoIA || null,
            tags,
            pet: payload.Pet || null,
            especie: payload.Especie || null,
            servico: payload.NomeServicoEscolhido || null,
          },
        },
      });
    } catch (e) {
      this.logger.warn(`Falha ao registrar LeadEvent: ${e}`);
    }
  }
}
