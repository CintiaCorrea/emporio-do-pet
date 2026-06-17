import { Injectable, Logger } from '@nestjs/common';
import { LeadSource, LeadStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  GoogleLeadFormPayload,
  GoogleLeadUserColumn,
} from './dto/google-lead-form-payload.dto';

/**
 * Processa leads do Google Ads Lead Form (webhook).
 *
 * Regras (espelham o BotconversaWebhookService):
 * - Idempotência por telefone (últimos 8 dígitos).
 * - Se o telefone já é de um Tutor (cliente) → registra Interacao, não duplica.
 * - Se já existe Lead → atualiza (merge de tags + lastSeenAt).
 * - Caso contrário, cria Lead novo com source GOOGLE_ADS.
 * - Cria Interacao canal "Google Ads" pra alimentar a Caixa de Entrada.
 * - Guarda gclid / campaign_id / form_id em LeadEvent (usado na etapa de
 *   conversões offline).
 */
@Injectable()
export class GoogleAdsWebhookService {
  private readonly logger = new Logger(GoogleAdsWebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Lê um campo do formulário por uma lista de column_id possíveis. */
  private getColumn(
    payload: GoogleLeadFormPayload,
    ids: string[],
  ): string | undefined {
    const cols: GoogleLeadUserColumn[] = Array.isArray(payload.user_column_data)
      ? payload.user_column_data
      : [];
    for (const id of ids) {
      const found = cols.find(
        (c) => (c.column_id || '').toUpperCase() === id.toUpperCase(),
      );
      const val = found?.string_value?.trim();
      if (val) return val;
    }
    return undefined;
  }

  private resolveName(payload: GoogleLeadFormPayload): string | undefined {
    const full = this.getColumn(payload, ['FULL_NAME', 'NAME']);
    if (full) return full;
    const first = this.getColumn(payload, ['FIRST_NAME']);
    const last = this.getColumn(payload, ['LAST_NAME']);
    const joined = [first, last].filter(Boolean).join(' ').trim();
    return joined || undefined;
  }

  private resolvePhone(payload: GoogleLeadFormPayload): string | undefined {
    return this.getColumn(payload, ['PHONE_NUMBER', 'WORK_PHONE', 'PHONE']);
  }

  private resolveEmail(payload: GoogleLeadFormPayload): string | undefined {
    return this.getColumn(payload, ['EMAIL', 'WORK_EMAIL', 'USER_EMAIL']);
  }

  private last8(phone: string): string {
    return (phone || '').replace(/\D/g, '').slice(-8);
  }

  private async getOwnerUserId(): Promise<string | null> {
    const owner =
      (await this.prisma.user.findFirst({
        where: { role: 'ADMIN' },
        orderBy: { createdAt: 'asc' },
      })) ||
      (await this.prisma.user.findFirst({ orderBy: { createdAt: 'asc' } }));
    return owner?.id || null;
  }

  async handle(payload: GoogleLeadFormPayload) {
    const phoneRaw = this.resolvePhone(payload);
    const last8 = this.last8(phoneRaw || '');
    const name = this.resolveName(payload);
    const email = this.resolveEmail(payload);
    const gclid = payload.gcl_id || undefined;
    const campaignId =
      payload.campaign_id != null ? String(payload.campaign_id) : undefined;
    const isTest = payload.is_test === true;
    const ownerId = await this.getOwnerUserId();
    const tags = isTest ? ['google-ads', 'teste'] : ['google-ads'];

    if (!last8) {
      this.logger.warn(
        `Google Lead Form: telefone ausente. lead_id=${payload.lead_id} keys=${Object.keys(
          payload,
        ).join(',')}`,
      );
      return { ok: false, reason: 'invalid_phone' };
    }

    // 1) Telefone já pertence a um Tutor (cliente)?
    const existingContact = await this.prisma.contact.findFirst({
      where: { number: { endsWith: last8 } },
      include: { tutor: true },
    });

    if (existingContact?.tutor) {
      const tutor = existingContact.tutor;
      await this.recordInteracao({ tutorId: tutor.id, ownerId, payload });
      this.logger.log(
        `Google Lead Form: telefone de Tutor existente ${tutor.id} (sem duplicar lead)`,
      );
      return { ok: true, kind: 'tutor', id: tutor.id, created: false };
    }

    // 2) Lead já existe por telefone?
    const existingLead = await this.prisma.lead.findFirst({
      where: { phone: { endsWith: last8 } },
    });

    if (existingLead) {
      const mergedTags = Array.from(
        new Set([...(existingLead.tags || []), ...tags]),
      );
      const updated = await this.prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          tags: mergedTags,
          lastSeenAt: new Date(),
          lastActivityAt: new Date(),
          ...(name && !existingLead.name ? { name } : {}),
          ...(email && !existingLead.email ? { email } : {}),
        },
      });
      await this.recordEvent(updated.id, payload, gclid, campaignId);
      await this.recordInteracao({ leadId: updated.id, ownerId, payload });
      this.logger.log(`Google Lead Form: Lead existente atualizado ${updated.id}`);
      return { ok: true, kind: 'lead', id: updated.id, created: false };
    }

    // 3) Cria Lead novo
    const notesParts = [
      campaignId ? `Campanha: ${campaignId}` : null,
      payload.form_id != null ? `Form: ${payload.form_id}` : null,
      isTest ? '(lead de teste)' : null,
    ].filter(Boolean);

    const lead = await this.prisma.lead.create({
      data: {
        name,
        email: email || `${last8}@google-ads.unknown`,
        phone: phoneRaw,
        source: LeadSource.GOOGLE_ADS,
        sourceDetail: 'google-ads-lead-form',
        status: LeadStatus.AGUARDANDO_TRIAGEM,
        tags,
        notes: notesParts.length ? notesParts.join(' | ') : undefined,
      },
    });
    await this.recordEvent(lead.id, payload, gclid, campaignId);
    await this.recordInteracao({ leadId: lead.id, ownerId, payload });
    this.logger.log(`Google Lead Form: Lead novo criado ${lead.id}`);
    return { ok: true, kind: 'lead', id: lead.id, created: true };
  }

  /** Interacao canal "Google Ads" pra aparecer na Caixa de Entrada. */
  private async recordInteracao(opts: {
    leadId?: string;
    tutorId?: string;
    ownerId: string | null;
    payload: GoogleLeadFormPayload;
  }) {
    if (!opts.ownerId) {
      this.logger.warn('recordInteracao Google Ads: sem ownerId, pulando');
      return;
    }
    const texto = `Lead recebido via formulário do Google Ads${
      opts.payload.campaign_id ? ` (campanha ${opts.payload.campaign_id})` : ''
    }`;
    try {
      await this.prisma.interacao.create({
        data: {
          canal: 'Google Ads',
          tipo: 'NOTA' as any,
          texto,
          autorUserId: opts.ownerId,
          leadId: opts.leadId,
          tutorId: opts.tutorId,
        },
      });
    } catch (e) {
      this.logger.warn(`Falha ao registrar Interacao Google Ads: ${e}`);
    }
  }

  /** LeadEvent guarda gclid/campaign_id pra etapa de conversões offline. */
  private async recordEvent(
    leadId: string,
    payload: GoogleLeadFormPayload,
    gclid: string | undefined,
    campaignId: string | undefined,
  ) {
    try {
      await this.prisma.leadEvent.create({
        data: {
          leadId,
          eventType: 'google_lead_form',
          eventData: {
            source: 'google-ads-lead-form',
            lead_id: payload.lead_id || null,
            form_id: payload.form_id ?? null,
            campaign_id: campaignId || null,
            adgroup_id: payload.adgroup_id ?? null,
            creative_id: payload.creative_id ?? null,
            gclid: gclid || null,
            is_test: payload.is_test === true,
          },
        },
      });
    } catch (e) {
      this.logger.warn(`Falha ao registrar LeadEvent Google Ads: ${e}`);
    }
  }
}
