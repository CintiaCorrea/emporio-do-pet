import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateFaturamentoDto,
  UpdateFaturamentoDto,
  CreateEmprestimoDto,
  PagarParcelaDto,
} from './dto/parceria.dto';

/**
 * Parceria (split Finpet) + empréstimo interno.
 *
 * Split — regra confirmada (23/07): base = bruto − taxa; nosso = %daUnidade × base
 * (MAP HVG = 65%); parceira = base − nosso. O bruto e a parte da parceira são
 * INFORMATIVOS — nunca somam na receita (a receita é o líquido que cai no caixa).
 *
 * Empréstimo interno: fora do resultado. Devolver parcela cria uma transferência
 * NEUTRA (tipo TRANSFERENCIA) que o DRE já ignora.
 */
@Injectable()
export class ParceriaService {
  constructor(private readonly prisma: PrismaService) {}

  private inicioDoMes(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  }

  private rangeCompetencia(competencia?: string) {
    if (!competencia) return undefined;
    const [y, m] = competencia.split('-').map(Number);
    if (!y || !m) return undefined;
    return { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) };
  }

  /* ---------- faturamento bruto (Finpet) ---------- */

  async listarFaturamentos(q: { unidadeId?: string; competencia?: string }) {
    const where: any = {};
    if (q.unidadeId) where.unidadeId = q.unidadeId;
    const range = this.rangeCompetencia(q.competencia);
    if (range) where.competencia = range;

    const itens = await this.prisma.faturamentoBruto.findMany({
      where,
      orderBy: { data: 'asc' },
    });
    const resumo = {
      brutoCentavos: itens.reduce((s, i) => s + i.brutoCentavos, 0),
      taxaCentavos: itens.reduce((s, i) => s + i.taxaCartaoCentavos, 0),
      parceiraCentavos: itens.reduce((s, i) => s + i.parceiraCentavos, 0),
      nosCentavos: itens.reduce((s, i) => s + i.nosCentavos, 0),
      registros: itens.length,
    };
    return { resumo, itens };
  }

  /** Calcula o split pela regra confirmada (base = bruto − taxa; nosso = % × base). */
  private async calcularSplit(dto: {
    unidadeId: string;
    brutoCentavos: number;
    taxaCartaoCentavos?: number;
    baseCentavos?: number;
    nosCentavos?: number;
    parceiraCentavos?: number;
  }) {
    let taxa = dto.taxaCartaoCentavos;
    if (taxa === undefined && dto.baseCentavos !== undefined) {
      taxa = dto.brutoCentavos - dto.baseCentavos;
    }
    taxa = Math.max(0, taxa ?? 0);
    const base = dto.brutoCentavos - taxa;
    if (base < 0) throw new BadRequestException('Taxa maior que o bruto — confira os valores.');

    let nos = dto.nosCentavos;
    if (nos === undefined) {
      const unidade = await this.prisma.unidade.findUnique({ where: { id: dto.unidadeId } });
      if (!unidade) throw new NotFoundException('Unidade não encontrada');
      const perc = unidade.percentualNos ? Number(unidade.percentualNos) : 0.65;
      nos = Math.round(base * perc);
    }
    const parceira = dto.parceiraCentavos ?? base - nos;
    return { taxaCartaoCentavos: taxa, nosCentavos: nos, parceiraCentavos: parceira };
  }

  async criarFaturamento(dto: CreateFaturamentoDto) {
    const split = await this.calcularSplit(dto);
    const data = new Date(dto.data);
    return this.prisma.faturamentoBruto.create({
      data: {
        unidadeId: dto.unidadeId,
        data,
        competencia: this.inicioDoMes(dto.competencia ? new Date(dto.competencia) : data),
        brutoCentavos: dto.brutoCentavos,
        ...split,
        lancamentoLiquidoId: dto.lancamentoLiquidoId ?? null,
        externalId: dto.externalId ?? null,
      },
    });
  }

  async atualizarFaturamento(id: string, dto: UpdateFaturamentoDto) {
    const atual = await this.prisma.faturamentoBruto.findUnique({ where: { id } });
    if (!atual) throw new NotFoundException('Registro não encontrado');
    const merged = {
      unidadeId: dto.unidadeId ?? atual.unidadeId,
      brutoCentavos: dto.brutoCentavos ?? atual.brutoCentavos,
      taxaCartaoCentavos: dto.taxaCartaoCentavos,
      baseCentavos: dto.baseCentavos,
      nosCentavos: dto.nosCentavos,
      parceiraCentavos: dto.parceiraCentavos,
    };
    // se nada de valores mudou, mantém; senão recalcula com o que veio
    const mexeuEmValor =
      dto.brutoCentavos !== undefined ||
      dto.taxaCartaoCentavos !== undefined ||
      dto.baseCentavos !== undefined ||
      dto.nosCentavos !== undefined ||
      dto.parceiraCentavos !== undefined;
    const split = mexeuEmValor
      ? await this.calcularSplit(merged)
      : {
          taxaCartaoCentavos: atual.taxaCartaoCentavos,
          nosCentavos: atual.nosCentavos,
          parceiraCentavos: atual.parceiraCentavos,
        };
    const data = dto.data ? new Date(dto.data) : atual.data;
    return this.prisma.faturamentoBruto.update({
      where: { id },
      data: {
        unidadeId: merged.unidadeId,
        data,
        competencia: dto.competencia
          ? this.inicioDoMes(new Date(dto.competencia))
          : atual.competencia,
        brutoCentavos: merged.brutoCentavos,
        ...split,
        lancamentoLiquidoId:
          dto.lancamentoLiquidoId !== undefined ? dto.lancamentoLiquidoId : atual.lancamentoLiquidoId,
      },
    });
  }

  async excluirFaturamento(id: string) {
    const f = await this.prisma.faturamentoBruto.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('Registro não encontrado');
    await this.prisma.faturamentoBruto.delete({ where: { id } });
    return { message: 'Registro excluído' };
  }

  /** Receitas da unidade no período — candidatas a "conciliar com o caixa". */
  candidatosVinculo(q: { unidadeId: string; competencia?: string }) {
    const where: any = { unidadeId: q.unidadeId, tipo: 'RECEITA' };
    const range = this.rangeCompetencia(q.competencia);
    if (range) where.competencia = range;
    return this.prisma.lancamento.findMany({
      where,
      orderBy: { data: 'desc' },
      take: 50,
      select: { id: true, data: true, descricao: true, valorCentavos: true, status: true },
    });
  }

  /* ---------- empréstimo interno ---------- */

  async criarEmprestimo(dto: CreateEmprestimoDto) {
    const n = dto.numParcelas;
    const base = dto.valorParcelaCentavos ?? Math.floor(dto.valorCentavos / n);
    const primeira = new Date(dto.primeiraParcela);

    const diaNoMes = (i: number) => {
      const y = primeira.getUTCFullYear();
      const m = primeira.getUTCMonth() + i;
      const ultimo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      return new Date(Date.UTC(y, m, Math.min(primeira.getUTCDate(), ultimo)));
    };

    return this.prisma.emprestimoInterno.create({
      data: {
        descricao: dto.descricao,
        unidadeTomadoraId: dto.unidadeTomadoraId,
        valorCentavos: dto.valorCentavos,
        data: new Date(dto.data),
        contaOrigemId: dto.contaOrigemId ?? null,
        contaDestinoId: dto.contaDestinoId ?? null,
        parcelas: {
          create: Array.from({ length: n }, (_, i) => ({
            numero: i + 1,
            vencimento: diaNoMes(i),
            // sem valor de parcela explícito: última parcela fecha o total
            valorCentavos:
              dto.valorParcelaCentavos ?? (i === n - 1 ? dto.valorCentavos - base * (n - 1) : base),
          })),
        },
      },
      include: { parcelas: { orderBy: { numero: 'asc' } } },
    });
  }

  async listarEmprestimos() {
    const emprestimos = await this.prisma.emprestimoInterno.findMany({
      orderBy: { data: 'desc' },
      include: { parcelas: { orderBy: { numero: 'asc' } } },
    });
    return emprestimos.map((e) => ({
      ...e,
      devolvidoCentavos: e.parcelas.filter((p) => p.pago).reduce((s, p) => s + p.valorCentavos, 0),
      pagas: e.parcelas.filter((p) => p.pago).length,
      proxima: e.parcelas.find((p) => !p.pago) ?? null,
    }));
  }

  /** Devolução: cria a transferência NEUTRA (unidade → sede) e marca a parcela paga. */
  async pagarParcela(parcelaId: string, dto: PagarParcelaDto) {
    const parcela = await this.prisma.parcelaEmprestimo.findUnique({
      where: { id: parcelaId },
      include: { emprestimo: true },
    });
    if (!parcela) throw new NotFoundException('Parcela não encontrada');
    if (parcela.pago) throw new BadRequestException('Parcela já está paga.');

    const emp = parcela.emprestimo;
    const contaId = dto.contaId ?? emp.contaDestinoId; // conta da unidade (de onde devolve)
    const contaDestinoId = dto.contaDestinoId ?? emp.contaOrigemId; // conta da sede (recebe)
    if (!contaId) {
      throw new BadRequestException('Informe a conta de onde sai a devolução.');
    }

    const dataPg = new Date(dto.dataPagamento);
    const lancamento = await this.prisma.lancamento.create({
      data: {
        data: dataPg,
        competencia: this.inicioDoMes(dataPg),
        dataPagamento: dataPg,
        tipo: 'TRANSFERENCIA', // neutra — o DRE ignora
        status: 'CONFIRMADO',
        descricao: `Devolução empréstimo — ${emp.descricao} (parcela ${parcela.numero})`,
        valorCentavos: parcela.valorCentavos,
        unidadeId: emp.unidadeTomadoraId,
        contaId,
        contaDestinoId: contaDestinoId ?? null,
      },
    });

    await this.prisma.parcelaEmprestimo.update({
      where: { id: parcelaId },
      data: { pago: true, dataPagamento: dataPg, lancamentoId: lancamento.id },
    });
    return { message: 'Devolução registrada (transferência neutra criada)', lancamentoId: lancamento.id };
  }

  async excluirEmprestimo(id: string) {
    const e = await this.prisma.emprestimoInterno.findUnique({ where: { id } });
    if (!e) throw new NotFoundException('Empréstimo não encontrado');
    await this.prisma.emprestimoInterno.delete({ where: { id } }); // parcelas caem em cascata
    return { message: 'Empréstimo excluído (transferências já geradas foram mantidas)' };
  }
}
