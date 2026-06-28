import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SurveyAvaliacaoService } from './survey-avaliacao.service';

interface WhatsAppReceivedEvent {
  conversation?: { tutorId?: string | null } | null;
  contactPhone?: string;
  content?: string;
  messageType?: string;
}

/**
 * Ouvinte ADITIVO: escuta 'whatsapp.message.received' (emitido para toda mensagem recebida)
 * e, se for uma resposta de pesquisa de satisfação pendente (número 1-5), trata e responde.
 * Não interfere no fluxo existente: se não for resposta de pesquisa, apenas ignora.
 */
@Injectable()
export class SurveyAvaliacaoListener {
  private readonly logger = new Logger(SurveyAvaliacaoListener.name);

  constructor(private readonly service: SurveyAvaliacaoService) {}

  @OnEvent('whatsapp.message.received')
  async handle(event: WhatsAppReceivedEvent): Promise<void> {
    try {
      const phone = event?.contactPhone;
      const content = event?.content;
      if (!phone || !content) return;
      await this.service.tratarRespostaInbound(
        event?.conversation?.tutorId ?? null,
        phone,
        content,
      );
    } catch (err) {
      this.logger.error(`Erro ao tratar resposta de pesquisa: ${String(err)}`);
    }
  }
}
