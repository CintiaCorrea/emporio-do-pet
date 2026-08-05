import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ExamesService } from './exames.service';

/** Avisa os laboratórios sobre coletas pendentes 2x ao dia: 11:30 e 17:00 (Fortaleza). */
@Injectable()
export class ExamesScheduler {
  private readonly logger = new Logger(ExamesScheduler.name);

  constructor(private readonly exames: ExamesService) {}

  @Cron('30 11 * * *', { timeZone: 'America/Fortaleza' })
  async manha(): Promise<void> {
    try { await this.exames.avisarLaboratorios(); } catch (e) { this.logger.error(`Aviso de coleta (manhã) falhou: ${String((e as any)?.message || e)}`); }
  }

  @Cron('0 17 * * *', { timeZone: 'America/Fortaleza' })
  async tarde(): Promise<void> {
    try { await this.exames.avisarLaboratorios(); } catch (e) { this.logger.error(`Aviso de coleta (tarde) falhou: ${String((e as any)?.message || e)}`); }
  }
}
