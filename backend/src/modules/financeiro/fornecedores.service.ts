import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LancamentosService } from './lancamentos.service';

/**
 * Contas a pagar de fornecedor — geradas a partir do Caixa.
 *
 * ISOLAMENTO: o FIN só LÊ do CRM (appointment_items = item vendido com fornecedor + custo;
 * fornecedores = tipo/modeloPagamento/diaFechamentoLote; recebimentos = a venda entrou no caixa)
 * e só ESCREVE nas tabelas fin_ (faturas + itens + lançamentos). Nada do CRM é alterado.
 *
 * Dois ritmos, decididos pelo `modeloPagamento` do fornecedor:
 *  - LOTE_MENSAL (laboratório): cada item acumula numa fatura mensal (previsão). Ao FECHAR,
 *    a fatura vira UM fin_lancamento a pagar (vencimento = dia de fechamento do cadastro).
 *  - demais (parceiro): cada item vira um a-pagar D+1 na hora, pelo custo (valor fixo).
 *
 * Dedup: cada appointmentItem só pode virar conta uma vez (unique em fin_fatura_itens).
 * Geração LAZY e idempotente — `processar()` roda ao abrir a tela.
 */
@Injectable()
export class FornecedoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lancamentos: LancamentosService,
  ) {}

  /* ---------- helpers ---------- */

  private inicioDoMes(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  }

  private addDias(d: Date, n: number): Date {
    return new Date(d.getTime() + n * 86400000);
  }

  /** Dia `dia` no mês de `base`, usando o último dia em meses curtos (31 → 30/28). */
  private diaNoMes(base: Date, dia: number): Date {
    const y = base.getUTCFullYear();
    const m = base.getUTCMonth();
    const ultimo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return new Date(Date.UTC(y, m, Math.min(dia, ultimo)));
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

  /** Conta ativa padrão para o a-pagar automático (prefere uma que tenha unidade). */
  private async contaPadrao(): Promise<string | null> {
    const conta = await this.prisma.contaFinanceira.findFirst({
      where: { ativo: true },
      orderBy: [{ unidadeId: 'desc' }, { createdAt: 'asc' }],
    });
    return conta?.id ?? null;
  }

  /** Categoria de CUSTO VARIÁVEL do fornecedor (senão a despesa fica "a classificar", fora dos Custos do DRE). */
  private async catFornecedor(): Promise<string | null> {
    const pref = await this.prisma.categoria.findFirst({
      where: { tipo: 'DESPESA' as any, natureza: 'OPERACIONAL' as any, comportamento: 'VARIAVEL' as any, nome: { contains: 'Custo do Serviço Vendido' } },
      select: { id: true },
    });
    if (pref) return pref.id;
    const alt = await this.prisma.categoria.findFirst({
      where: { tipo: 'DESPESA' as any, natureza: 'OPERACIONAL' as any, comportamento: 'VARIAVEL' as any },
      select: { id: true }, orderBy: { nome: 'asc' },
    });
    return alt?.id ?? null;
  }

  /* ---------- motor: Caixa → faturas / a-pagar ---------- */

  /** Lê os itens do caixa ainda não processados e gera faturas (lab) / a-pagar D+1 (parceiro). */
  async processar(): Promise<{
    itensLab: number;
    parceirosDMais1: number;
    faturasTocadas: number;
    ignoradosSemConta: number;
  }> {
    const brutos = await this.prisma.appointmentItem.findMany({
      where: {
        fornecedorId: { not: null },
        custoUnitario: { gt: 0 },
        appointment: { is: { recebimentos: { some: {} } } }, // venda concluída no caixa
      },
      select: {
        id: true,
        quantidade: true,
        custoUnitario: true,
        descricao: true,
        servico: { select: { nome: true } },
        product: { select: { name: true } },
        fornecedor: {
          select: { id: true, nome: true, tipo: true, modeloPagamento: true, diaFechamentoLote: true },
        },
        appointment: {
          select: {
            id: true,
            date: true,
            recebimentos: { select: { data: true }, orderBy: { data: 'asc' }, take: 1 },
            pet: { select: { name: true } },
            tutor: { select: { name: true } },
          },
        },
      },
      take: 3000,
    });

    let itensLab = 0;
    let parceirosDMais1 = 0;
    let ignoradosSemConta = 0;
    const faturasTocadas = new Set<string>();
    if (brutos.length === 0) {
      return { itensLab, parceirosDMais1, faturasTocadas: 0, ignoradosSemConta };
    }

    // remove os já processados (dedup)
    const jaProc = await this.prisma.faturaFornecedorItem.findMany({
      where: { appointmentItemId: { in: brutos.map((b) => b.id) } },
      select: { appointmentItemId: true },
    });
    const processados = new Set(jaProc.map((x) => x.appointmentItemId));
    const novos = brutos.filter((b) => b.fornecedor && !processados.has(b.id));

    const contaId = await this.contaPadrao(); // pode ser null se nada cadastrado ainda
    const catForn = await this.catFornecedor(); // P0: classifica em Custos Variáveis (senão fica "a classificar")

    for (const it of novos) {
      const f = it.fornecedor!;
      const custo = Math.round(it.custoUnitario * (it.quantidade || 1) * 100); // centavos
      if (custo <= 0) continue;
      const dataServico =
        it.appointment?.recebimentos?.[0]?.data ?? it.appointment?.date ?? new Date();
      const nomeServico =
        it.descricao || it.servico?.nome || it.product?.name || 'Serviço';
      const petTutor = [it.appointment?.pet?.name, it.appointment?.tutor?.name]
        .filter(Boolean)
        .join(' · ');
      const descLinha = petTutor ? `${nomeServico} — ${petTutor}` : nomeServico;

      if (f.modeloPagamento === 'LOTE_MENSAL') {
        // ---- laboratório: acumula na fatura do mês ----
        const competencia = this.inicioDoMes(dataServico);
        const vencimento = f.diaFechamentoLote
          ? this.diaNoMes(competencia, f.diaFechamentoLote)
          : null;

        const fatura = await this.prisma.faturaFornecedor.upsert({
          where: { fornecedorId_competencia: { fornecedorId: f.id, competencia } },
          create: {
            fornecedorId: f.id,
            fornecedorNome: f.nome,
            competencia,
            status: 'ABERTA',
            diaFechamento: f.diaFechamentoLote ?? null,
            vencimento,
          },
          update: {},
        });

        await this.prisma.faturaFornecedorItem.create({
          data: {
            faturaId: fatura.id,
            appointmentItemId: it.id,
            fornecedorId: f.id,
            tipoFornecedor: f.tipo,
            descricao: descLinha,
            dataServico,
            custoCentavos: custo,
          },
        });
        await this.prisma.faturaFornecedor.update({
          where: { id: fatura.id },
          data: {
            totalCentavos: { increment: custo },
            qtdItens: { increment: 1 },
            // preenche vencimento/dia se ainda não tinha
            ...(fatura.vencimento ? {} : { vencimento, diaFechamento: f.diaFechamentoLote ?? null }),
          },
        });
        itensLab++;
        faturasTocadas.add(fatura.id);
      } else {
        // ---- parceiro / outros: a-pagar D+1 na hora ----
        if (!contaId) {
          ignoradosSemConta++;
          continue; // sem conta cadastrada ainda; não marca processado → tenta de novo depois
        }
        const venc = this.addDias(dataServico, 1);
        const lanc: any = await this.lancamentos.create({
          tipo: 'DESPESA' as any,
          valorCentavos: custo,
          data: dataServico.toISOString(),
          vencimento: venc.toISOString(),
          descricao: `${f.nome} — ${descLinha}`,
          contaId, categoriaId: catForn ?? undefined,
          origem: 'CRM' as any,
          externalId: it.id, // dedup também no nível do lançamento (unique origem+externalId)
          appointmentId: it.appointment?.id,
        } as any);

        await this.prisma.faturaFornecedorItem.create({
          data: {
            faturaId: null,
            appointmentItemId: it.id,
            fornecedorId: f.id,
            tipoFornecedor: f.tipo,
            descricao: descLinha,
            dataServico,
            custoCentavos: custo,
            lancamentoId: lanc.id,
          },
        });
        parceirosDMais1++;
      }
    }

    return { itensLab, parceirosDMais1, faturasTocadas: faturasTocadas.size, ignoradosSemConta };
  }

  /* ---------- visão da tela ---------- */

  async overview(competencia?: string) {
    await this.processar(); // lazy: mantém tudo atualizado ao abrir a tela

    // faturas de laboratório em aberto (acumulando) — sempre todas as abertas
    const faturas = await this.prisma.faturaFornecedor.findMany({
      where: { status: 'ABERTA' },
      orderBy: [{ vencimento: 'asc' }, { fornecedorNome: 'asc' }],
      include: { itens: { orderBy: { dataServico: 'asc' } } },
    });

    // parceiros (a-pagar D+1) do mês selecionado (ou corrente)
    const range =
      this.rangeCompetencia(competencia) ??
      (() => {
        const n = new Date();
        return {
          gte: new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1)),
          lt: new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 1)),
        };
      })();

    const parceiroItens = await this.prisma.faturaFornecedorItem.findMany({
      where: { faturaId: null, dataServico: range },
      orderBy: { dataServico: 'desc' },
      take: 300,
    });
    // status/vencimento vêm do lançamento a pagar
    const lancIds = parceiroItens.map((i) => i.lancamentoId).filter(Boolean) as string[];
    const lancs = lancIds.length
      ? await this.prisma.lancamento.findMany({
          where: { id: { in: lancIds } },
          select: { id: true, status: true, vencimento: true, dataPagamento: true },
        })
      : [];
    const lancById = new Map(lancs.map((l) => [l.id, l]));
    // nomes dos fornecedores (parceiros) para exibição
    const fornIds = [...new Set(parceiroItens.map((i) => i.fornecedorId))];
    const forns = fornIds.length
      ? await this.prisma.fornecedor.findMany({
          where: { id: { in: fornIds } },
          select: { id: true, nome: true },
        })
      : [];
    const nomeById = new Map(forns.map((f) => [f.id, f.nome]));
    const parceiros = parceiroItens.map((i) => {
      const l = i.lancamentoId ? lancById.get(i.lancamentoId) : undefined;
      return {
        id: i.id,
        fornecedorNome: nomeById.get(i.fornecedorId) ?? undefined,
        descricao: i.descricao,
        dataServico: i.dataServico,
        custoCentavos: i.custoCentavos,
        vencimento: l?.vencimento ?? this.addDias(i.dataServico, 1),
        pago: l?.status === 'CONFIRMADO' || l?.status === 'CONCILIADO',
        lancamentoId: i.lancamentoId ?? null,
      };
    });

    // KPIs
    const previsaoFornecedores = faturas.reduce((s, f) => s + f.totalCentavos, 0);
    const proxima = faturas.find((f) => f.vencimento) ?? faturas[0] ?? null;
    const parceirosPagos = parceiros
      .filter((p) => p.pago)
      .reduce((s, p) => s + p.custoCentavos, 0);
    const parceirosAPagar = parceiros
      .filter((p) => !p.pago)
      .reduce((s, p) => s + p.custoCentavos, 0);

    return {
      resumo: {
        previsaoFornecedoresCentavos: previsaoFornecedores,
        faturasAbertas: faturas.length,
        proximoFechamento: proxima
          ? {
              fornecedorNome: proxima.fornecedorNome,
              vencimento: proxima.vencimento,
              totalCentavos: proxima.totalCentavos,
            }
          : null,
        parceirosPagosCentavos: parceirosPagos,
        parceirosAPagarCentavos: parceirosAPagar,
        parceirosQtd: parceiros.length,
      },
      faturas: faturas.map((f) => ({
        id: f.id,
        fornecedorId: f.fornecedorId,
        fornecedorNome: f.fornecedorNome,
        competencia: f.competencia,
        diaFechamento: f.diaFechamento,
        vencimento: f.vencimento,
        totalCentavos: f.totalCentavos,
        qtdItens: f.qtdItens,
        itens: f.itens.map((i) => ({
          id: i.id,
          descricao: i.descricao,
          dataServico: i.dataServico,
          custoCentavos: i.custoCentavos,
        })),
      })),
      parceiros,
    };
  }

  /* ---------- fechar fatura → a pagar ---------- */

  async fecharFatura(id: string, dto: { contaId?: string; vencimento?: string }) {
    const fatura = await this.prisma.faturaFornecedor.findUnique({ where: { id } });
    if (!fatura) throw new NotFoundException('Fatura não encontrada');
    if (fatura.status === 'FECHADA') {
      throw new BadRequestException('Fatura já foi fechada.');
    }
    if (fatura.qtdItens === 0 || fatura.totalCentavos <= 0) {
      throw new BadRequestException('Fatura sem itens para pagar.');
    }
    const contaId = dto.contaId ?? (await this.contaPadrao());
    const catForn = await this.catFornecedor();
    if (!contaId) {
      throw new BadRequestException('Cadastre uma conta financeira antes de fechar a fatura.');
    }
    const venc = dto.vencimento
      ? new Date(dto.vencimento)
      : (fatura.vencimento ?? new Date());

    const lanc: any = await this.lancamentos.create({
      tipo: 'DESPESA' as any,
      valorCentavos: fatura.totalCentavos,
      vencimento: venc.toISOString(),
      descricao: `Fatura ${fatura.fornecedorNome} — ${this.labelMes(fatura.competencia)}`,
      contaId, categoriaId: catForn ?? undefined,
      origem: 'CRM' as any,
      externalId: `fatura:${fatura.id}`,
    } as any);

    await this.prisma.faturaFornecedor.update({
      where: { id },
      data: { status: 'FECHADA', vencimento: venc, lancamentoId: lanc.id },
    });
    return { message: 'Fatura fechada — conta a pagar gerada.', lancamentoId: lanc.id };
  }
}
