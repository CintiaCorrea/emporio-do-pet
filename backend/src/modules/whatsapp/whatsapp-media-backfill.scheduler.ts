import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WhatsAppMessageType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';

/**
 * PARTE 1 do backup do WhatsApp: garantir que NENHUMA mídia (foto/áudio/documento/vídeo)
 * que chega se perca. O download no webhook é "fire-and-forget" e às vezes falha (deploy no
 * meio, erro de rede, rate limit). Este job roda a cada 5 min e RE-TENTA salvar de forma
 * PERMANENTE (cloud) as mídias que ficaram sem cópia (`mediaCloudUrl` vazio).
 *
 * Escopo (decisão da Cintia 21/07/2026): só conversas a partir de 07/2026. O link de mídia do
 * WhatsApp expira em ~30 dias, então só dá pra re-baixar as recentes (janela de ~25 dias).
 * Desiste após algumas tentativas (mídia provavelmente já expirada) pra não ficar re-tentando à toa.
 */
@Injectable()
export class WhatsAppMediaBackfillScheduler {
  private readonly logger = new Logger(WhatsAppMediaBackfillScheduler.name);
  private readonly INICIO = new Date('2026-07-01T00:00:00.000Z');
  private readonly MAX_TENTATIVAS = 6;
  // Só mídia DE VERDADE tem arquivo pra salvar (BUTTON/TEMPLATE/LOCATION não são mídia).
  private readonly TIPOS_MIDIA: WhatsAppMessageType[] = ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'STICKER'] as WhatsAppMessageType[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  @Cron('*/5 * * * *')
  async backfill(): Promise<void> {
    try {
      const janela = new Date(Date.now() - 25 * 24 * 3600 * 1000); // dentro da expiração do WhatsApp
      const desde = janela > this.INICIO ? janela : this.INICIO;
      const pendentes = await this.prisma.whatsAppMessage.findMany({
        where: {
          type: { in: this.TIPOS_MIDIA },
          mediaCloudUrl: null,
          createdAt: { gte: desde },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, metadata: true, conversation: { select: { userId: true } } },
      });

      let ok = 0;
      let falhou = 0;
      let pulou = 0;
      for (const m of pendentes) {
        const meta: any = m.metadata || {};
        const mediaId: string | undefined = meta.mediaId;
        const tentativas = Number(meta.mediaBackfillTries || 0);
        if (!mediaId || !(m as any).conversation?.userId) { pulou++; continue; }
        if (tentativas >= this.MAX_TENTATIVAS) { pulou++; continue; } // provavelmente expirada — desiste

        const res = await this.whatsapp
          .processIncomingMedia(m.id, mediaId, (m as any).conversation.userId)
          .catch(() => ({ success: false }) as any);

        if (res?.success) {
          ok++;
        } else {
          falhou++;
          await this.prisma.whatsAppMessage
            .update({ where: { id: m.id }, data: { metadata: { ...meta, mediaBackfillTries: tentativas + 1 } } })
            .catch(() => undefined);
        }
      }

      if (ok || falhou) this.logger.log(`backfill de mídia: salvas=${ok} falhas=${falhou} puladas=${pulou}`);
    } catch (e: any) {
      this.logger.error(`backfill de mídia: ${e?.message || e}`);
    }
  }
}
