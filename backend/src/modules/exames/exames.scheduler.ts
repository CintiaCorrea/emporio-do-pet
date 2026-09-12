import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ExamesService } from './exames.service';
import { CronHealthService } from '../../common/cron-health.service';

/**
 * Dois relógios diferentes, com donos diferentes:
 *   · 11:30 e 17:00 — avisa os LABORATÓRIOS das coletas pendentes;
 *   · 11:00, 15:00 e 17:00 — lembra a NOSSA RECEPÇÃO de fazer a solicitação (Cintia, 07/09/2026).
 */
@Injectable()
export class ExamesScheduler {
  private readonly logger = new Logger(ExamesScheduler.name);

  constructor(private readonly exames: ExamesService, private readonly cronHealth: CronHealthService) {}

  @Cron('30 11 * * *', { timeZone: 'America/Fortaleza' })
  async manha(): Promise<void> {
    this.cronHealth.registrar('exames').catch(() => undefined);
    try { await this.exames.avisarLaboratorios(); } catch (e) { this.logger.error(`Aviso de coleta (manhã) falhou: ${String((e as any)?.message || e)}`); }
  }

  @Cron('0 17 * * *', { timeZone: 'America/Fortaleza' })
  async tarde(): Promise<void> {
    this.cronHealth.registrar('exames').catch(() => undefined);
    try { await this.exames.avisarLaboratorios(); } catch (e) { this.logger.error(`Aviso de coleta (tarde) falhou: ${String((e as any)?.message || e)}`); }
  }

  // LEMBRETE DA RECEPÇÃO: UMA VEZ, às 10h (Fortaleza).
  //
  // Eram três (11h, 15h e 17h) e cobriam tudo de "Retirado" em diante — com um exame pendente
  // isso virava três mensagens por dia pela mesma citologia. A Cintia, 12/09/2026: "NÃO É PARA
  // REPETIR SE O EXAME ESTIVER EM OUTRA COLUNA".
  //
  // 10h porque o aviso ao laboratório sai 11h30: se faltou preparar alguma coisa, ainda dá
  // tempo no mesmo dia.
  @Cron('0 10 * * *', { timeZone: 'America/Fortaleza' })
  async lembrarRecepcao(): Promise<void> {
    this.cronHealth.registrar('exames').catch(() => undefined);
    try {
      const r = await this.exames.lembrarRecepcaoDaSolicitacao();
      if (r.exames) this.logger.log(`Lembrete de solicitação: ${r.exames} exame(s) para ${r.avisados} pessoa(s).`);
    } catch (e) { this.logger.error(`Lembrete de solicitação falhou: ${String((e as any)?.message || e)}`); }
  }
}
