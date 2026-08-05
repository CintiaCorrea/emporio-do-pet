import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Auto-soltar conversas do WhatsApp ("dono da conversa", 28/07).
 *
 * Se uma conversa está atribuída a alguém mas ficou OCIOSA por 30 min — nenhuma
 * mensagem nova (lastMessageAt) e o "assumir" também já tem 30 min (humanTakeoverAt) —
 * ela volta pro GERAL (assignedUserId = null). Assim ela não fica "presa" com quem já
 * saiu, e qualquer atendente pode pegar sem falar por cima.
 *
 * Roda a cada 5 min. O CronLeaderService garante que só a máquina principal executa,
 * então não solta em dobro com 2 máquinas de backend.
 */
@Injectable()
export class WhatsAppAutoReleaseScheduler {
  private readonly logger = new Logger(WhatsAppAutoReleaseScheduler.name);
  private static readonly OCIO_MIN = 30;

  constructor(private readonly prisma: PrismaService) {}

  @Cron('*/5 * * * *', { timeZone: 'America/Fortaleza' })
  async soltarOciosas(): Promise<void> {
    const corte = new Date(Date.now() - WhatsAppAutoReleaseScheduler.OCIO_MIN * 60_000);
    try {
      const res = await this.prisma.whatsAppConversation.updateMany({
        where: {
          assignedUserId: { not: null },
          lastMessageAt: { lt: corte },
          // Protege quem acabou de assumir uma conversa antiga: só solta se o "assumir"
          // também já tem 30 min (ou nunca foi carimbado, em conversas legadas).
          OR: [{ humanTakeoverAt: null }, { humanTakeoverAt: { lt: corte } }],
        },
        data: { assignedUserId: null, humanTakeoverAt: null },
      });
      if (res.count > 0) {
        this.logger.log(
          `Auto-soltar: ${res.count} conversa(s) ociosa(s) (>${WhatsAppAutoReleaseScheduler.OCIO_MIN} min) devolvida(s) ao geral.`,
        );
      }
    } catch (e) {
      this.logger.error('Falha ao auto-soltar conversas ociosas', e as any);
    }
  }
}
