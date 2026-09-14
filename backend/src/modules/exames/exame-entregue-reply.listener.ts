import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ExamesService } from './exames.service';

/**
 * O CLIENTE RESPONDEU AO LAUDO → o exame está entregue e sai do quadro.
 *
 * Cintia, 12/09/2026: "depois que o cliente responder é considerado entregue e sai do quadro".
 * E em 16/09, fechando a lógica: "assim que o vet recebe o retorno do cliente o card pode sair
 * da lista, pois aí o resultado já está sendo passado".
 *
 * SÓ AGE SE A NOSSA MENSAGEM SAIU (escolha dela, 13/09: "só conta se a mensagem saiu"). A regra
 * mora em `exames.regras.respostaMarcaEntregue`, e este ouvinte só traduz o evento do WhatsApp:
 * tutor + hora. Sem esse par, a resposta é sobre outra coisa e não fecha exame nenhum.
 *
 * NUNCA LANÇA. É chamado pelo webhook do WhatsApp, que atende muita coisa além de exame — um
 * erro aqui não pode derrubar o recebimento de mensagens da clínica inteira.
 */
@Injectable()
export class ExameEntregueReplyListener {
  private readonly logger = new Logger(ExameEntregueReplyListener.name);

  constructor(private readonly exames: ExamesService) {}

  @OnEvent('whatsapp.message.received')
  async handle(payload: any): Promise<void> {
    try {
      const tutorId = payload?.conversation?.tutorId;
      if (!tutorId) return;   // mensagem de quem não é cliente: nada a fechar
      const quando = payload?.createdAt || payload?.timestamp || new Date().toISOString();
      const r = await this.exames.marcarEntregueAoResponder(String(tutorId), String(quando));
      if (r.entregues) this.logger.log(`Exame entregue por resposta do cliente: ${r.entregues} card(s) saíram do quadro.`);
    } catch (e: any) {
      this.logger.warn(`Falha no ExameEntregueReplyListener: ${e?.message || e}`);
    }
  }
}
