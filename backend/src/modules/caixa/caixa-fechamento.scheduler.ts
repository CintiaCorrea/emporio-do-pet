import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CaixaService } from './caixa.service';
import { CronHealthService } from '../../common/cron-health.service';

/**
 * Fechamento automático de caixa às 23:59 (fuso de Fortaleza).
 * Só age se a Configuração de Vendas tiver "Fechar caixa automaticamente à meia-noite"
 * LIGADO (lista `configvendas` → fecharCaixaMeiaNoite). Fecha todos os caixas ABERTOS.
 */
@Injectable()
export class CaixaFechamentoScheduler {
  private readonly logger = new Logger(CaixaFechamentoScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly caixa: CaixaService,
    private readonly cronHealth: CronHealthService,
  ) {}

  @Cron('59 23 * * *', { timeZone: 'America/Fortaleza' })
  async fecharCaixasMeiaNoite() {
    this.cronHealth.registrar('fechamento_caixa').catch(() => undefined);
    try {
      const item = await this.prisma.listaItem.findFirst({ where: { lista: 'configvendas' } });
      let cfg: any = {}; try { cfg = item?.valor ? JSON.parse(item.valor) : {}; } catch { cfg = {}; }
      if (!cfg.fecharCaixaMeiaNoite) return;
      const abertos = await this.prisma.caixaSessao.findMany({ where: { status: 'ABERTO' }, select: { id: true } });
      let ok = 0;
      for (const c of abertos) {
        try { await this.caixa.fechar(c.id, { observacao: 'Fechamento automático (23:59)' }); ok++; }
        catch (e: any) { this.logger.error(`falha ao fechar caixa ${c.id}: ${e?.message}`); }
      }
      if (ok) this.logger.log(`Fechamento automático: ${ok} caixa(s) fechado(s).`);
    } catch (e: any) {
      this.logger.error(`fecharCaixasMeiaNoite: ${e?.message}`);
    }
  }
}
