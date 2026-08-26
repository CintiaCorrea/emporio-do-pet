import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WhatsAppService } from './whatsapp.service';

/**
 * Follow-up PROGRAMADO (Opção 2). Quando o cliente RESPONDE (abre a janela de 24h),
 * este listener entrega as "mensagens seguintes" que estavam guardadas:
 *  - as com gatilho ON_REPLY (assim que responder);
 *  - as AGENDADAS cujo horário já passou mas a janela estava fechada (segurar → soltar agora).
 * Isolado das outras filas (docs_fila/boletim_fila). Fila em listaItem lista='wa_followup'.
 */
@Injectable()
export class FollowupReplyListener {
  private readonly logger = new Logger(FollowupReplyListener.name);

  constructor(private readonly whatsapp: WhatsAppService) {}

  @OnEvent('whatsapp.message.received')
  async handle(payload: any): Promise<void> {
    try {
      const content = (payload?.content || '').toString().trim();
      if (!content) return;
      const tutorId = payload?.conversation?.tutorId || null;
      const phone =
        payload?.conversation?.contactPhone || payload?.from || payload?.phone || null;
      if (!tutorId && !phone) return;

      const n = await this.whatsapp.entregarFollowupsDoTutor(tutorId, phone);
      if (n > 0) this.logger.log(`Follow-up(s) entregues na resposta: ${n} (${tutorId || phone})`);
    } catch (e: any) {
      this.logger.warn(`Falha no FollowupReplyListener: ${e?.message || e}`);
    }
  }
}
