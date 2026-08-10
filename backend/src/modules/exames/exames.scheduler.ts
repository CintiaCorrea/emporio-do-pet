import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ExamesService } from './exames.service';
import { CronHealthService } from '../../common/cron-health.service';

/** Avisa os laboratórios sobre coletas pendentes 2x ao dia: 11:30 e 17:00 (Fortaleza). */
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
}
