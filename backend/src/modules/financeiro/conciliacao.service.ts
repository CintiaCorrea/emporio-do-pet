import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LancamentosService } from './lancamentos.service';
import { normalizar } from './classificacao.util';
import {
  PreviewConciliacaoDto,
  ConfirmarConciliacaoDto,
  LinhaExtratoDto,
} from './dto/conciliacao.dto';

type Sugestao = 'CONCILIAR' | 'CRIAR' | 'JA_IMPORTADA';

@Injectable()
export class ConciliacaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lancamentos: LancamentosService,
  ) {}

  /** Chave estável para deduplicar uma linha de extrato. */
  private eid(l: { data: string; valorCentavos: number; descricao?: string }): string {
    const dia = new Date(l.data).toISOString().slice(0, 10);
    return `${dia}|${l.valorCentavos}|${normalizar(l.descricao)}`;
  }

  /**
   * Casa cada linha do extrato com um lançamento pendente (mesmo tipo, valor próximo,
   * data dentro da janela). Sem par = criar. Já importada = ignora (dedup).
   */
  async preview(dto: PreviewConciliacaoDto) {
    const tolDias = dto.toleranciaDias ?? 15;
    // Pool de casamento: contas a pagar/receber PENDENTES (manuais) + receitas/despesas do
    // CAIXA já CONFIRMADAS mas ainda não batidas com o banco. Sem isso o extrato não enxerga
    // as vendas do caixa (elas nascem CONFIRMADO) e sugeria "criar" (duplicava). CONCILIADO fica
    // de fora (já batido). TRANSFERENCIA idem (extrato traz receita/despesa, não transferência).
    const pendentes = await this.prisma.lancamento.findMany({
      where: { status: { in: ['PENDENTE', 'CONFIRMADO'] }, tipo: { in: ['RECEITA', 'DESPESA'] } },
    });

    const eids = dto.linhas.map((l) => l.externalId || this.eid(l));
    const jaImport = await this.prisma.lancamento.findMany({
      where: { origem: 'MEU_DINHEIRO', externalId: { in: eids } },
      select: { externalId: true },
    });
    const setImport = new Set(jaImport.map((x) => x.externalId));

    const usados = new Set<string>();
    const linhas = dto.linhas.map((linha) => {
      const eid = linha.externalId || this.eid(linha);
      if (setImport.has(eid)) {
        return { linha, eid, sugestao: 'JA_IMPORTADA' as Sugestao, match: null, diferencaCentavos: 0 };
      }

      let best: (typeof pendentes)[number] | null = null;
      let bestDiff = Infinity;
      for (const p of pendentes) {
        if (usados.has(p.id)) continue;
        if (p.tipo !== linha.tipo) continue;
        const diff = Math.abs(linha.valorCentavos - p.valorCentavos);
        const tolValor = Math.max(Math.round(p.valorCentavos * 0.3), 5000); // 30% ou R$50
        if (diff > tolValor) continue;
        // Janela de data: PENDENTE compara pelo vencimento; CONFIRMADO (venda do caixa, sem
        // vencimento) compara pela data em que o $ entrou (dataPagamento) ou pela data do lançamento.
        const refData = p.vencimento ?? p.dataPagamento ?? p.data;
        if (refData) {
          const dd = Math.abs(
            (new Date(linha.data).getTime() - new Date(refData).getTime()) / 86400000,
          );
          if (dd > tolDias) continue;
        }
        if (diff < bestDiff) {
          bestDiff = diff;
          best = p;
        }
      }

      if (best) {
        usados.add(best.id);
        // >0 => banco pagou a mais (juros/multa); <0 => a menos (desconto)
        const diferenca = linha.valorCentavos - best.valorCentavos;
        return { linha, eid, sugestao: 'CONCILIAR' as Sugestao, match: best, diferencaCentavos: diferenca };
      }
      return { linha, eid, sugestao: 'CRIAR' as Sugestao, match: null, diferencaCentavos: 0 };
    });

    const resumo = {
      total: linhas.length,
      conciliar: linhas.filter((l) => l.sugestao === 'CONCILIAR').length,
      criar: linhas.filter((l) => l.sugestao === 'CRIAR').length,
      jaImportadas: linhas.filter((l) => l.sugestao === 'JA_IMPORTADA').length,
    };
    return { resumo, linhas };
  }

  /** Aplica as ações confirmadas: concilia os pendentes casados, cria os sem par. */
  async confirmar(dto: ConfirmarConciliacaoDto) {
    let conciliados = 0;
    let criados = 0;
    let ignorados = 0;

    for (const a of dto.acoes) {
      if (a.tipo === 'CONCILIAR' && a.lancamentoId) {
        const dataPg = a.dataPagamento ? new Date(a.dataPagamento) : new Date();
        const conciliado = await this.prisma.lancamento.update({
          where: { id: a.lancamentoId },
          data: {
            status: 'CONCILIADO',
            dataPagamento: dataPg,
            jurosCentavos: a.jurosCentavos ?? undefined,
            multaCentavos: a.multaCentavos ?? undefined,
            descontoCentavos: a.descontoCentavos ?? undefined,
          },
        });
        // Receita que caiu líquida (link/cartão): a diferença vira Taxa Operadora de Cartão
        // (dedução, grupo 2) — a receita fica BRUTA no DRE e o caixa fecha com o banco.
        // Só cria a taxa aqui se a venda NÃO for do caixa (origem CRM) — pra venda do caixa a taxa
        // já é lançada automaticamente pelo recebimento (evita taxa duplicada). E com externalId
        // pra não repetir se a mesma linha for reconciliada de novo.
        if (a.taxaCartaoCentavos && a.taxaCartaoCentavos > 0 && (conciliado.origem as any) !== 'CRM') {
          const catTaxa = await this.prisma.categoria.findFirst({
            where: { nome: { contains: 'Taxa Operadora' } },
          });
          try {
            await this.prisma.lancamento.create({
              data: {
                data: dataPg,
                competencia: new Date(
                  Date.UTC(dataPg.getUTCFullYear(), dataPg.getUTCMonth(), 1),
                ),
                dataPagamento: dataPg,
                tipo: 'DESPESA',
                status: 'CONCILIADO',
                descricao: `Taxa de cartão — ${conciliado.descricao ?? 'venda por link'}`,
                valorCentavos: a.taxaCartaoCentavos,
                unidadeId: conciliado.unidadeId,
                contaId: conciliado.contaId,
                categoriaId: catTaxa?.id ?? null,
                marcaId: conciliado.marcaId,
                linhaServicoId: conciliado.linhaServicoId,
                origem: 'MEU_DINHEIRO' as any,
                externalId: `taxa-concil:${a.lancamentoId}`,
              },
            });
          } catch { /* já existe (unique origem+externalId) — não duplica */ }
        }
        conciliados++;
      } else if (a.tipo === 'CRIAR' && a.linha) {
        const linha: LinhaExtratoDto = a.linha;
        try {
          await this.lancamentos.create({
            tipo: linha.tipo,
            valorCentavos: linha.valorCentavos,
            data: linha.data,
            dataPagamento: linha.data,
            descricao: linha.descricao,
            numeroDocumento: linha.documento,
            contaId: a.contaId,
            origem: 'MEU_DINHEIRO' as any,
            externalId: a.externalId || this.eid(linha),
            status: 'CONCILIADO' as any,
          });
          criados++;
        } catch (e: any) {
          // P2002 = já existe (origem, externalId) — dedup, ignora
          if (e?.code === 'P2002') ignorados++;
          else throw e;
        }
      }
    }
    return { conciliados, criados, ignorados };
  }
}
