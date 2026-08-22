import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LancamentosService } from './lancamentos.service';

/**
 * Contas a RECEBER de convênio — espelho de FornecedoresService (a-pagar).
 *
 * ISOLAMENTO: o FIN só LÊ do CRM (appointment_items marcados com convenioId = item faturado ao
 * convênio, não ao tutor) + cat_convenios/cat_convenio_precos (a tabela do convênio) e só ESCREVE
 * nas tabelas fin_ (fin_faturas_convenio + itens + fin_lancamentos). Nada do CRM é alterado.
 *
 * Ritmo: LOTE_MENSAL. Cada item-convênio acumula numa fatura mensal por (convenioId, competência),
 * valorado pela tabela do convênio (CatConvenioPreco, casado pelo nome; fallback = valor da venda).
 * Ao FECHAR, a fatura vira UM fin_lancamento RECEITA a receber (vencimento = dia de fechamento).
 * Dedup: cada appointmentItem só entra 1x (unique em fin_fatura_convenio_itens.appointmentItemId).
 * Geração LAZY e idempotente — processar() roda ao abrir a tela.
 */
@Injectable()
export class ConveniosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lancamentos: LancamentosService,
  ) {}

  /* ---------- helpers ---------- */

  private inicioDoMes(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  }

  private diaNoMes(base: Date, dia: number): Date {
    const y = base.getUTCFullYear();
    const m = base.getUTCMonth();
    const ultimo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return new Date(Date.UTC(y, m, Math.min(dia, ultimo)));
  }

  /** Vencimento = dia `dia` do mês SEGUINTE ao da competência (fecha o mês, paga no mês seguinte). */
  private diaNoMesSeguinte(competencia: Date, dia: number): Date {
    const seguinte = new Date(Date.UTC(competencia.getUTCFullYear(), competencia.getUTCMonth() + 1, 1));
    return this.diaNoMes(seguinte, dia);
  }

  private rangeCompetencia(competencia?: string) {
    if (!competencia) return undefined;
    const [y, m] = competencia.split('-').map(Number);
    if (!y || !m) return undefined;
    return { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) };
  }

  private labelMes(d: Date): string {
    return `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
  }

  private norm(s: string): string {
    return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  /** Conta a-receber padrão (prefere uma com unidade). */
  private async contaPadrao(): Promise<string | null> {
    const conta = await this.prisma.contaFinanceira.findFirst({
      where: { ativo: true },
      orderBy: [{ unidadeId: 'desc' }, { createdAt: 'asc' }],
    });
    return conta?.id ?? null;
  }

  /** Categoria de RECEITA operacional p/ o a-receber do convênio (senão fica "a classificar"). */
  private async catConvenio(): Promise<string | null> {
    const pref = await this.prisma.categoria.findFirst({
      where: { tipo: 'RECEITA' as any, nome: { contains: 'Conv' } },
      select: { id: true },
    });
    if (pref) return pref.id;
    const alt = await this.prisma.categoria.findFirst({
      where: { tipo: 'RECEITA' as any, natureza: 'OPERACIONAL' as any },
      select: { id: true }, orderBy: { nome: 'asc' },
    });
    if (alt) return alt.id;
    const qualquer = await this.prisma.categoria.findFirst({ where: { tipo: 'RECEITA' as any }, select: { id: true }, orderBy: { nome: 'asc' } });
    return qualquer?.id ?? null;
  }

  /* ---------- motor: itens-convênio → faturas mensais ---------- */

  /** Lê os itens marcados com convenioId ainda não faturados e acumula na fatura do mês. */
  async processar(): Promise<{ itens: number; faturasTocadas: number }> {
    const brutos = await this.prisma.appointmentItem.findMany({
      where: { convenioId: { not: null } },
      select: {
        id: true, convenioId: true, descricao: true, quantidade: true, valorTotal: true,
        servico: { select: { nome: true } },
        product: { select: { name: true } },
        appointment: { select: { id: true, date: true, pet: { select: { name: true } }, tutor: { select: { name: true } } } },
      },
      take: 5000,
    });
    let itens = 0;
    const faturasTocadas = new Set<string>();
    if (brutos.length === 0) return { itens, faturasTocadas: 0 };

    // dedup: remove os já faturados
    const jaProc = await this.prisma.faturaConvenioItem.findMany({
      where: { appointmentItemId: { in: brutos.map((b) => b.id) } },
      select: { appointmentItemId: true },
    });
    const processados = new Set(jaProc.map((x) => x.appointmentItemId));
    const novos = brutos.filter((b) => b.convenioId && !processados.has(b.id));
    if (novos.length === 0) return { itens, faturasTocadas: 0 };

    // convênios + tabelas de preço envolvidos
    const convIds = [...new Set(novos.map((n) => n.convenioId!))];
    const convenios = await this.prisma.catConvenio.findMany({ where: { id: { in: convIds } }, include: { precos: true } });
    const convById = new Map(convenios.map((c) => [c.id, c]));

    for (const it of novos) {
      const conv = convById.get(it.convenioId!);
      if (!conv) continue; // convênio apagado → ignora (tenta de novo depois)
      const nomeServico = it.descricao || it.servico?.nome || it.product?.name || 'Serviço';
      // valor: tabela do convênio (casado pelo nome), fallback = valor da venda
      const preco = conv.precos.find((p) => this.norm(p.itemNome) === this.norm(nomeServico));
      const valorReais = preco ? Number(preco.valor) : Number(it.valorTotal || 0);
      const valor = Math.round(valorReais * 100); // centavos
      if (valor <= 0) continue;
      const dataServico = it.appointment?.date ?? new Date();
      const petTutor = [it.appointment?.pet?.name, it.appointment?.tutor?.name].filter(Boolean).join(' · ');
      const descLinha = petTutor ? `${nomeServico} — ${petTutor}` : nomeServico;

      const competencia = this.inicioDoMes(dataServico);
      // Fecha o mês da competência e paga no dia X do mês SEGUINTE (ex.: agosto → vence 20/set).
      const vencimento = conv.diaFechamento ? this.diaNoMesSeguinte(competencia, conv.diaFechamento) : null;

      const fatura = await this.prisma.faturaConvenio.upsert({
        where: { convenioId_competencia: { convenioId: conv.id, competencia } },
        create: {
          convenioId: conv.id, convenioNome: conv.nome, competencia,
          status: 'ABERTA', diaFechamento: conv.diaFechamento ?? null, vencimento,
        },
        update: {},
      });
      await this.prisma.faturaConvenioItem.create({
        data: { faturaId: fatura.id, appointmentItemId: it.id, convenioId: conv.id, descricao: descLinha, dataServico, valorCentavos: valor },
      });
      await this.prisma.faturaConvenio.update({
        where: { id: fatura.id },
        data: {
          totalCentavos: { increment: valor }, qtdItens: { increment: 1 },
          ...(fatura.vencimento ? {} : { vencimento, diaFechamento: conv.diaFechamento ?? null }),
        },
      });
      itens++;
      faturasTocadas.add(fatura.id);
    }
    return { itens, faturasTocadas: faturasTocadas.size };
  }

  /* ---------- visão da tela ---------- */

  async overview(competencia?: string) {
    await this.processar(); // lazy

    const faturas = await this.prisma.faturaConvenio.findMany({
      where: { status: 'ABERTA' },
      orderBy: [{ vencimento: 'asc' }, { convenioNome: 'asc' }],
      include: { itens: { orderBy: { dataServico: 'asc' } } },
    });

    // faturas fechadas do mês selecionado (ou corrente) — mostra o a-receber gerado
    const range =
      this.rangeCompetencia(competencia) ??
      (() => {
        const n = new Date();
        return { gte: new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1)), lt: new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 1)) };
      })();
    const fechadas = await this.prisma.faturaConvenio.findMany({
      where: { status: 'FECHADA', competencia: range },
      orderBy: { vencimento: 'desc' },
    });
    const lancIds = fechadas.map((f) => f.lancamentoId).filter(Boolean) as string[];
    const lancs = lancIds.length
      ? await this.prisma.lancamento.findMany({ where: { id: { in: lancIds } }, select: { id: true, status: true, vencimento: true, dataPagamento: true } })
      : [];
    const lancById = new Map(lancs.map((l) => [l.id, l]));

    const previsao = faturas.reduce((s, f) => s + f.totalCentavos, 0);
    const proxima = faturas.find((f) => f.vencimento) ?? faturas[0] ?? null;

    return {
      resumo: {
        previsaoConvenioCentavos: previsao,
        faturasAbertas: faturas.length,
        proximoFechamento: proxima
          ? { convenioNome: proxima.convenioNome, vencimento: proxima.vencimento, totalCentavos: proxima.totalCentavos }
          : null,
        aReceberCentavos: fechadas.reduce((s, f) => { const l = f.lancamentoId ? lancById.get(f.lancamentoId) : undefined; return l && l.status !== 'CONFIRMADO' && l.status !== 'CONCILIADO' ? s + f.totalCentavos : s; }, 0),
        recebidoCentavos: fechadas.reduce((s, f) => { const l = f.lancamentoId ? lancById.get(f.lancamentoId) : undefined; return l && (l.status === 'CONFIRMADO' || l.status === 'CONCILIADO') ? s + f.totalCentavos : s; }, 0),
      },
      faturas: faturas.map((f) => ({
        id: f.id, convenioId: f.convenioId, convenioNome: f.convenioNome, competencia: f.competencia,
        diaFechamento: f.diaFechamento, vencimento: f.vencimento, totalCentavos: f.totalCentavos, qtdItens: f.qtdItens,
        itens: f.itens.map((i) => ({ id: i.id, descricao: i.descricao, dataServico: i.dataServico, valorCentavos: i.valorCentavos })),
      })),
      fechadas: fechadas.map((f) => {
        const l = f.lancamentoId ? lancById.get(f.lancamentoId) : undefined;
        return {
          id: f.id, convenioNome: f.convenioNome, competencia: f.competencia, vencimento: f.vencimento,
          totalCentavos: f.totalCentavos, qtdItens: f.qtdItens, lancamentoId: f.lancamentoId,
          pago: l?.status === 'CONFIRMADO' || l?.status === 'CONCILIADO',
        };
      }),
    };
  }

  /* ---------- fechar fatura → a receber ---------- */

  async fecharFatura(id: string, dto: { contaId?: string; vencimento?: string }) {
    const fatura = await this.prisma.faturaConvenio.findUnique({ where: { id } });
    if (!fatura) throw new NotFoundException('Fatura não encontrada');
    if (fatura.status === 'FECHADA') throw new BadRequestException('Fatura já foi fechada.');
    if (fatura.qtdItens === 0 || fatura.totalCentavos <= 0) throw new BadRequestException('Fatura sem itens para faturar.');
    const contaId = dto.contaId ?? (await this.contaPadrao());
    if (!contaId) throw new BadRequestException('Cadastre uma conta financeira antes de fechar a fatura.');
    const catConv = await this.catConvenio();
    const venc = dto.vencimento ? new Date(dto.vencimento) : (fatura.vencimento ?? new Date());

    const lanc: any = await this.lancamentos.create({
      tipo: 'RECEITA' as any,
      valorCentavos: fatura.totalCentavos,
      vencimento: venc.toISOString(),
      descricao: `Convênio ${fatura.convenioNome} — ${this.labelMes(fatura.competencia)}`,
      contaId, categoriaId: catConv ?? undefined,
      origem: 'CRM' as any,
      externalId: `fatura-convenio:${fatura.id}`,
    } as any);

    await this.prisma.faturaConvenio.update({
      where: { id },
      data: { status: 'FECHADA', vencimento: venc, lancamentoId: lanc.id },
    });
    return { message: 'Fatura fechada — conta a receber gerada.', lancamentoId: lanc.id };
  }
}
