import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecebimentosService } from './recebimentos.service';
import { FornecedoresService } from './fornecedores.service';
import { CronHealthService } from '../../common/cron-health.service';

/**
 * Rede de segurança do TEMPO REAL. O lançamento da venda já nasce na hora (gatilho no recebimento,
 * caixa.service). Este cron reprocessa TUDO periodicamente — idempotente por externalId — pra pegar
 * qualquer venda/fornecedor que tenha escapado do gatilho, reclassificações e o a-pagar de fornecedor.
 */
@Injectable()
export class FinanceiroScheduler {
  private readonly logger = new Logger(FinanceiroScheduler.name);
  constructor(
    private readonly recebimentos: RecebimentosService,
    private readonly fornecedores: FornecedoresService,
    private readonly cronHealth: CronHealthService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async rodar() {
    this.cronHealth.registrar('financeiro').catch(() => undefined);
    try { await this.recebimentos.processar(); } catch (e) { this.logger.warn(`processar recebimentos: ${String((e as any)?.message || e)}`); }
    try { await this.fornecedores.processar(); } catch (e) { this.logger.warn(`processar fornecedores: ${String((e as any)?.message || e)}`); }
  }
}
