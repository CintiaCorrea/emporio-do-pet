import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LancamentosService } from './lancamentos.service';

/**
 * RECEITA automática das VENDAS (espelho do FornecedoresService, lado receita).
 * ISOLAMENTO (regra 4 da "casa com cômodos"): só LÊ do CRM (appointment_items de venda
 * concluída no caixa = tem `recebimentos`), e só ESCREVE em `fin_lancamentos`/apoios `fin_`.
 *
 * Classificação por DEPARTAMENTO vem do de-para Categoria→Linha de Serviço (config neutra
 * `config_depara_dep`). Agrupa por (venda × CATEGORIA) — a categoria é ESTÁVEL, então mudar o
 * de-para depois só RECLASSIFICA (update), nunca duplica. Marca vem do item; forma de pagamento
 * e taxa de cartão/pix vêm do recebimento (taxa → despesa em "Deduções de Vendas").
 *
 * externalId ESTÁVEL: `venda:<appointmentId>:<categoriaKey>` (receita) e `taxa:<recebimentoId>:<idx>`.
 * Geração LAZY: roda ao abrir a DRE. Não mexe em lançamento CONCILIADO.
 */
@Injectable()
export class RecebimentosService {
  private readonly logger = new Logger(RecebimentosService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly lancamentos: LancamentosService,
  ) {}

  private norm(s: string) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }

  private async contaPadrao(): Promise<string | null> {
    const conta = await this.prisma.contaFinanceira.findFirst({
      where: { ativo: true },
      orderBy: [{ unidadeId: 'desc' }, { createdAt: 'asc' }],
      select: { id: true },
    });
    return conta?.id ?? null;
  }

  private async unidadePadrao(): Promise<string | null> {
    const u = await this.prisma.unidade.findFirst({
      where: { ativo: true },
      orderBy: [{ tipo: 'asc' }, { nome: 'asc' }],
      select: { id: true },
    });
    return u?.id ?? null;
  }

  /** De-para Categoria→LinhaServico (config_depara_dep), normalizado. */
  private async loadDepara(): Promise<Record<string, string>> {
    const item = await this.prisma.listaItem.findFirst({ where: { lista: 'config_depara_dep' } });
    if (!item) return {};
    try {
      const v = JSON.parse(item.valor);
      const map = v?.map || {};
      const out: Record<string, string> = {};
      for (const [k, id] of Object.entries(map)) if (id) out[this.norm(k)] = String(id);
      return out;
    } catch { return {}; }
  }

  /** Config das formas de recebimento (listaItem `formasrecebimento`): nome → {tipo, taxas}. */
  private async loadFormas(): Promise<Map<string, { tipo: string; taxas: Record<string, any> }>> {
    const itens = await this.prisma.listaItem.findMany({ where: { lista: 'formasrecebimento' } });
    const map = new Map<string, { tipo: string; taxas: Record<string, any> }>();
    for (const it of itens) {
      try { const v = JSON.parse(it.valor); if (v?.nome) map.set(this.norm(v.nome), { tipo: String(v.tipo || ''), taxas: v.taxas || {} }); } catch { /* ignora */ }
    }
    return map;
  }

  /** IDs das categorias de dedução de taxa (plano de contas). */
  private async catTaxa(): Promise<{ cartao?: string; pix?: string }> {
    const cats = await this.prisma.categoria.findMany({
      where: { nome: { in: ['Taxa Operadora de Cartão', 'Taxa de Pix'] } },
      select: { id: true, nome: true },
    });
    const out: { cartao?: string; pix?: string } = {};
    for (const c of cats) { if (/pix/i.test(c.nome)) out.pix = c.id; else if (/cart/i.test(c.nome)) out.cartao = c.id; }
    return out;
  }

  /** Categoria de RECEITA das vendas (senão a receita fica "a classificar" e some da Receita Bruta do DRE). */
  private async catReceita(): Promise<string | null> {
    const c = await this.prisma.categoria.findFirst({
      where: { tipo: 'RECEITA' as any, natureza: 'OPERACIONAL' as any, nome: { contains: 'Receita' } },
      select: { id: true }, orderBy: { nome: 'asc' },
    });
    return c?.id ?? null;
  }

  async processar(): Promise<{ vendas: number; lancamentos: number; atualizados: number; taxas: number; semConta: boolean; semDepara: number }> {
    const depara = await this.loadDepara();

    const itens = await this.prisma.appointmentItem.findMany({
      where: { valorTotal: { gt: 0 }, appointment: { is: { recebimentos: { some: {} } } } },
      select: {
        id: true, quantidade: true, valorUnitario: true, valorTotal: true, grupo: true, marca: true, descricao: true,
        servico: { select: { nome: true, category: { select: { nome: true } } } },
        product: { select: { name: true, category: { select: { nome: true } } } },
        appointment: { select: { id: true, date: true, tutorId: true, recebimentos: { select: { data: true }, orderBy: { data: 'asc' }, take: 1 } } },
      },
      take: 5000,
    });
    if (itens.length === 0) return { vendas: 0, lancamentos: 0, atualizados: 0, taxas: 0, semConta: false, semDepara: 0 };

    // Agrupa por (venda × CATEGORIA) — chave estável.
    type G = { appointmentId: string; catNome: string | null; catKey: string; valorCent: number; data: Date; tutorId: string | null; nomes: Set<string>; marcaVotes: Map<string, number> };
    const groups = new Map<string, G>();
    for (const it of itens) {
      if (!it.appointment?.id) continue;
      const catNome = it.servico?.category?.nome ?? it.product?.category?.nome ?? it.grupo ?? null;
      const catKey = catNome ? this.norm(catNome) : 'sem';
      const valorC = Math.round((it.valorTotal || it.valorUnitario * (it.quantidade || 1)) * 100);
      if (valorC <= 0) continue;
      const data = it.appointment.recebimentos?.[0]?.data ?? it.appointment.date ?? new Date();
      const key = `${it.appointment.id}|${catKey}`;
      let g = groups.get(key);
      if (!g) { g = { appointmentId: it.appointment.id, catNome, catKey, valorCent: 0, data, tutorId: it.appointment.tutorId ?? null, nomes: new Set(), marcaVotes: new Map() }; groups.set(key, g); }
      g.valorCent += valorC;
      const nm = it.descricao || it.servico?.nome || it.product?.name; if (nm) g.nomes.add(nm);
      if (it.marca) g.marcaVotes.set(it.marca, (g.marcaVotes.get(it.marca) || 0) + valorC);
    }
    if (groups.size === 0) return { vendas: 0, lancamentos: 0, atualizados: 0, taxas: 0, semConta: false, semDepara: 0 };

    const contaId = await this.contaPadrao();
    if (!contaId) return { vendas: groups.size, lancamentos: 0, atualizados: 0, taxas: 0, semConta: true, semDepara: 0 };
    const unidadeId = (await this.unidadePadrao()) ?? undefined;
    const catReceitaId = await this.catReceita(); // P0: sem isso a receita some da Receita Bruta do DRE

    // Recebimentos (formas de pagamento) — reusado p/ forma na receita E taxa.
    const appIds = [...new Set([...groups.values()].map((g) => g.appointmentId))];
    const recs = await this.prisma.recebimento.findMany({
      where: { appointmentId: { in: appIds }, valorTotal: { gt: 0 } },
      select: { id: true, appointmentId: true, data: true, formas: true },
    });
    const formaPorApp = new Map<string, string>();
    for (const rec of recs) {
      if (!rec.appointmentId) continue;
      const formas = Array.isArray(rec.formas) ? (rec.formas as any[]) : [];
      let melhor: { forma: string; valor: number } | null = null;
      for (const f of formas) { const val = Number(f?.valor) || 0; if (f?.forma && (!melhor || val > melhor.valor)) melhor = { forma: String(f.forma), valor: val }; }
      if (melhor && !formaPorApp.has(rec.appointmentId)) formaPorApp.set(rec.appointmentId, melhor.forma);
    }

    // Marca do item (EMPORIO|MUNDO_A_PARTE|DRA_VIVIAN) → fin_marca.
    const marcasFin = await this.prisma.marca.findMany({ select: { id: true, nome: true } });
    const findMarca = (kw: string) => marcasFin.find((x) => this.norm(x.nome).includes(kw))?.id;
    const resolverMarca = (m: string | null): string | undefined => {
      if (!m) return undefined;
      const n = this.norm(m);
      if (n.includes('vivian')) return findMarca('vivian');
      if (n.includes('mundo')) return findMarca('mundo');
      if (n.includes('empor')) return findMarca('empor');
      return undefined;
    };

    // Cache nome→id de fin_formas_pagamento (cria on-demand — só escreve em fin_).
    const fpExist = await this.prisma.formaPagamento.findMany({ select: { id: true, nome: true } });
    const fpCache = new Map<string, string>();
    for (const fp of fpExist) fpCache.set(this.norm(fp.nome), fp.id);
    const formaPagId = async (nome?: string): Promise<string | undefined> => {
      const key = this.norm(nome || ''); if (!key) return undefined;
      const hit = fpCache.get(key); if (hit) return hit;
      try { const nova = await this.prisma.formaPagamento.create({ data: { nome: (nome as string).trim() } }); fpCache.set(key, nova.id); return nova.id; } catch { return undefined; }
    };

    // Receitas já existentes (por externalId estável) → reclassifica em vez de duplicar.
    const extIds = [...groups.values()].map((g) => `venda:${g.appointmentId}:${g.catKey}`);
    const existentes = await this.prisma.lancamento.findMany({
      where: { origem: 'CRM' as any, externalId: { in: extIds } },
      select: { id: true, externalId: true, linhaServicoId: true, marcaId: true, formaPagamentoId: true, categoriaId: true, status: true },
    });
    const porExt = new Map(existentes.map((e) => [e.externalId as string, e]));

    let criados = 0, atualizados = 0, semDepara = 0;
    for (const g of groups.values()) {
      const extId = `venda:${g.appointmentId}:${g.catKey}`;
      const linhaId = g.catNome ? (depara[this.norm(g.catNome)] ?? null) : null;
      if (!linhaId) semDepara++;
      let marcaStr: string | null = null, best = -1;
      for (const [m, v] of g.marcaVotes) if (v > best) { best = v; marcaStr = m; }
      const marcaId = resolverMarca(marcaStr);
      const formaId = await formaPagId(formaPorApp.get(g.appointmentId));
      const ex = porExt.get(extId);
      if (ex) {
        if (ex.status === 'CONCILIADO') continue; // não mexe no que já foi conciliado
        const mudou = (ex.linhaServicoId ?? null) !== (linhaId ?? null) || (ex.marcaId ?? null) !== (marcaId ?? null) || (ex.formaPagamentoId ?? null) !== (formaId ?? null) || (ex.categoriaId ?? null) !== (catReceitaId ?? null);
        if (mudou) {
          try { await this.prisma.lancamento.update({ where: { id: ex.id }, data: { linhaServicoId: linhaId ?? null, marcaId: marcaId ?? null, formaPagamentoId: formaId ?? null, categoriaId: catReceitaId ?? null } }); atualizados++; }
          catch (e) { this.logger.warn(`receita update ${extId}: ${String((e as any)?.message || e)}`); }
        }
        continue;
      }
      const nomes = [...g.nomes].slice(0, 3).join(', ');
      try {
        await this.lancamentos.create({
          tipo: 'RECEITA' as any, valorCentavos: g.valorCent,
          data: g.data.toISOString(), dataPagamento: g.data.toISOString(),
          descricao: `Venda${nomes ? ' — ' + nomes : ''}`,
          contaId, unidadeId, categoriaId: catReceitaId ?? undefined,
          linhaServicoId: linhaId ?? undefined, marcaId: marcaId ?? undefined, formaPagamentoId: formaId,
          origem: 'CRM' as any, externalId: extId,
          appointmentId: g.appointmentId, tutorId: g.tutorId ?? undefined,
          status: 'CONFIRMADO' as any, aplicarRegras: false,
        } as any);
        criados++;
      } catch (e) { this.logger.warn(`receita ${extId}: ${String((e as any)?.message || e)}`); }
    }
    if (criados || atualizados) this.logger.log(`Receitas de venda: ${criados} criada(s), ${atualizados} reclassificada(s).`);

    // ---- TAXA de cartão/pix → DESPESA em "Deduções de Vendas" (receita fica bruta) ----
    let taxas = 0;
    try {
      const formasCfg = await this.loadFormas();
      const catTax = await this.catTaxa();
      if (formasCfg.size && (catTax.cartao || catTax.pix)) {
        const planos: { extId: string; feeCent: number; catId: string; data: Date; appointmentId: string | null; desc: string }[] = [];
        for (const rec of recs) {
          const formas = Array.isArray(rec.formas) ? (rec.formas as any[]) : [];
          formas.forEach((f, idx) => {
            const cfg = formasCfg.get(this.norm(f?.forma || '')); if (!cfg) return;
            const ehPix = /pix/i.test(cfg.tipo);
            const ehCartao = /cart|cr[eé]dit|d[eé]bit|maquin/i.test(cfg.tipo);
            if (!ehPix && !ehCartao) return;
            const parc = String(f?.parcelas || 1);
            const pct = Number(String(cfg.taxas?.[parc] ?? cfg.taxas?.['1'] ?? '0').replace(',', '.')) || 0;
            if (pct <= 0) return;
            const feeCent = Math.round((Number(f?.valor) || 0) * (pct / 100) * 100); if (feeCent <= 0) return;
            const catId = ehPix ? (catTax.pix || catTax.cartao) : (catTax.cartao || catTax.pix); if (!catId) return;
            planos.push({ extId: `taxa:${rec.id}:${idx}`, feeCent, catId, data: rec.data ?? new Date(), appointmentId: rec.appointmentId, desc: `Taxa ${f?.forma || ''}${parc !== '1' ? ` (${parc}x)` : ''}`.trim() });
          });
        }
        if (planos.length) {
          const jaTax = await this.prisma.lancamento.findMany({ where: { origem: 'CRM' as any, externalId: { in: planos.map((p) => p.extId) } }, select: { externalId: true } });
          const feitosTax = new Set(jaTax.map((e) => e.externalId));
          for (const p of planos) {
            if (feitosTax.has(p.extId)) continue;
            try {
              await this.lancamentos.create({
                tipo: 'DESPESA' as any, valorCentavos: p.feeCent,
                data: p.data.toISOString(), dataPagamento: p.data.toISOString(),
                descricao: p.desc, contaId, unidadeId, categoriaId: p.catId,
                origem: 'CRM' as any, externalId: p.extId, appointmentId: p.appointmentId ?? undefined,
                status: 'CONFIRMADO' as any, aplicarRegras: false,
              } as any);
              taxas++;
            } catch (e) { this.logger.warn(`taxa ${p.extId}: ${String((e as any)?.message || e)}`); }
          }
        }
      }
    } catch (e) { this.logger.warn(`taxas: ${String((e as any)?.message || e)}`); }
    if (taxas) this.logger.log(`Taxas de cartão/pix: ${taxas} dedução(ões) criada(s).`);

    return { vendas: groups.size, lancamentos: criados, atualizados, taxas, semConta: false, semDepara };
  }
}
