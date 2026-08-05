import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecorrenciaDto } from './dto/create-recorrencia.dto';
import { UpdateRecorrenciaDto } from './dto/update-recorrencia.dto';

/**
 * Recorrências: contas que se lançam sozinhas (aluguel, salários, franquia…).
 *
 * Geração LAZY e idempotente: toda vez que a agenda é carregada, `gerarPendentes()`
 * materializa as ocorrências cujo vencimento cai dentro da antecedência (default 30 dias).
 * O unique (recorrenciaId, vencimento) no banco garante que nada é gerado duas vezes.
 */
@Injectable()
export class RecorrenciasService {
  constructor(private readonly prisma: PrismaService) {}

  /* ---------- CRUD ---------- */

  create(dto: CreateRecorrenciaDto) {
    return this.prisma.recorrencia.create({ data: { ...dto } });
  }

  findAll() {
    return this.prisma.recorrencia.findMany({
      orderBy: [{ ativo: 'desc' }, { descricao: 'asc' }],
    });
  }

  async findOne(id: string) {
    const r = await this.prisma.recorrencia.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Recorrência não encontrada');
    return r;
  }

  async update(id: string, dto: UpdateRecorrenciaDto) {
    await this.findOne(id);
    return this.prisma.recorrencia.update({ where: { id }, data: { ...dto } });
  }

  async remove(id: string) {
    await this.findOne(id);
    // desvincula os lançamentos já gerados (histórico fica) e apaga a recorrência
    await this.prisma.lancamento.updateMany({
      where: { recorrenciaId: id },
      data: { recorrenciaId: null },
    });
    await this.prisma.recorrencia.delete({ where: { id } });
    return { message: 'Recorrência excluída (lançamentos já gerados foram mantidos)' };
  }

  /* ---------- motor de geração ---------- */

  private hojeUTC(): Date {
    const n = new Date();
    return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
  }

  private addDias(d: Date, n: number): Date {
    return new Date(d.getTime() + n * 86400000);
  }

  /** Dia `dia` no mês de (y, m), usando o último dia em meses curtos (31 → 30/28). */
  private diaNoMes(y: number, m: number, dia: number): Date {
    const ultimo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return new Date(Date.UTC(y, m, Math.min(dia, ultimo)));
  }

  /** Próximo vencimento depois de `ultimo` (ou o primeiro >= hoje, se nunca gerou). */
  private proximoVencimento(
    r: { frequencia: string; dia: number; mesReferencia: number | null },
    ultimo: Date | null,
    hoje: Date,
  ): Date {
    if (r.frequencia === 'SEMANAL') {
      if (ultimo) return this.addDias(ultimo, 7);
      const diff = ((r.dia % 7) - hoje.getUTCDay() + 7) % 7;
      return this.addDias(hoje, diff);
    }
    if (r.frequencia === 'ANUAL') {
      const mes = (r.mesReferencia ?? 1) - 1;
      if (ultimo) return this.diaNoMes(ultimo.getUTCFullYear() + 1, mes, r.dia);
      const esteAno = this.diaNoMes(hoje.getUTCFullYear(), mes, r.dia);
      return esteAno >= hoje ? esteAno : this.diaNoMes(hoje.getUTCFullYear() + 1, mes, r.dia);
    }
    // MENSAL
    if (ultimo) return this.diaNoMes(ultimo.getUTCFullYear(), ultimo.getUTCMonth() + 1, r.dia);
    const esteMes = this.diaNoMes(hoje.getUTCFullYear(), hoje.getUTCMonth(), r.dia);
    return esteMes >= hoje
      ? esteMes
      : this.diaNoMes(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, r.dia);
  }

  /** Materializa as ocorrências devidas (vencimento até hoje+antecedência). Idempotente. */
  async gerarPendentes(): Promise<{ criadas: number }> {
    const ativas = await this.prisma.recorrencia.findMany({ where: { ativo: true } });
    const hoje = this.hojeUTC();
    let criadas = 0;

    for (const r of ativas) {
      const limite = this.addDias(hoje, r.antecedenciaDias);
      let ultimo = r.ultimoVencimentoGerado;
      let geradas = r.geradas;
      let mudou = false;

      // trava de segurança: no máximo 24 ocorrências por rodada
      for (let i = 0; i < 24; i++) {
        if (r.maxOcorrencias && geradas >= r.maxOcorrencias) break;
        const prox = this.proximoVencimento(r, ultimo, hoje);
        if (prox > limite) break;
        if (r.terminaEm && prox > r.terminaEm) break;

        try {
          await this.prisma.lancamento.create({
            data: {
              data: new Date(),
              competencia: new Date(Date.UTC(prox.getUTCFullYear(), prox.getUTCMonth(), 1)),
              vencimento: prox,
              tipo: r.tipo,
              status: 'PENDENTE',
              descricao: r.descricao,
              valorCentavos: r.valorCentavos,
              unidadeId: r.unidadeId,
              contaId: r.contaId,
              categoriaId: r.categoriaId ?? null,
              marcaId: r.marcaId ?? null,
              linhaServicoId: r.linhaServicoId ?? null,
              recorrenciaId: r.id,
            },
          });
          criadas++;
        } catch (e: any) {
          if (e?.code !== 'P2002') throw e; // P2002 = já gerada (unique) — segue
        }
        ultimo = prox;
        geradas++;
        mudou = true;
      }

      if (mudou) {
        await this.prisma.recorrencia.update({
          where: { id: r.id },
          data: { ultimoVencimentoGerado: ultimo, geradas },
        });
      }
    }
    return { criadas };
  }

  /* ---------- agenda de vencimentos ---------- */

  async agenda(q: { filtro?: 'TODAS' | 'A_PAGAR' | 'A_RECEBER'; ate?: string; unidadeId?: string }) {
    await this.gerarPendentes();

    const hoje = this.hojeUTC();
    const amanha = this.addDias(hoje, 1);
    const seteDias = this.addDias(hoje, 8);

    const where: any = { status: 'PENDENTE' };
    if (q.filtro === 'A_PAGAR') where.tipo = 'DESPESA';
    else if (q.filtro === 'A_RECEBER') where.tipo = 'RECEITA';
    else where.tipo = { in: ['DESPESA', 'RECEITA'] };
    if (q.unidadeId) where.unidadeId = q.unidadeId;
    if (q.ate) where.vencimento = { lte: new Date(q.ate) };

    const itens = await this.prisma.lancamento.findMany({
      where,
      orderBy: [{ vencimento: 'asc' }, { data: 'asc' }],
      take: 300,
    });

    const basePagar = { tipo: 'DESPESA' as const, status: 'PENDENTE' as const };
    const [vencidas, vencemHoje, prox7, aReceber] = await Promise.all([
      this.prisma.lancamento.aggregate({
        _sum: { valorCentavos: true }, _count: true,
        where: { ...basePagar, vencimento: { lt: hoje } },
      }),
      this.prisma.lancamento.aggregate({
        _sum: { valorCentavos: true }, _count: true,
        where: { ...basePagar, vencimento: { gte: hoje, lt: amanha } },
      }),
      this.prisma.lancamento.aggregate({
        _sum: { valorCentavos: true }, _count: true,
        where: { ...basePagar, vencimento: { gte: amanha, lt: seteDias } },
      }),
      this.prisma.lancamento.aggregate({
        _sum: { valorCentavos: true }, _count: true,
        where: { tipo: 'RECEITA', status: 'PENDENTE' },
      }),
    ]);

    const kpi = (a: { _sum: { valorCentavos: number | null }; _count: number }) => ({
      valorCentavos: a._sum.valorCentavos ?? 0,
      qtd: a._count,
    });

    return {
      resumo: {
        vencidas: kpi(vencidas),
        vencemHoje: kpi(vencemHoje),
        proximos7: kpi(prox7),
        aReceber: kpi(aReceber),
      },
      itens,
    };
  }
}
