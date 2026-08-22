import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecebimentosService } from './recebimentos.service';

/**
 * DRE gerencial por competência.
 *
 * Estrutura (aprovada no mockup):
 *   Receita Bruta → (−) Deduções → = Receita Líquida
 *   → (−) Custos Variáveis → = Margem de Contribuição
 *   → (−) Custos e Despesas Fixas → = EBITDA
 *   → (−) Financeiras (inclui juros/multa das baixas) → (±) Não operacionais → = Resultado
 *
 * Fora do resultado: Investimentos (capex), Financiamento, Distribuição, Transferências.
 * Lançamentos sem categoria = "a classificar" — ficam de fora e são sinalizados.
 *
 * Regras de bucket (por categoria):
 *   - natureza INVESTIMENTO/FINANCIAMENTO → fora do resultado
 *   - natureza NAO_OPERACIONAL → linha "não operacionais" (grupo 10 Distribuição → fora)
 *   - OPERACIONAL + RECEITA → Receita Bruta
 *   - OPERACIONAL + DESPESA: grupo 1 (redutora) e 2 → Deduções · grupo 5 → Financeiras
 *     · comportamento VARIAVEL → Custos Variáveis · resto → Fixas
 */

export interface DreFiltros {
  competencia: string; // YYYY-MM
  unidadeId?: string;
  marcaId?: string;
  linhaServicoId?: string;
  regime?: 'CAIXA' | 'COMPETENCIA'; // CAIXA = pela data que o $ moveu (realizado); COMPETENCIA = quando foi ganho/incorrido
}

interface Detalhe {
  nome: string;
  valorCentavos: number;
}

export interface DreCalculado {
  competencia: string;
  receitaBruta: number;
  deducoes: number;
  receitaLiquida: number;
  custosVariaveis: number;
  margemContribuicao: number;
  fixas: number;
  ebitda: number;
  financeiras: number;
  naoOperacionais: number; // líquido: positivo aumenta o resultado
  resultado: number;
  fora: {
    investimentos: number; // capex (positivo = investido)
    financiamento: number; // líquido: entradas − pagamentos
    distribuicao: number;
    transferencias: number;
  };
  aClassificar: { qtd: number; valorCentavos: number };
  detalhes: Record<string, Detalhe[]>;
}

const LINHAS_DETALHE = [
  'receitaBruta',
  'deducoes',
  'custosVariaveis',
  'fixas',
  'financeiras',
  'naoOperacionais',
] as const;

@Injectable()
export class DreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recebimentos: RecebimentosService,
  ) {}

  private range(competencia: string) {
    const [y, m] = (competencia || '').split('-').map(Number);
    if (!y || !m) throw new BadRequestException('Competência inválida (use YYYY-MM).');
    return {
      gte: new Date(Date.UTC(y, m - 1, 1)),
      lt: new Date(Date.UTC(y, m, 1)),
    };
  }

  async calcular(f: DreFiltros): Promise<DreCalculado> {
    // Regime CAIXA: agrupa pela DATA em que o dinheiro entrou/saiu (dataPagamento) e só o REALIZADO.
    // Regime COMPETÊNCIA (padrão): agrupa pela competência (quando foi ganho/incorrido, inclui pendente).
    const where: any = f.regime === 'CAIXA'
      ? { dataPagamento: this.range(f.competencia), status: { in: ['CONFIRMADO', 'CONCILIADO'] } }
      : { competencia: this.range(f.competencia) };
    if (f.unidadeId) where.unidadeId = f.unidadeId;
    if (f.marcaId) where.marcaId = f.marcaId;
    if (f.linhaServicoId === '__SEM__') where.linhaServicoId = null; // P2.2: coluna "Sem departamento"
    else if (f.linhaServicoId) where.linhaServicoId = f.linhaServicoId;

    const [lancs, cats] = await Promise.all([
      this.prisma.lancamento.findMany({
        where,
        select: {
          tipo: true,
          valorCentavos: true,
          jurosCentavos: true,
          multaCentavos: true,
          descontoCentavos: true,
          categoriaId: true,
        },
      }),
      this.prisma.categoria.findMany({ include: { grupo: true } }),
    ]);
    const catById = new Map(cats.map((c) => [c.id, c]));

    const soma = {
      receitaBruta: 0,
      deducoes: 0,
      custosVariaveis: 0,
      fixas: 0,
      financeiras: 0,
      naoOperacionais: 0,
    };
    const fora = { investimentos: 0, financiamento: 0, distribuicao: 0, transferencias: 0 };
    const aClassificar = { qtd: 0, valorCentavos: 0 };
    const det = new Map<string, Map<string, Detalhe>>(
      LINHAS_DETALHE.map((k) => [k, new Map()]),
    );

    const add = (linha: (typeof LINHAS_DETALHE)[number], chave: string, nome: string, v: number) => {
      soma[linha] += v;
      const m = det.get(linha)!;
      const item = m.get(chave) || { nome, valorCentavos: 0 };
      item.valorCentavos += v;
      m.set(chave, item);
    };

    for (const l of lancs) {
      // Juros/multa da baixa → Financeiras; desconto obtido → Não operacionais (positivo).
      const jm = (l.jurosCentavos || 0) + (l.multaCentavos || 0);
      if (jm) add('financeiras', '_juros_multa', 'Juros e multas pagos (baixas)', jm);
      const desc = l.descontoCentavos || 0;
      if (desc) add('naoOperacionais', '_descontos', 'Descontos obtidos (baixas)', desc);

      if (l.tipo === 'TRANSFERENCIA') {
        fora.transferencias += l.valorCentavos;
        continue;
      }
      const cat = l.categoriaId ? catById.get(l.categoriaId) : null;
      if (!cat) {
        aClassificar.qtd++;
        aClassificar.valorCentavos += l.valorCentavos;
        continue;
      }

      const v = l.valorCentavos;
      const ordem = cat.grupo?.ordem ?? 99;
      const chave = cat.id;

      if (cat.natureza === 'INVESTIMENTO') {
        fora.investimentos += l.tipo === 'DESPESA' ? v : -v;
      } else if (cat.natureza === 'FINANCIAMENTO') {
        fora.financiamento += l.tipo === 'RECEITA' ? v : -v;
      } else if (cat.natureza === 'NAO_OPERACIONAL') {
        if (ordem === 10) fora.distribuicao += v;
        else add('naoOperacionais', chave, cat.nome, l.tipo === 'RECEITA' ? v : -v);
      } else {
        // OPERACIONAL
        if (l.tipo === 'RECEITA') add('receitaBruta', chave, cat.nome, v);
        else if (ordem === 1 || ordem === 2) add('deducoes', chave, cat.nome, v);
        else if (ordem === 5) add('financeiras', chave, cat.nome, v);
        else if (cat.comportamento === 'VARIAVEL') add('custosVariaveis', chave, cat.nome, v);
        else add('fixas', chave, cat.nome, v);
      }
    }

    const receitaLiquida = soma.receitaBruta - soma.deducoes;
    const margemContribuicao = receitaLiquida - soma.custosVariaveis;
    const ebitda = margemContribuicao - soma.fixas;
    const resultado = ebitda - soma.financeiras + soma.naoOperacionais;

    const detalhes: Record<string, Detalhe[]> = {};
    for (const k of LINHAS_DETALHE) {
      detalhes[k] = [...det.get(k)!.values()].sort(
        (a, b) => Math.abs(b.valorCentavos) - Math.abs(a.valorCentavos),
      );
    }

    return {
      competencia: f.competencia,
      receitaBruta: soma.receitaBruta,
      deducoes: soma.deducoes,
      receitaLiquida,
      custosVariaveis: soma.custosVariaveis,
      margemContribuicao,
      fixas: soma.fixas,
      ebitda,
      financeiras: soma.financeiras,
      naoOperacionais: soma.naoOperacionais,
      resultado,
      fora,
      aClassificar,
      detalhes,
    };
  }

  /** Endpoint: consolidado (com comparação opcional) ou por unidade lado a lado. */
  async dre(params: {
    competencia: string;
    comparar?: string;
    unidadeId?: string;
    marcaId?: string;
    linhaServicoId?: string;
    modo?: 'CONSOLIDADO' | 'POR_UNIDADE' | 'POR_LINHA';
    regime?: 'CAIXA' | 'COMPETENCIA';
  }) {
    // LAZY: transforma vendas concluídas do caixa em receita antes de calcular (best-effort).
    await this.recebimentos.processar().catch(() => {});
    const filtros: DreFiltros = {
      competencia: params.competencia,
      regime: params.regime === 'CAIXA' ? 'CAIXA' : 'COMPETENCIA',
      unidadeId: params.unidadeId,
      marcaId: params.marcaId,
      linhaServicoId: params.linhaServicoId,
    };

    if (params.modo === 'POR_UNIDADE') {
      const unidades = await this.prisma.unidade.findMany({
        where: { ativo: true },
        orderBy: { nome: 'asc' },
        select: { id: true, nome: true, tipo: true },
      });
      const porUnidade = await Promise.all(
        unidades.map(async (u) => ({
          unidade: u,
          dre: await this.calcular({ ...filtros, unidadeId: u.id }),
        })),
      );
      const consolidado = await this.calcular({ ...filtros, unidadeId: undefined });
      return { modo: 'POR_UNIDADE', competencia: params.competencia, porUnidade, consolidado };
    }

    if (params.modo === 'POR_LINHA') {
      // Departamentos lado a lado. Fixas não têm linha → cada departamento naturalmente
      // para na MARGEM DE CONTRIBUIÇÃO (decisão de negócio: EBITDA só por unidade/consolidado).
      const linhas = await this.prisma.linhaServico.findMany({
        where: { ativo: true },
        orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
        select: { id: true, nome: true },
      });
      const porLinha = await Promise.all(
        linhas.map(async (l) => ({
          linha: l,
          dre: await this.calcular({ ...filtros, linhaServicoId: l.id }),
        })),
      );
      const consolidado = await this.calcular({ ...filtros, linhaServicoId: undefined });
      // P2.2: receita/custo SEM de-para de departamento não aparecia em nenhuma coluna (só no consolidado).
      // Adiciona a coluna "Sem departamento" pra nada ficar escondido — só quando tem valor.
      const semDep = await this.calcular({ ...filtros, linhaServicoId: '__SEM__' });
      const temSemDep = (semDep.receitaBruta || 0) !== 0 || (semDep.receitaLiquida || 0) !== 0 || (semDep.margemContribuicao || 0) !== 0 || (semDep.custosVariaveis || 0) !== 0;
      const porLinhaFinal = temSemDep ? [...porLinha, { linha: { id: '__SEM__', nome: 'Sem departamento' }, dre: semDep }] : porLinha;
      return { modo: 'POR_LINHA', competencia: params.competencia, porLinha: porLinhaFinal, consolidado };
    }

    const atual = await this.calcular(filtros);
    const comparacao = params.comparar
      ? await this.calcular({ ...filtros, competencia: params.comparar })
      : null;
    return { modo: 'CONSOLIDADO', competencia: params.competencia, atual, comparacao };
  }
}
