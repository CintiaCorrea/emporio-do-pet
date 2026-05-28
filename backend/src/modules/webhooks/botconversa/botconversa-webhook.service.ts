import { Injectable, Logger } from '@nestjs/common';
import { LeadSource, LeadStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BotconversaPayloadDto } from './dto/botconversa-payload.dto';

/**
 * Processa eventos do BotConversa.
 *
 * Regras (espelham botconversaLeadCapture do Base44):
 *  - Idempotência por telefone (last 8 dígitos).
 *  - Tag FU-cliente → upsert em Tutor com classificacao=Cliente.
 *  - Caso contrário, upsert em Lead.
 *  - Tags do BotConversa preservadas.
 *  - LeadEvent registra rastro.
 */
@Injectable()
export class BotconversaWebhookService {
  private readonly logger = new Logger(BotconversaWebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  private resolvePhone(payload: BotconversaPayloadDto): string | null {
    return (
      payload.full_phone ||
      payload.phone ||
      payload['Telefone'] ||
      payload['telefone'] ||
      null
    );
  }

  private resolveName(payload: BotconversaPayloadDto): string | undefined {
    return (
      payload.nome_completo ||
      payload['name'] ||
      payload['Nome'] ||
      payload['nome'] ||
      undefined
    );
  }

  private resolveTags(payload: BotconversaPayloadDto): string[] {
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

  async handle(payload: BotconversaPayloadDto) {
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

    const name = this.resolveName(payload);
    const email = payload.email || payload['Email'];
    const tags = this.resolveTags(payload);
    const isClient = tags.includes('FU-cliente');
    const resumoIA = payload.ResumoIA || payload['resumoIA'] || payload['resumo_ia'];

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
      this.logger.log(`BotConversa: Tutor existente atualizado ${updated.id}`);
      return { ok: true, kind: 'tutor', id: updated.id, created: false };
    }

    // 2) Lead existente por phone
    const existingLead = await this.prisma.lead.findFirst({
      where: { phone: { endsWith: last8 } },
    });

    if (existingLead) {
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
        status: LeadStatus.NEW,
        tags,
        notes: resumoIA,
      },
    });
    await this.recordEvent(lead.id, payload, resumoIA, tags);
    this.logger.log(`BotConversa: Lead novo criado ${lead.id}`);
    return { ok: true, kind: 'lead', id: lead.id, created: true };
  }

  private async recordEvent(
    leadId: string,
    payload: BotconversaPayloadDto,
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
