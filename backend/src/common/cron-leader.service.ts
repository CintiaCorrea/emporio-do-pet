import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';

/**
 * Porteiro das rotinas automáticas (crons).
 *
 * Com MAIS DE UMA máquina de backend rodando, cada @Cron rodaria em TODAS elas —
 * a confirmação de agenda sairia em dobro, o polling do BotConversa rodaria duas
 * vezes, etc. Este porteiro garante que os crons rodem só na máquina designada como
 * principal (PRIMARY_MACHINE_ID). Nas outras, ele desliga TODAS as rotinas de uma vez
 * ao subir — inclusive as que forem criadas no futuro, sem precisar tocar em cada uma.
 *
 * Regra de segurança: se PRIMARY_MACHINE_ID não estiver definido (ex.: rodando sozinho,
 * ou local), NADA é desligado — o comportamento continua o de sempre.
 */
@Injectable()
export class CronLeaderService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CronLeaderService.name);

  constructor(private readonly registry: SchedulerRegistry) {}

  onApplicationBootstrap(): void {
    const principal = process.env.PRIMARY_MACHINE_ID;
    const eu = process.env.FLY_MACHINE_ID;

    // Sem designação, ou eu SOU a principal → rodo os crons normalmente.
    if (!principal || !eu || eu === principal) {
      this.logger.log(
        `Rotinas automáticas ATIVAS nesta máquina (${eu || 'local'})` +
          (principal ? ' — é a principal' : ' — sem PRIMARY_MACHINE_ID definido'),
      );
      return;
    }

    // Máquina secundária: desliga todos os crons e intervalos registrados.
    let n = 0;
    try {
      const jobs = this.registry.getCronJobs();
      jobs.forEach((job, nome) => {
        try { job.stop(); this.registry.deleteCronJob(nome); n++; } catch { /* segue */ }
      });
    } catch { /* SchedulerRegistry pode não ter jobs */ }
    try {
      const intervals = this.registry.getIntervals();
      intervals.forEach((nome) => {
        try { this.registry.deleteInterval(nome); n++; } catch { /* segue */ }
      });
    } catch { /* sem intervals */ }

    this.logger.warn(
      `Máquina SECUNDÁRIA (${eu}) — ${n} rotina(s) automática(s) DESLIGADA(s). ` +
        `Só a principal (${principal}) roda cron. Esta máquina serve requisições (inbox, API).`,
    );
  }
}
