import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';

/**
 * Fila de DOCUMENTOS do prontuário (mensagem + exames/receitas anexados).
 * Quando a conversa estava fechada, mandamos o template abridor e guardamos em `docs_fila`.
 * Assim que o tutor RESPONDE (abre a janela de 24h), este listener entrega a mensagem
 * e os anexos sozinho. Isolado do boletim/presente (cada um tem sua fila).
 */
@Injectable()
export class DocsFilaReplyListener {
  private readonly logger = new Logger(DocsFilaReplyListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  @OnEvent('whatsapp.message.received')
  async handle(payload: any): Promise<void> {
    try {
      const tutorId = payload?.conversation?.tutorId;
      const content = (payload?.content || '').toString().trim();
      if (!tutorId || !content) return;

      const item = await this.prisma.listaItem.findFirst({
        where: { lista: 'docs_fila', valor: { contains: `"tutorId":"${tutorId}"` } },
      });
      if (!item) return;

      await this.whatsapp.entregarDocsDaFila(tutorId);
      this.logger.log(`Documentos da fila entregues ao tutor ${tutorId}`);
    } catch (e: any) {
      this.logger.warn(`Falha no DocsFilaReplyListener: ${e?.message || e}`);
    }
  }
}
