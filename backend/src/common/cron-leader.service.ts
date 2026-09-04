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
    const grupo = process.env.FLY_PROCESS_GROUP; // a Fly define sozinha: "app" ou "worker"
    const principal = process.env.PRIMARY_MACHINE_ID;
    const eu = process.env.FLY_MACHINE_ID;

    // ── CRITÉRIO ATUAL: o PAPEL da máquina, não o número de série ──────────────────
    // O critério antigo (PRIMARY_MACHINE_ID) apontava para UMA máquina específica. Como
    // cada deploy pode trocar a máquina, o número guardado ficava órfão — e aí NENHUMA
    // máquina se considerava a principal e as 32 rotinas paravam caladas. Foi o incidente
    // de 10/08/2026. O grupo de processo vem da própria Fly a cada boot: nunca fica órfão.
    if (grupo) {
      if (grupo === 'worker') {
        this.logger.log(`Rotinas automáticas ATIVAS — esta é a máquina de ROTINAS (${eu || '?'}).`);
        return;
      }
      this.desligarRotinas(`grupo "${grupo}" (máquina de ATENDIMENTO)`);
      return;
    }

    // ── COMPATIBILIDADE: sem grupo definido (local, ou app ainda sem [processes]) ──
    if (!principal || !eu || eu === principal) {
      this.logger.log(
        `Rotinas automáticas ATIVAS nesta máquina (${eu || 'local'})` +
          (principal ? ' — é a principal' : ' — sem grupo e sem PRIMARY_MACHINE_ID'),
      );
      return;
    }
    this.desligarRotinas(`máquina secundária (principal é ${principal})`);
  }

  /** Desliga TODOS os crons e intervalos registrados — inclusive os criados no futuro. */
  private desligarRotinas(motivo: string): void {
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
      `${n} rotina(s) automática(s) DESLIGADA(s) — ${motivo}. ` +
        `Esta máquina só serve requisições (inbox, API, PDV).`,
    );
  }
}
