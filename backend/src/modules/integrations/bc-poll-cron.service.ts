import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

/**
 * Cron que puxa os contatos do BotConversa.
 *
 * APOSENTADO em 04/09/2026: a Cintia confirmou que a clinica NAO usa mais o
 * BotConversa — o atendimento todo passou pro Inbox Meta (nativo). A rotina rodava
 * a cada minuto, 1.440 vezes por dia, batendo num endpoint pra nao trazer nada.
 *
 * Fica DESLIGADA por padrao. O codigo continua aqui, inteiro, caso um dia a
 * integracao volte: basta definir BOTCONVERSA_POLL_ATIVO=1 nos secrets.
 *
 * Diferente da armadilha do EXAMES_LOTE_ATIVO (ver CLAUDE.md V.2), esta rotina
 * AVISA no log que esta desligada quando sobe — nao fica em silencio fingindo
 * que trabalha.
 */
@Injectable()
export class BcPollCronService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BcPollCronService.name);
  private running = false;

  private get ativo(): boolean {
    return process.env.BOTCONVERSA_POLL_ATIVO === '1';
  }

  onApplicationBootstrap(): void {
    if (!this.ativo) {
      this.logger.log(
        'BotConversa APOSENTADO (04/09/2026): a rotina de 1 min esta desligada. ' +
          'Para religar: BOTCONVERSA_POLL_ATIVO=1.',
      );
    }
  }

  @Cron('*/1 * * * *')
  async pollBotConversa() {
    if (!this.ativo) return; // aposentado — ver o comentario da classe
    if (this.running) return; // evita execucoes sobrepostas
    this.running = true;
    const url =
      process.env.BC_POLL_URL ||
      'https://app.emporiodopet.com.br/api/integrations/botconversa/poll?limit=100';
    try {
      const res = await fetch(url, { method: 'POST' });
      const text = await res.text();
      const summary = text.match(/"summary":\s*(\{[^}]+\})/)?.[1] || text.slice(0, 120);
      this.logger.log(`BC poll ${res.status}: ${summary}`);
    } catch (e: any) {
      this.logger.error(`BC poll falhou: ${e?.message || e}`);
    } finally {
      this.running = false;
    }
  }
}
