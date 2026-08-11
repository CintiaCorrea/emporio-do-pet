import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LancamentosService } from './lancamentos.service';

/**
 * Devolução de venda (estorno completo, ligado ao Financeiro).
 *
 * Regras (definidas com a Cintia):
 *  - Devolve o LÍQUIDO: valor dos itens − taxa do cartão (a taxa que a operadora
 *    já reteve permanece como custo; não é estornada).
 *  - Se a venda foi PARCELADA no cartão, a devolução ESPELHA as parcelas
 *    (N lançamentos mensais). À vista/dinheiro/pix → 1 parcela.
 *  - O estorno de receita vira DEDUÇÃO "Devoluções de Vendas" no Financeiro,
 *    com competência mês a mês → o DRE passa a mostrar a receita líquida.
 *  - O dinheiro volta ao cliente como CRÉDITO (saldo) ou DINHEIRO (a recepção
 *    escolhe na hora). Devolução total OU por item (parcial).
 *
 * Sem mudança de schema: usa fin_lancamentos + creditoMovimento + listaItem (devolucao_).
 */
@Injectable()
export class DevolucaoService {
  private readonly logger = new Logger(DevolucaoService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly lancamentos: LancamentosService,
  ) {}

  private norm(s: string) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }

  private async contaPadrao(): Promise<string | null> {
    const conta = await this.prisma.contaFinanceira.findFirst({
      orderBy: [{ unidadeId: 'desc' }, { createdAt: 'asc' }],
    });
    return conta?.id ?? null;
  }
  /** Devolução em DINHEIRO sai da conta de dinheiro (Espécie) — pra o saldo dela cair certo. */
  private async contaDinheiro(): Promise<string | null> {
    const din = await this.prisma.contaFinanceira.findFirst({ where: { ativo: true, tipo: 'DINHEIRO' as any }, select: { id: true } });
    return din?.id ?? null;
  }
  private async unidadePadrao(): Promise<string | null> {
    const u = await this.prisma.unidade.findFirst({ orderBy: { createdAt: 'asc' } });
    return u?.id ?? null;
  }

  /** Config das formas de recebimento: nome → {tipo, taxas por parcela}. */
  private async loadFormas(): Promise<Map<string, { tipo: string; taxas: Record<string, any> }>> {
    const itens = await this.prisma.listaItem.findMany({ where: { lista: 'formasrecebimento' } });
    const map = new Map<string, { tipo: string; taxas: Record<string, any> }>();
    for (const it of itens) {
      try {
        const v = JSON.parse(it.valor);
        if (v?.nome) map.set(this.norm(v.nome), { tipo: String(v.tipo || ''), taxas: v.taxas || {} });
      } catch { /* ignora */ }
    }
    return map;
  }

  /** Categoria "Devoluções de Vendas" (dedução). Cria no mesmo grupo da Taxa se faltar. */
  private async catDevolucao(): Promise<string> {
    let cat = await this.prisma.categoria.findFirst({ where: { nome: { contains: 'Devolu' } }, select: { id: true } });
    if (cat) return cat.id;
    const taxa = await this.prisma.categoria.findFirst({ where: { nome: { contains: 'Taxa Operadora' } }, select: { grupoId: true } });
    const grupo = taxa
      ? await this.prisma.grupoCategoria.findUnique({ where: { id: taxa.grupoId } })
      : await this.prisma.grupoCategoria.findFirst({ where: { ordem: { in: [1, 2] } }, orderBy: { ordem: 'asc' } });
    if (!grupo) throw new BadRequestException('Configure o plano de contas (grupo de Deduções) antes de devolver.');
    cat = await this.prisma.categoria.create({
      data: { nome: 'Devoluções de Vendas', tipo: grupo.tipo as any, natureza: 'OPERACIONAL' as any, grupoId: grupo.id, ordem: 0, ativo: true },
      select: { id: true },
    });
    return cat.id;
  }

  /** Carrega a venda + itens + a forma principal do recebimento (maior valor). */
  private async carregar(appointmentId: string) {
    const ap = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true, numeroVenda: true, date: true, value: true, tutorId: true,
        tutor: { select: { name: true } }, pet: { select: { name: true } },
        items: { select: { id: true, descricao: true, quantidade: true, valorUnitario: true, valorTotal: true, grupo: true, marca: true } },
        recebimentos: { select: { formas: true, valorTotal: true } },
      },
    });
    if (!ap) throw new BadRequestException('Venda não encontrada.');

    // forma principal = a de maior valor entre os recebimentos
    let melhor: { forma: string; valor: number; parcelas: number } | null = null;
    for (const rec of ap.recebimentos) {
      const formas = Array.isArray(rec.formas) ? (rec.formas as any[]) : [];
      for (const f of formas) {
        const val = Number(f?.valor) || 0;
        if (f?.forma && (!melhor || val > melhor.valor)) melhor = { forma: String(f.forma), valor: val, parcelas: Number(f?.parcelas) || 1 };
      }
    }
    return { ap, melhor };
  }

  private async taxaInfo(melhor: { forma: string; parcelas: number } | null): Promise<{ formaNome: string; parcelas: number; taxaPct: number }> {
    if (!melhor) return { formaNome: 'À vista', parcelas: 1, taxaPct: 0 };
    const parcelas = Math.max(1, Number(melhor.parcelas) || 1);
    const cfg = (await this.loadFormas()).get(this.norm(melhor.forma));
    let taxaPct = 0;
    if (cfg) {
      const ehCartaoPix = /pix|cart|cr[eé]dit|d[eé]bit|maquin/i.test(cfg.tipo);
      if (ehCartaoPix) taxaPct = Number(String(cfg.taxas?.[String(parcelas)] ?? cfg.taxas?.['1'] ?? '0').replace(',', '.')) || 0;
    }
    return { formaNome: melhor.forma, parcelas, taxaPct };
  }

  /** Prévia pra montar a tela: itens + forma + taxa + parcelas. */
  async preview(appointmentId: string) {
    const { ap, melhor } = await this.carregar(appointmentId);
    const { formaNome, parcelas, taxaPct } = await this.taxaInfo(melhor);
    const jaDevolvido = await this.prisma.listaItem.count({ where: { lista: 'devolucao_', valor: { contains: `"appointmentId":"${appointmentId}"` } } });
    return {
      venda: {
        id: ap.id,
        numeroVenda: ap.numeroVenda,
        tutor: ap.tutor?.name || 'Cliente',
        pet: ap.pet?.name || '',
        data: ap.date,
        valor: Number(ap.value || 0),
      },
      itens: ap.items.map((it) => ({
        id: it.id,
        descricao: it.descricao || 'Item',
        quantidade: it.quantidade || 1,
        valorTotal: Number(it.valorTotal || it.valorUnitario * (it.quantidade || 1) || 0),
      })),
      forma: { nome: formaNome, parcelas, taxaPct },
      jaDevolvido,
    };
  }

  /** Executa a devolução. dto = { itemIds?: string[]|null, forma: 'CREDITO'|'DINHEIRO', motivo }. */
  async devolver(appointmentId: string, dto: any, userId: string) {
    const motivo = String(dto?.motivo || '').trim();
    if (!motivo) throw new BadRequestException('Informe o motivo da devolução.');
    const formaEstorno = String(dto?.forma || 'CREDITO').toUpperCase() === 'DINHEIRO' ? 'DINHEIRO' : 'CREDITO';

    const { ap, melhor } = await this.carregar(appointmentId);
    if (!ap.tutorId) throw new BadRequestException('Venda sem cliente vinculado.');

    // itens selecionados (vazio/null = venda inteira)
    const pedidos: string[] = Array.isArray(dto?.itemIds) ? dto.itemIds.map(String) : [];
    const selecionados = pedidos.length ? ap.items.filter((it) => pedidos.includes(it.id)) : ap.items;
    if (!selecionados.length) throw new BadRequestException('Nenhum item selecionado para devolução.');

    const brutoCent = selecionados.reduce((s, it) => s + Math.round((Number(it.valorTotal || it.valorUnitario * (it.quantidade || 1)) || 0) * 100), 0);
    if (brutoCent <= 0) throw new BadRequestException('Valor da devolução inválido.');

    const { formaNome, parcelas, taxaPct } = await this.taxaInfo(melhor);
    const taxaCent = Math.round(brutoCent * (taxaPct / 100));
    const liquidoCent = brutoCent - taxaCent;
    const N = Math.max(1, parcelas);

    // rateio das parcelas (a última absorve o arredondamento)
    const base = Math.floor(liquidoCent / N);
    const parcelasCent = Array.from({ length: N }, (_, i) => (i < N - 1 ? base : liquidoCent - base * (N - 1)));

    const contaId = (formaEstorno === 'DINHEIRO' ? (await this.contaDinheiro()) : null) ?? (await this.contaPadrao());
    const unidadeId = (await this.unidadePadrao()) ?? undefined;
    if (!contaId) throw new BadRequestException('Cadastre uma conta financeira antes de devolver.');
    const categoriaId = await this.catDevolucao();

    const devId = randomUUID().slice(0, 8);
    const numTxt = ap.numeroVenda != null ? `#${ap.numeroVenda}` : ap.id.slice(0, 6);
    const hoje = new Date();

    // 1) N lançamentos de dedução "Devoluções de Vendas" (competência mês a mês)
    for (let p = 0; p < N; p++) {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() + p, hoje.getDate());
      const atual = p === 0;
      const desc = `Devolução venda ${numTxt}${N > 1 ? ` (${p + 1}/${N})` : ''} — ${motivo}`.slice(0, 180);
      try {
        await this.lancamentos.create({
          tipo: 'DESPESA' as any,
          valorCentavos: parcelasCent[p],
          data: mes.toISOString(),
          ...(atual ? { dataPagamento: mes.toISOString() } : { vencimento: mes.toISOString() }),
          descricao: desc,
          contaId, unidadeId, categoriaId,
          origem: 'CRM' as any,
          externalId: `devol:${appointmentId}:${devId}:${p}`,
          appointmentId: ap.id,
          tutorId: ap.tutorId,
          status: (atual ? 'CONFIRMADO' : 'PENDENTE') as any,
          aplicarRegras: false,
        } as any);
      } catch (e) {
        this.logger.warn(`devolucao lancamento ${devId}:${p} — ${String((e as any)?.message || e)}`);
        throw new BadRequestException('Falha ao lançar a devolução no Financeiro.');
      }
    }

    // 2) estorno ao cliente (crédito espelhado em N) — dinheiro fica registrado no Financeiro acima
    if (formaEstorno === 'CREDITO') {
      for (let p = 0; p < N; p++) {
        const mes = new Date(hoje.getFullYear(), hoje.getMonth() + p, hoje.getDate());
        try {
          await this.prisma.creditoMovimento.create({
            data: {
              tutorId: ap.tutorId,
              tipo: 'ESTORNO',
              valor: parcelasCent[p] / 100,
              descricao: `Devolução venda ${numTxt}${N > 1 ? ` (${p + 1}/${N})` : ''}`,
              appointmentId: ap.id,
              createdById: userId,
              data: mes,
            } as any,
          });
        } catch (e) {
          this.logger.warn(`devolucao credito ${devId}:${p} — ${String((e as any)?.message || e)}`);
        }
      }
    }

    // 3) registro da devolução (pra Consulta de vendas + auditoria)
    await this.prisma.listaItem.create({
      data: {
        lista: 'devolucao_',
        valor: JSON.stringify({
          id: devId,
          appointmentId: ap.id,
          numeroVenda: ap.numeroVenda,
          tutorId: ap.tutorId,
          tutor: ap.tutor?.name || '',
          itemIds: pedidos.length ? pedidos : 'TOTAL',
          brutoCent, taxaCent, liquidoCent,
          forma: formaEstorno, formaOriginal: formaNome, parcelas: N, taxaPct,
          motivo, userId, at: hoje.toISOString(),
        }),
      },
    });

    return {
      ok: true,
      devId,
      bruto: brutoCent / 100,
      taxa: taxaCent / 100,
      liquido: liquidoCent / 100,
      parcelas: N,
      forma: formaEstorno,
      parcelasValor: parcelasCent.map((c) => c / 100),
    };
  }
}
