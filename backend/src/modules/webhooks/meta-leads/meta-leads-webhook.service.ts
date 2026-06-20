import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LeadSource, LeadStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  MetaLeadDetail,
  MetaLeadFieldDatum,
  MetaLeadgenChangeValue,
  MetaLeadgenPayload,
} from './dto/meta-leadgen-payload.dto';

/**
 * Processa Lead Ads do Meta (Facebook/Instagram) recebidos via webhook leadgen.
 *
 * Regras (espelham o GoogleAdsWebhookService / BotconversaWebhookService):
 * - O webhook só traz o leadgen_id; buscamos os dados na Graph API com
 *   META_LEADS_TOKEN (token do Usuário do Sistema).
 * - Idempotência por telefone (últimos 8 dígitos).
 * - Se o telefone já é de um Tutor (cliente) -> registra Interacao, não duplica.
 * - Se já existe Lead -> atualiza (merge de tags + lastSeenAt).
 * - Caso contrário, cria Lead novo (source FACEBOOK ou INSTAGRAM conforme a
 *   plataforma do anúncio).
 * - Cria Interacao canal "Meta Ads" pra alimentar a Caixa de Entrada.
 * - Guarda ad_id / form_id / campaign_id em LeadEvent (usado nas conversões).
 */
@Injectable()
export class MetaLeadsWebhookService implements OnModuleInit {
  private readonly logger = new Logger(MetaLeadsWebhookService.name);
  private readonly graphVersion = process.env.META_GRAPH_VERSION || 'v21.0';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Garante que a Página esteja inscrita no app para receber eventos leadgen.
   * Idempotente: pode rodar a cada boot sem efeito colateral.
   */
  async onModuleInit() {
    const token = process.env.META_LEADS_TOKEN;
    const pageId = process.env.META_PAGE_ID;
    if (!token || !pageId) {
      this.logger.warn(
        'Auto-inscricao de Pagina pulada (META_LEADS_TOKEN ou META_PAGE_ID ausente)',
      );
      return;
    }
    try {
      const ptRes = await fetch(
        `https://graph.facebook.com/${this.graphVersion}/${encodeURIComponent(
          pageId,
        )}?fields=access_token&access_token=${encodeURIComponent(token)}`,
      );
      const ptJson: any = await ptRes.json();
      if (!ptRes.ok || !ptJson?.access_token) {
        this.logger.warn(
          `Auto-inscricao: nao obteve page token de ${pageId}: ${ptRes.status} ${JSON.stringify(ptJson)}`,
        );
        return;
      }
      const pageToken = ptJson.access_token as string;
      const subRes = await fetch(
        `https://graph.facebook.com/${this.graphVersion}/${encodeURIComponent(
          pageId,
        )}/subscribed_apps?subscribed_fields=leadgen&access_token=${encodeURIComponent(
          pageToken,
        )}`,
        { method: 'POST' },
      );
      const subBody = await subRes.text();
      if (subRes.ok) {
        this.logger.log(`Auto-inscricao: Pagina ${pageId} inscrita p/ leadgen: ${subBody}`);
      } else {
        this.logger.warn(
          `Auto-inscricao: falha ao inscrever Pagina ${pageId}: ${subRes.status} ${subBody}`,
        );
      }
    } catch (e) {
      this.logger.warn(`Auto-inscricao: erro inesperado: ${e}`);
    }
  }

  /** Ponto de entrada: itera as entries/changes e processa cada leadgen. */
  async handlePayload(payload: MetaLeadgenPayload) {
    if (!payload || payload.object !== 'page' || !Array.isArray(payload.entry)) {
      return { ok: true, ignored: true };
    }
    const results: unknown[] = [];
    for (const entry of payload.entry) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];
      for (const change of changes) {
        if (change.field !== 'leadgen' || !change.value?.leadgen_id) continue;
        try {
          results.push(await this.processLead(change.value));
        } catch (e) {
          this.logger.error(
            `Falha ao processar leadgen ${change.value.leadgen_id}: ${e}`,
          );
          results.push({ ok: false, leadgen_id: change.value.leadgen_id });
        }
      }
    }
    return { ok: true, processed: results.length, results };
  }

  private async processLead(ctx: MetaLeadgenChangeValue) {
    const leadgenId = ctx.leadgen_id as string;
    const token = process.env.META_LEADS_TOKEN;
    if (!token) {
      this.logger.error('META_LEADS_TOKEN não configurado no Fly secrets');
      return { ok: false, reason: 'no_token' };
    }

    const detail = await this.fetchLead(leadgenId, token);

    const phoneRaw = this.getField(detail, ['phone_number', 'phone']);
    const last8 = this.last8(phoneRaw || '');
    const name = this.resolveName(detail);
    const email = this.getField(detail, ['email', 'work_email']);
    const isInstagram = (detail.platform || '').toLowerCase() === 'ig';
    const source = isInstagram ? LeadSource.INSTAGRAM : LeadSource.FACEBOOK;
    const tags = ['meta-ads', isInstagram ? 'instagram' : 'facebook'];
    const ownerId = await this.getOwnerUserId();

    if (!last8) {
      this.logger.warn(
        `Meta Lead Ads: telefone ausente. leadgen_id=${leadgenId} campos=${(
          detail.field_data || []
        )
          .map((f) => f.name)
          .join(',')}`,
      );
      return { ok: false, reason: 'invalid_phone', leadgen_id: leadgenId };
    }

    // 1) Telefone já pertence a um Tutor (cliente)?
    const existingContact = await this.prisma.contact.findFirst({
      where: { number: { endsWith: last8 } },
      include: { tutor: true },
    });

    if (existingContact?.tutor) {
      const tutor = existingContact.tutor;
      await this.recordInteracao({ tutorId: tutor.id, ownerId, detail, ctx });
      this.logger.log(
        `Meta Lead Ads: telefone de Tutor existente ${tutor.id} (sem duplicar lead)`,
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
      await this.recordEvent(updated.id, detail, ctx);
      await this.recordInteracao({ leadId: updated.id, ownerId, detail, ctx });
      this.logger.log(`Meta Lead Ads: Lead existente atualizado ${updated.id}`);
      return { ok: true, kind: 'lead', id: updated.id, created: false };
    }

    // 3) Cria Lead novo
    const notesParts = [
      detail.campaign_name ? `Campanha: ${detail.campaign_name}` : null,
      detail.ad_name ? `Anúncio: ${detail.ad_name}` : null,
      ctx.form_id ? `Form: ${ctx.form_id}` : null,
    ].filter(Boolean);

    const lead = await this.prisma.lead.create({
      data: {
        name,
        email: email || `${last8}@meta-ads.unknown`,
        phone: phoneRaw,
        source,
        sourceDetail: 'meta-lead-ads',
        metaCampaignId: (detail as any).campaign_id || undefined,
        metaAdId: (detail as any).ad_id || undefined,
        metaPageId: (ctx as any).page_id || undefined,
        status: LeadStatus.AGUARDANDO_TRIAGEM,
        tags,
        notes: notesParts.length ? notesParts.join(' | ') : undefined,
      },
    });
    await this.recordEvent(lead.id, detail, ctx);
    await this.recordInteracao({ leadId: lead.id, ownerId, detail, ctx });
    this.logger.log(`Meta Lead Ads: Lead novo criado ${lead.id}`);
    return { ok: true, kind: 'lead', id: lead.id, created: true };
  }

  /** Busca os dados do lead na Graph API a partir do leadgen_id. */
  private async fetchLead(
    leadgenId: string,
    token: string,
  ): Promise<MetaLeadDetail> {
    const fields =
      'field_data,created_time,ad_id,ad_name,form_id,campaign_id,campaign_name,platform';
    const url = `https://graph.facebook.com/${this.graphVersion}/${encodeURIComponent(
      leadgenId,
    )}?fields=${fields}&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Graph API ${res.status}: ${txt}`);
    }
    return (await res.json()) as MetaLeadDetail;
  }

  /** Lê um campo do formulário por uma lista de nomes possíveis. */
  private getField(detail: MetaLeadDetail, names: string[]): string | undefined {
    const fd: MetaLeadFieldDatum[] = Array.isArray(detail.field_data)
      ? detail.field_data
      : [];
    for (const n of names) {
      const found = fd.find(
        (f) => (f.name || '').toLowerCase() === n.toLowerCase(),
      );
      const val = found?.values?.[0]?.trim();
      if (val) return val;
    }
    return undefined;
  }

  private resolveName(detail: MetaLeadDetail): string | undefined {
    const full = this.getField(detail, ['full_name', 'name']);
    if (full) return full;
    const first = this.getField(detail, ['first_name']);
    const last = this.getField(detail, ['last_name']);
    const joined = [first, last].filter(Boolean).join(' ').trim();
    return joined || undefined;
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

  /** Interacao canal "Meta Ads" pra aparecer na Caixa de Entrada. */
  private async recordInteracao(opts: {
    leadId?: string;
    tutorId?: string;
    ownerId: string | null;
    detail: MetaLeadDetail;
    ctx: MetaLeadgenChangeValue;
  }) {
    if (!opts.ownerId) {
      this.logger.warn('recordInteracao Meta Ads: sem ownerId, pulando');
      return;
    }
    const camp = opts.detail.campaign_name || opts.detail.campaign_id;
    const texto = `Lead recebido via formulário do Meta Ads${
      camp ? ` (campanha ${camp})` : ''
    }`;
    try {
      await this.prisma.interacao.create({
        data: {
          canal: 'Meta Ads',
          tipo: 'NOTA' as any,
          texto,
          autorUserId: opts.ownerId,
          leadId: opts.leadId,
          tutorId: opts.tutorId,
        },
      });
    } catch (e) {
      this.logger.warn(`Falha ao registrar Interacao Meta Ads: ${e}`);
    }
  }

  /** LeadEvent guarda ad_id/form_id/campaign_id pra etapa de conversões. */
  private async recordEvent(
    leadId: string,
    detail: MetaLeadDetail,
    ctx: MetaLeadgenChangeValue,
  ) {
    try {
      await this.prisma.leadEvent.create({
        data: {
          leadId,
          eventType: 'meta_lead_ad',
          eventData: {
            source: 'meta-lead-ads',
            leadgen_id: ctx.leadgen_id || null,
            page_id: ctx.page_id || null,
            form_id: ctx.form_id ?? detail.form_id ?? null,
            ad_id: ctx.ad_id ?? detail.ad_id ?? null,
            adgroup_id: ctx.adgroup_id ?? null,
            campaign_id: detail.campaign_id || null,
            campaign_name: detail.campaign_name || null,
            platform: detail.platform || null,
          },
        },
      });
    } catch (e) {
      this.logger.warn(`Falha ao registrar LeadEvent Meta Ads: ${e}`);
    }
  }
}
