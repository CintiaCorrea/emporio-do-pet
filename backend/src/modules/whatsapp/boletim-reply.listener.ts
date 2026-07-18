import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';

/**
 * Quando o cliente RESPONDE (toca "Enviar o boletim" / escreve algo) e havia um boletim
 * na FILA (conversa estava fechada), a janela de 24h abre e a gente entrega o boletim
 * completo sozinho. Se ele responder "Não preciso do boletim", cancela.
 */
@Injectable()
export class BoletimReplyListener {
  private readonly logger = new Logger(BoletimReplyListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  @OnEvent('whatsapp.message.received')
  async handle(payload: any): Promise<void> {
    try {
      const content = (payload?.content || '').toString().toLowerCase().trim();
      const tutorId = payload?.conversation?.tutorId;
      if (!tutorId || !content) return;

      // Só age se existe boletim na fila pra esse tutor (senão ignora tudo).
      const item = await this.prisma.listaItem.findFirst({
        where: { lista: 'boletim_fila', valor: { contains: `"tutorId":"${tutorId}"` } },
      });
      if (!item) return;

      if (content.includes('não preciso') || content.includes('nao preciso') || content.includes('agora não') || content.includes('agora nao')) {
        await this.whatsapp.cancelarBoletimDaFila(tutorId);
        this.logger.log(`Boletim na fila cancelado (tutor ${tutorId} pediu para não enviar)`);
        return;
      }

      // "Ver o boletim" / "Enviar o boletim" / "Tirar dúvida" (ou qualquer resposta) → a janela abriu, entrega o boletim.
      await this.whatsapp.entregarBoletimDaFila(tutorId);
      this.logger.log(`Boletim da fila entregue ao tutor ${tutorId}`);
    } catch (e: any) {
      this.logger.warn(`Falha no BoletimReplyListener: ${e?.message || e}`);
    }
  }
}
