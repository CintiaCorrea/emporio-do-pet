import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CatalogoService } from './catalogo.service';

// Rede de segurança do estoque: reprocessa a baixa das vendas do catálogo novo periodicamente
// (idempotente por refId=appointmentItemId). Baixa única mesmo se rodar de novo.
@Injectable()
export class CatalogoScheduler {
  private readonly logger = new Logger(CatalogoScheduler.name);
  constructor(private readonly service: CatalogoService) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async rodar() {
    try {
      const r = await this.service.processarEstoqueVendas();
      if (r.baixados) this.logger.log(`estoque: ${r.baixados} baixa(s) de venda`);
    } catch (e) {
      this.logger.warn(`estoque vendas: ${String((e as any)?.message || e)}`);
    }
    try {
      const c = await this.service.processarComissaoVendas();
      if (c.comissoes) this.logger.log(`comissão: ${c.comissoes} linha(s) do catálogo novo`);
    } catch (e) {
      this.logger.warn(`comissão vendas: ${String((e as any)?.message || e)}`);
    }
  }
}
