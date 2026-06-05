import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

/**
 * Cron que puxa os contatos do BotConversa a cada 1 minuto,
 * chamando o endpoint de poll do frontend (que pagina, ordena
 * pelos mais recentes e dispara o webhook interno).
 */
@Injectable()
export class BcPollCronService {
  private readonly logger = new Logger(BcPollCronService.name);
  private running = false;

  @Cron('*/1 * * * *')
  async pollBotConversa() {
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
