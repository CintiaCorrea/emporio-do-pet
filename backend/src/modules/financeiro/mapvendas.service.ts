import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LancamentosService } from './lancamentos.service';

/**
 * Importa VENDAS da MAP HVG a partir do CSV do SimplesVet (relatório de vendas).
 * A MAP usa um SimplesVet separado — as vendas dela NÃO estão no nosso caixa; entram por aqui.
 *
 * Formato do CSV (SimplesVet): `;` separado, campos entre aspas, decimais com vírgula.
 * Uma linha por ITEM; agrupa pela coluna "Venda". Colunas usadas: Data e hora, Venda,
 * Forma pagamento, Grupo, Produto/serviço, Bruto, Líquido.
 *
 * Cria receita em `fin_lancamentos` na unidade MAP HVG, classificada por departamento
 * (Grupo → de-para `config_depara_dep`, mesmo do caixa). Idempotente:
 * `origem=SIMPLESVET, externalId=mapv:<venda>:<grupoKey>`. Só escreve em `fin_` (regra 4).
 */
@Injectable()
export class MapVendasService {
  private readonly logger = new Logger(MapVendasService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly lancamentos: LancamentosService,
  ) {}

  private norm(s: string) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }
  private brl(s: string): number { const n = Number(String(s || '').replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; }
  private parseDataBR(s: string): Date | null {
    const m = String(s || '').trim().match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
    if (!m) return null;
    const [, d, mo, y, h = '12', mi = '00'] = m;
    return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
  }

  /** Parser CSV simples: `;` separador, campos entre aspas (com "" escapado). */
  private parseCsv(text: string): string[][] {
    const linhas = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim() !== '');
    return linhas.map((linha) => {
      const campos: string[] = [];
      let cur = '', dentro = false;
      for (let i = 0; i < linha.length; i++) {
        const c = linha[i];
        if (c === '"') {
          if (dentro && linha[i + 1] === '"') { cur += '"'; i++; }
          else dentro = !dentro;
        } else if (c === ';' && !dentro) { campos.push(cur); cur = ''; }
        else cur += c;
      }
      campos.push(cur);
      return campos.map((x) => x.trim());
    });
  }

  private async loadDepara(): Promise<Record<string, string>> {
    const item = await this.prisma.listaItem.findFirst({ where: { lista: 'config_depara_dep' } });
    if (!item) return {};
    try {
      const v = JSON.parse(item.valor); const map = v?.map || {};
      const out: Record<string, string> = {};
      for (const [k, id] of Object.entries(map)) if (id) out[this.norm(k)] = String(id);
      return out;
    } catch { return {}; }
  }

  async importar(csvText: string, unidadeId?: string): Promise<{ linhas: number; vendas: number; lancamentos: number; atualizados: number; semDepara: number; total: number; unidade: string }> {
    const linhas = this.parseCsv(csvText);
    if (linhas.length < 2) throw new BadRequestException('CSV vazio ou sem cabeçalho.');

    // mapeia colunas pelo HEADER (robusto a ordem)
    const header = linhas[0].map((h) => this.norm(h));
    const col = (nome: string) => header.findIndex((h) => h === this.norm(nome));
    const iVenda = col('Venda'), iData = col('Data e hora'), iGrupo = col('Grupo'),
      iLiq = col('Líquido'), iBruto = col('Bruto'), iForma = col('Forma pagamento'), iProd = col('Produto/serviço');
    if (iVenda < 0 || iGrupo < 0 || (iLiq < 0 && iBruto < 0)) {
      throw new BadRequestException('CSV não parece o relatório de vendas do SimplesVet (faltam colunas Venda/Grupo/Líquido).');
    }

    // Unidade destino: escolhida (Sede ou MAP HVG) ou, por padrão, a Sede (PROPRIA).
    const unidade = unidadeId
      ? await this.prisma.unidade.findUnique({ where: { id: unidadeId }, select: { id: true, nome: true } })
      : await this.prisma.unidade.findFirst({ where: { ativo: true, tipo: 'PROPRIA' as any }, orderBy: { nome: 'asc' }, select: { id: true, nome: true } });
    if (!unidade) throw new BadRequestException('Unidade não encontrada. Escolha a unidade ou cadastre uma em Financeiro › Cadastros.');
    const uPref = unidade.id.slice(0, 8);
    const conta = await this.prisma.contaFinanceira.findFirst({ where: { ativo: true }, orderBy: [{ unidadeId: 'desc' }, { createdAt: 'asc' }], select: { id: true } });
    if (!conta) throw new BadRequestException('Cadastre ao menos uma conta em Financeiro › Cadastros › Contas antes de importar.');
    const depara = await this.loadDepara();

    // agrupa por (Venda × Grupo)
    type G = { venda: string; grupoNome: string; grupoKey: string; valor: number; data: Date | null; forma?: string; nomes: Set<string> };
    const groups = new Map<string, G>();
    for (let r = 1; r < linhas.length; r++) {
      const row = linhas[r];
      const venda = row[iVenda] || '';
      if (!venda) continue;
      const grupoNome = (iGrupo >= 0 ? row[iGrupo] : '') || 'Sem grupo';
      const valor = this.brl(iLiq >= 0 ? row[iLiq] : row[iBruto]);
      if (valor <= 0) continue;
      const grupoKey = this.norm(grupoNome);
      const key = `${venda}|${grupoKey}`;
      let g = groups.get(key);
      if (!g) g = groups.set(key, { venda, grupoNome, grupoKey, valor: 0, data: iData >= 0 ? this.parseDataBR(row[iData]) : null, forma: iForma >= 0 ? row[iForma] : undefined, nomes: new Set() }).get(key)!;
      g.valor += valor;
      if (iProd >= 0 && row[iProd]) g.nomes.add(row[iProd]);
    }
    if (groups.size === 0) return { linhas: linhas.length - 1, vendas: 0, lancamentos: 0, atualizados: 0, semDepara: 0, total: 0, unidade: unidade.nome };

    const extIds = [...groups.values()].map((g) => `sv:${uPref}:${g.venda}:${g.grupoKey}`);
    const existentes = await this.prisma.lancamento.findMany({ where: { origem: 'SIMPLESVET' as any, externalId: { in: extIds } }, select: { id: true, externalId: true, linhaServicoId: true, status: true } });
    const porExt = new Map(existentes.map((e) => [e.externalId as string, e]));

    let criados = 0, atualizados = 0, semDepara = 0, total = 0;
    const vendasSet = new Set<string>();
    for (const g of groups.values()) {
      vendasSet.add(g.venda);
      total += g.valor;
      const extId = `sv:${uPref}:${g.venda}:${g.grupoKey}`;
      const linhaId = depara[g.grupoKey] ?? null;
      if (!linhaId) semDepara++;
      const ex = porExt.get(extId);
      if (ex) {
        if (ex.status === 'CONCILIADO') continue;
        if ((ex.linhaServicoId ?? null) !== (linhaId ?? null)) {
          try { await this.prisma.lancamento.update({ where: { id: ex.id }, data: { linhaServicoId: linhaId ?? null } }); atualizados++; } catch {}
        }
        continue;
      }
      const nomes = [...g.nomes].slice(0, 3).join(', ');
      const data = (g.data ?? new Date());
      try {
        await this.lancamentos.create({
          tipo: 'RECEITA' as any,
          valorCentavos: Math.round(g.valor * 100),
          data: data.toISOString(), dataPagamento: data.toISOString(),
          descricao: `${unidade.nome} · Venda ${g.venda}${nomes ? ' — ' + nomes : ''}`,
          contaId: conta.id, unidadeId: unidade.id,
          linhaServicoId: linhaId ?? undefined,
          origem: 'SIMPLESVET' as any, externalId: extId,
          status: 'CONFIRMADO' as any, aplicarRegras: false,
        } as any);
        criados++;
      } catch (e) { this.logger.warn(`mapv ${extId}: ${String((e as any)?.message || e)}`); }
    }
    this.logger.log(`Import MAP HVG: ${criados} criada(s), ${atualizados} reclassificada(s), ${vendasSet.size} venda(s).`);
    return { linhas: linhas.length - 1, vendas: vendasSet.size, lancamentos: criados, atualizados, semDepara, total: Math.round(total * 100), unidade: unidade.nome };
  }
}
