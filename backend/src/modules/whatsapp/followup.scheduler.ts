import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WhatsAppService } from './whatsapp.service';

/**
 * Cron do follow-up AGENDADO (Opção 2). A cada minuto, dispara as "mensagens seguintes"
 * marcadas para um dia/hora que já venceram — desde que a janela de 24h esteja aberta.
 * Se estiver fechada no horário, o item fica na fila e o FollowupReplyListener entrega
 * assim que o cliente responder ("segurar e enviar na primeira resposta").
 */
@Injectable()
export class FollowupScheduler {
  private readonly logger = new Logger(FollowupScheduler.name);

  constructor(private readonly whatsapp: WhatsAppService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    try {
      const n = await this.whatsapp.processarFollowupsAgendados();
      if (n > 0) this.logger.log(`Follow-ups agendados entregues: ${n}`);
    } catch (e: any) {
      this.logger.warn(`Falha no FollowupScheduler: ${e?.message || e}`);
    }
  }
}
