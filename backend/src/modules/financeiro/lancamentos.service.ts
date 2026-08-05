import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLancamentoDto } from './dto/create-lancamento.dto';
import { UpdateLancamentoDto } from './dto/update-lancamento.dto';
import { BaixarLancamentoDto } from './dto/baixar-lancamento.dto';
import { ListarLancamentosDto } from './dto/listar-lancamentos.dto';
import { RegraLike, alvosDaRegra, encontrarRegra } from './classificacao.util';

@Injectable()
export class LancamentosService {
  constructor(private readonly prisma: PrismaService) {}

  private inicioDoMes(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  }

  /** {gte, lt} do mês "YYYY-MM"; undefined se não vier competência. */
  private rangeCompetencia(competencia?: string) {
    if (!competencia) return undefined;
    const [y, m] = competencia.split('-').map(Number);
    if (!y || !m) return undefined;
    return {
      gte: new Date(Date.UTC(y, m - 1, 1)),
      lt: new Date(Date.UTC(y, m, 1)),
    };
  }

  /** Dia `dia` no mês-alvo, usando o último dia em meses curtos (31 → 30/28). */
  private mesmoDiaEmOutroMes(base: Date, mesesAFrente: number): Date {
    const y = base.getUTCFullYear();
    const m = base.getUTCMonth() + mesesAFrente;
    const dia = base.getUTCDate();
    const ultimo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return new Date(Date.UTC(y, m, Math.min(dia, ultimo)));
  }

  /** Parcelado: cria N lançamentos (1/N..N/N), vencimentos mensais, valor POR parcela. */
  async criarParcelado(dto: CreateLancamentoDto) {
    const n = dto.parcelas!;
    if (!dto.vencimento) {
      throw new BadRequestException('Parcelamento precisa do vencimento da 1ª parcela.');
    }
    const base = new Date(dto.vencimento);
    const criados: any[] = [];
    for (let i = 0; i < n; i++) {
      const venc = this.mesmoDiaEmOutroMes(base, i);
      const criado = await this.create({
        ...dto,
        parcelas: undefined,
        vencimento: venc.toISOString(),
        competencia: undefined, // deriva do vencimento da parcela
        descricao: `${dto.descricao ?? 'Parcelado'} (${i + 1}/${n})`,
        // pagamento só se for da 1ª parcela e informado
        dataPagamento: i === 0 ? dto.dataPagamento : undefined,
      });
      criados.push(criado);
    }
    return { parcelas: n, lancamentos: criados };
  }

  async create(dto: CreateLancamentoDto) {
    if (dto.parcelas && dto.parcelas > 1) return this.criarParcelado(dto);
    // 1) classificação automática por regra (se habilitada)
    const regras: RegraLike[] =
      dto.aplicarRegras === false
        ? []
        : ((await this.prisma.regra.findMany({
            where: { ativo: true },
          })) as RegraLike[]);
    const regra = encontrarRegra(dto.descricao, dto.tipo, regras);
    const alvos = regra ? alvosDaRegra(regra) : {};

    // 2) resolver conta (obrigatória) e unidade (dto > regra > conta)
    const contaId = dto.contaId ?? alvos.contaId;
    if (!contaId) throw new BadRequestException('Conta é obrigatória.');

    let unidadeId = dto.unidadeId ?? alvos.unidadeId;
    if (!unidadeId) {
      const conta = await this.prisma.contaFinanceira.findUnique({
        where: { id: contaId },
      });
      unidadeId = conta?.unidadeId ?? undefined;
    }
    if (!unidadeId) {
      throw new BadRequestException(
        'Unidade é obrigatória — defina, vincule a conta a uma unidade, ou crie uma regra.',
      );
    }

    // 3) datas e status
    const data = dto.data ? new Date(dto.data) : new Date();
    const vencimento = dto.vencimento ? new Date(dto.vencimento) : null;
    const dataPagamento = dto.dataPagamento ? new Date(dto.dataPagamento) : null;
    const competencia = this.inicioDoMes(
      dto.competencia ? new Date(dto.competencia) : (vencimento ?? data),
    );
    // pago => CONFIRMADO; tem vencimento e não pago => PENDENTE (a pagar); senão CONFIRMADO
    const status =
      dto.status ?? (dataPagamento ? 'CONFIRMADO' : vencimento ? 'PENDENTE' : 'CONFIRMADO');

    return this.prisma.lancamento.create({
      data: {
        data,
        competencia,
        dataEmissao: dto.dataEmissao ? new Date(dto.dataEmissao) : null,
        vencimento,
        dataPagamento,
        tipo: dto.tipo,
        status: status as any,
        descricao: dto.descricao ?? null,
        numeroDocumento: dto.numeroDocumento ?? null,
        valorCentavos: dto.valorCentavos,
        jurosCentavos: dto.jurosCentavos ?? 0,
        multaCentavos: dto.multaCentavos ?? 0,
        descontoCentavos: dto.descontoCentavos ?? 0,
        origem: dto.origem ?? 'MANUAL',
        externalId: dto.externalId ?? null,
        unidadeId,
        categoriaId: dto.categoriaId ?? alvos.categoriaId ?? null,
        linhaServicoId: dto.linhaServicoId ?? alvos.linhaServicoId ?? null,
        marcaId: dto.marcaId ?? alvos.marcaId ?? null,
        contaId,
        contaDestinoId: dto.contaDestinoId ?? null,
        contatoId: dto.contatoId ?? null,
        formaPagamentoId: dto.formaPagamentoId ?? null,
        tutorId: dto.tutorId ?? null,
        appointmentId: dto.appointmentId ?? null,
      },
    });
  }

  findAll(q: ListarLancamentosDto) {
    const where: any = {};
    const range = this.rangeCompetencia(q.competencia);
    if (range) where.competencia = range;
    if (q.unidadeId) where.unidadeId = q.unidadeId;
    if (q.marcaId) where.marcaId = q.marcaId;
    if (q.linhaServicoId) where.linhaServicoId = q.linhaServicoId;

    switch (q.situacao) {
      case 'A_PAGAR':
        where.tipo = 'DESPESA';
        where.status = 'PENDENTE';
        break;
      case 'VENCIDAS':
        where.status = 'PENDENTE';
        where.vencimento = { lt: new Date() };
        break;
      case 'PAGAS':
        where.status = 'CONFIRMADO';
        break;
      case 'CONCILIADAS':
        where.status = 'CONCILIADO';
        break;
      case 'A_CLASSIFICAR':
        where.categoriaId = null;
        break;
    }

    if (q.busca) {
      where.OR = [
        { descricao: { contains: q.busca, mode: 'insensitive' } },
        { numeroDocumento: { contains: q.busca, mode: 'insensitive' } },
      ];
    }

    return this.prisma.lancamento.findMany({
      where,
      orderBy: { data: 'desc' },
      take: 500,
    });
  }

  async findOne(id: string) {
    const l = await this.prisma.lancamento.findUnique({ where: { id } });
    if (!l) throw new NotFoundException('Lançamento não encontrado');
    return l;
  }

  async update(id: string, dto: UpdateLancamentoDto) {
    await this.findOne(id);
    const data: any = { ...dto };
    // normaliza datas string -> Date
    for (const campo of ['data', 'competencia', 'dataEmissao', 'vencimento', 'dataPagamento']) {
      if (data[campo]) data[campo] = new Date(data[campo]);
    }
    delete data.aplicarRegras;
    return this.prisma.lancamento.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.lancamento.delete({ where: { id } });
    return { message: 'Lançamento excluído' };
  }

  /** Dá baixa: marca pagamento efetivo, status CONFIRMADO e a composição (juros/multa/desconto). */
  async baixar(id: string, dto: BaixarLancamentoDto) {
    await this.findOne(id);
    return this.prisma.lancamento.update({
      where: { id },
      data: {
        dataPagamento: new Date(dto.dataPagamento),
        status: 'CONFIRMADO',
        contaId: dto.contaId ?? undefined,
        jurosCentavos: dto.jurosCentavos ?? undefined,
        multaCentavos: dto.multaCentavos ?? undefined,
        descontoCentavos: dto.descontoCentavos ?? undefined,
      },
    });
  }

  /** KPIs do topo: receitas/despesas do mês + a pagar/vencidos/a classificar (corrente). */
  async resumo(competencia?: string) {
    const range = this.rangeCompetencia(competencia);
    const periodo = range ? { competencia: range } : {};
    const agora = new Date();

    const [rec, desp, aPagar, vencidos, aClassificar] = await Promise.all([
      this.prisma.lancamento.aggregate({
        _sum: { valorCentavos: true },
        where: { ...periodo, tipo: 'RECEITA' },
      }),
      this.prisma.lancamento.aggregate({
        _sum: { valorCentavos: true },
        where: { ...periodo, tipo: 'DESPESA' },
      }),
      this.prisma.lancamento.aggregate({
        _sum: { valorCentavos: true },
        _count: true,
        where: { tipo: 'DESPESA', status: 'PENDENTE' },
      }),
      this.prisma.lancamento.aggregate({
        _sum: { valorCentavos: true },
        _count: true,
        where: { tipo: 'DESPESA', status: 'PENDENTE', vencimento: { lt: agora } },
      }),
      this.prisma.lancamento.count({ where: { categoriaId: null } }),
    ]);

    return {
      receitasCentavos: rec._sum.valorCentavos ?? 0,
      despesasCentavos: desp._sum.valorCentavos ?? 0,
      aPagarCentavos: aPagar._sum.valorCentavos ?? 0,
      aPagarQtd: aPagar._count,
      vencidosCentavos: vencidos._sum.valorCentavos ?? 0,
      vencidosQtd: vencidos._count,
      aClassificarQtd: aClassificar,
    };
  }
}
