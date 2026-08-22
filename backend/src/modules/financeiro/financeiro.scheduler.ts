import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecebimentosService } from './recebimentos.service';
import { FornecedoresService } from './fornecedores.service';
import { CronHealthService } from '../../common/cron-health.service';
import { PrismaService } from '../prisma/prisma.service';

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
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async rodar() {
    this.cronHealth.registrar('financeiro').catch(() => undefined);
    try { await this.recebimentos.processar(); } catch (e) { this.logger.warn(`processar recebimentos: ${String((e as any)?.message || e)}`); }
    try { await this.fornecedores.processar(); } catch (e) { this.logger.warn(`processar fornecedores: ${String((e as any)?.message || e)}`); }
    this.checarWipeAgendado().catch((e) => this.logger.error(`wipe agendado: ${String((e as any)?.message || e)}`));
  }

  // 🧹 Zeragem do financeiro de TESTE agendada p/ 1º/set 00:01 (Fortaleza = 03:01 UTC), 1x só.
  // Apaga SÓ o financeiro (recebimentos, DRE, caixa, faturas convênio/lab, crédito). MANTÉM:
  // atendimentos, itens vendidos, patinhas dos pacotes (petpac_), doses (protocolos), cadastros,
  // convênio Petlife + tabela. Trava por flag (nunca repete) + backup reversível antes de apagar.
  private async checarWipeAgendado() {
    const FLAG = 'wipe_financeiro_setembro';
    const alvoUTC = Date.UTC(2026, 8, 1, 3, 1, 0); // 2026-09-01 03:01 UTC = 00:01 America/Fortaleza
    if (Date.now() < alvoUTC) return;
    const feito = await this.prisma.listaItem.findFirst({ where: { lista: FLAG } });
    if (feito) return; // já rodou
    await this.prisma.listaItem.create({ data: { lista: FLAG, valor: 'iniciado:' + new Date().toISOString() } }); // trava ANTES de apagar

    // BACKUP reversível (serializa o financeiro num ListaItem antes de apagar)
    try {
      const [recebimentos, lancamentos, caixas, movimentos, creditos, fatConv, fatConvIt, fatForn, fatFornIt] = await Promise.all([
        this.prisma.recebimento.findMany(), this.prisma.lancamento.findMany(), this.prisma.caixaSessao.findMany(),
        this.prisma.caixaMovimento.findMany(), this.prisma.creditoMovimento.findMany(),
        this.prisma.faturaConvenio.findMany(), this.prisma.faturaConvenioItem.findMany(),
        this.prisma.faturaFornecedor.findMany(), this.prisma.faturaFornecedorItem.findMany(),
      ]);
      const backup = JSON.stringify({ ts: new Date().toISOString(), recebimentos, lancamentos, caixas, movimentos, creditos, fatConv, fatConvIt, fatForn, fatFornIt });
      await this.prisma.listaItem.create({ data: { lista: 'backup_wipe_financeiro_setembro', valor: backup.slice(0, 950000) } });
      this.logger.log(`WIPE: backup salvo (${recebimentos.length} receb, ${lancamentos.length} lanc, ${caixas.length} caixa, ${fatConv.length} fat.conv, ${fatForn.length} fat.forn).`);
    } catch (e) { this.logger.warn(`WIPE backup: ${String((e as any)?.message || e)}`); }

    // WIPE — só financeiro (ordem respeita FKs)
    await this.prisma.recebimento.deleteMany({});
    await this.prisma.caixaMovimento.deleteMany({});
    await this.prisma.creditoMovimento.deleteMany({});
    await this.prisma.faturaConvenioItem.deleteMany({});
    await this.prisma.faturaConvenio.deleteMany({});
    await this.prisma.faturaFornecedorItem.deleteMany({});
    await this.prisma.faturaFornecedor.deleteMany({});
    await this.prisma.caixaSessao.deleteMany({});
    await this.prisma.lancamento.deleteMany({});
    await this.prisma.appointmentItem.updateMany({ where: { convenioId: { not: null } }, data: { convenioId: null } }); // solta itens do convênio (não re-fatura)
    await this.prisma.appointment.updateMany({ data: { value: 0, paymentStatus: 'PENDING' as any } });

    await this.prisma.listaItem.updateMany({ where: { lista: FLAG }, data: { valor: 'concluido:' + new Date().toISOString() } });
    this.logger.log('WIPE financeiro de setembro CONCLUÍDO — financeiro zerado, pacotes/serviços intactos.');
  }
}
