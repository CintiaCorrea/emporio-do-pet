import { Injectable, Logger } from '@nestjs/common';
import { LeadSource, LeadStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BotconversaPayloadDto } from './dto/botconversa-payload.dto';

/**
 * Processa eventos do BotConversa.
 *
 * Regras (espelham botconversaLeadCapture do Base44):
 *  - Idempotência por telefone (last 8 dígitos) — evita duplicar
 *    Lead/Tutor a cada interação.
 *  - Se já existe Tutor com esse telefone → upsert nele
 *    (BotConversa indica cliente existente via tag FU-cliente).
 *  - Senão, busca/atualiza Lead. Se não existe Lead, cria com
 *    source=BOTCONVERSA.
 *  - Tags do BotConversa são preservadas no array de tags.
 *  - LeadEvent registra o resumo IA como rastro.
 */
@Injectable()
export class BotconversaWebhookService {
  private readonly logger = new Logger(BotconversaWebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  private last8(phone: string): string {
    return (phone || '').replace(/\D/g, '').slice(-8);
  }

  async handle(payload: BotconversaPayloadDto) {
    const last8 = this.last8(payload.phone);
    if (!last8) {
      this.logger.warn('BotConversa webhook: phone ausente ou inválido');
      return { ok: false, reason: 'invalid_phone' };
    }

    const isClient = (payload.tags || []).includes('FU-cliente');

    // 1) Buscar Tutor existente via Contact (tutor já cadastrado)
    const existingContact = await this.prisma.contact.findFirst({
      where: { number: { endsWith: last8 } },
      include: { tutor: true },
    });

    if (existingContact?.tutor) {
      const tutor = existingContact.tutor;
      const mergedTags = Array.from(
        new Set([...(tutor.tags || []), ...(payload.tags || [])]),
      );
      const updated = await this.prisma.tutor.update({
        where: { id: tutor.id },
        data: {
          tags: mergedTags,
          ...(payload.email && !tutor.email ? { email: payload.email } : {}),
          ...(payload.name && !tutor.name ? { name: payload.name } : {}),
        },
      });

      this.logger.log(
        `BotConversa: Tutor existente atualizado ${updated.id} (${updated.name})`,
      );
      return { ok: true, kind: 'tutor', id: updated.id, created: false };
    }

    // 2) Buscar Lead existente por telefone
    const existingLead = await this.prisma.lead.findFirst({
      where: { phone: { endsWith: last8 } },
    });

    if (existingLead) {
      const mergedTags = Array.from(
        new Set([...(existingLead.tags || []), ...(payload.tags || [])]),
      );
      const updated = await this.prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          tags: mergedTags,
          lastSeenAt: new Date(),
          lastActivityAt: new Date(),
          ...(payload.name && !existingLead.name ? { name: payload.name } : {}),
        },
      });

      // Registrar evento da interação
      await this.recordEvent(updated.id, payload);

      this.logger.log(
        `BotConversa: Lead existente atualizado ${updated.id}`,
      );
      return { ok: true, kind: 'lead', id: updated.id, created: false };
    }

    // 3) Criar Lead novo (ou Tutor direto se for cliente)
    if (isClient) {
      const tutor = await this.prisma.tutor.create({
        data: {
          name: payload.name || 'Cliente BotConversa',
          email: payload.email,
          classificacao: 'Cliente',
          status: 'ACTIVE',
          tags: payload.tags || [],
          observations: payload.resumoIA,
          contacts: {
            create: [
              {
                number: payload.phone,
                type: 'MOBILE',
                isWhatsApp: true,
                isPrimary: true,
              },
            ],
          },
        },
      });

      this.logger.log(`BotConversa: Tutor novo criado ${tutor.id}`);
      return { ok: true, kind: 'tutor', id: tutor.id, created: true };
    }

    const lead = await this.prisma.lead.create({
      data: {
        name: payload.name,
        email: payload.email || `${last8}@botconversa.unknown`,
        phone: payload.phone,
        source: LeadSource.OTHER,
        sourceDetail: 'botconversa',
        status: LeadStatus.NEW,
        tags: payload.tags || [],
        notes: payload.resumoIA,
      },
    });

    await this.recordEvent(lead.id, payload);

    this.logger.log(`BotConversa: Lead novo criado ${lead.id}`);
    return { ok: true, kind: 'lead', id: lead.id, created: true };
  }

  private async recordEvent(leadId: string, payload: BotconversaPayloadDto) {
    try {
      await this.prisma.leadEvent.create({
        data: {
          leadId,
          eventType: 'whatsapp_message',
          eventData: {
            source: 'botconversa',
            resumoIA: payload.resumoIA || null,
            tags: payload.tags || [],
            petNome: payload.petNome || null,
            petEspecie: payload.petEspecie || null,
            servicoInteresse: payload.servicoInteresse || null,
          },
        },
      });
    } catch (e) {
      this.logger.warn(`Falha ao registrar LeadEvent: ${e}`);
    }
  }
}
