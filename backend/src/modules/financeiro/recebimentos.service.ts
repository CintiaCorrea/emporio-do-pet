import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LancamentosService } from './lancamentos.service';
import { ratearCentavos, competenciaMes, dataExpiracao } from './financeiro.regras';

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

  /** Config das formas de recebimento (listaItem `formasrecebimento`): nome → {tipo, taxas, contaId, adquirente}. */
  private async loadFormas(): Promise<Map<string, { tipo: string; taxas: Record<string, any>; contaId?: string; adquirente: string }>> {
    const itens = await this.prisma.listaItem.findMany({ where: { lista: 'formasrecebimento' } });
    const map = new Map<string, { tipo: string; taxas: Record<string, any>; contaId?: string; adquirente: string }>();
    for (const it of itens) {
      try { const v = JSON.parse(it.valor); if (v?.nome) map.set(this.norm(v.nome), { tipo: String(v.tipo || ''), taxas: v.taxas || {}, contaId: v.contaId || undefined, adquirente: String(v.adquirente || v.nome || '') }); } catch { /* ignora */ }
    }
    return map;
  }

  /** Tabela de taxas por bandeira (TaxaContratada): chave adq|bandeira|forma|parcelas → aliquotaBps (vigência mais recente vence). */
  private async loadTaxaTable(): Promise<Map<string, number>> {
    const rows = await this.prisma.taxaContratada.findMany({ orderBy: { vigenciaInicio: 'desc' } });
    const map = new Map<string, number>();
    for (const r of rows) {
      const key = `${this.norm(r.adquirente)}|${this.norm(r.bandeira)}|${this.norm(r.forma)}|${r.parcelas}`;
      if (!map.has(key)) map.set(key, r.aliquotaBps);
    }
    return map;
  }

  /** Modalidade da tela → TaxaContratada.forma (normalizado). */
  private taxaFormaDe(modalidade?: string): string {
    const m = this.norm(modalidade || '');
    if (m.includes('parcel')) return 'credito parcelado';
    if (m.includes('vista')) return 'credito a vista';
    if (m.includes('debit')) return 'debito';
    if (m.includes('pix')) return 'pix';
    return '';
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

  // appointmentId opcional = TEMPO REAL: processa só a venda recém-recebida (gatilho no recebimento).
  // Sem appointmentId = varredura completa (rede de segurança / abrir DRE). Idempotente por externalId.
  async processar(appointmentId?: string): Promise<{ vendas: number; lancamentos: number; atualizados: number; taxas: number; semConta: boolean; semDepara: number }> {
    const depara = await this.loadDepara();

    const itens = await this.prisma.appointmentItem.findMany({
      where: { valorTotal: { gt: 0 }, appointment: { is: { ...(appointmentId ? { id: appointmentId } : {}), recebimentos: { some: {} } } } },
      select: {
        id: true, quantidade: true, valorUnitario: true, valorTotal: true, grupo: true, marca: true, descricao: true,
        servico: { select: { nome: true, category: { select: { nome: true } } } },
        product: { select: { name: true, planoTipo: true, category: { select: { nome: true } } } },
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
      if (it.product?.planoTipo) continue; // 📦 PACOTE pré-pago → receita DIFERIDA (processarPacotes), não entra na venda cheia
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

    const contaPadraoId = await this.contaPadrao();
    if (!contaPadraoId) return { vendas: groups.size, lancamentos: 0, atualizados: 0, taxas: 0, semConta: true, semDepara: 0 };
    const unidadeId = (await this.unidadePadrao()) ?? undefined;
    const catReceitaId = await this.catReceita(); // P0: sem isso a receita some da Receita Bruta do DRE
    // Fonte única (P1): cada forma pode apontar pra uma CONTA financeira real → a venda cai NELA
    // (não sempre na "primeira conta"). Se a forma não tiver conta ligada, usa a padrão.
    const formasCfg = await this.loadFormas();
    const contaDaForma = (forma?: string): string => formasCfg.get(this.norm(forma || ''))?.contaId || contaPadraoId;

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
      select: { id: true, externalId: true, linhaServicoId: true, marcaId: true, formaPagamentoId: true, categoriaId: true, contaId: true, status: true },
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
      const formaNome = formaPorApp.get(g.appointmentId);
      const formaId = await formaPagId(formaNome);
      const contaLanc = contaDaForma(formaNome); // conta ligada à forma (senão a padrão)
      const ex = porExt.get(extId);
      if (ex) {
        if (ex.status === 'CONCILIADO') continue; // não mexe no que já foi conciliado
        const mudou = (ex.linhaServicoId ?? null) !== (linhaId ?? null) || (ex.marcaId ?? null) !== (marcaId ?? null) || (ex.formaPagamentoId ?? null) !== (formaId ?? null) || (ex.categoriaId ?? null) !== (catReceitaId ?? null) || (ex.contaId ?? null) !== (contaLanc ?? null);
        if (mudou) {
          try { await this.prisma.lancamento.update({ where: { id: ex.id }, data: { linhaServicoId: linhaId ?? null, marcaId: marcaId ?? null, formaPagamentoId: formaId ?? null, categoriaId: catReceitaId ?? null, contaId: contaLanc } }); atualizados++; }
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
          contaId: contaLanc, unidadeId, categoriaId: catReceitaId ?? undefined,
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
      const catTax = await this.catTaxa();
      const taxaTable = await this.loadTaxaTable(); // taxa EXATA por bandeira (TaxaContratada)
      if (formasCfg.size && (catTax.cartao || catTax.pix)) {
        const planos: { extId: string; feeCent: number; catId: string; data: Date; appointmentId: string | null; desc: string; conta: string }[] = [];
        for (const rec of recs) {
          const formas = Array.isArray(rec.formas) ? (rec.formas as any[]) : [];
          formas.forEach((f, idx) => {
            const cfg = formasCfg.get(this.norm(f?.forma || '')); if (!cfg) return;
            const ehPix = /pix/i.test(cfg.tipo);
            const ehCartao = /cart|cr[eé]dit|d[eé]bit|maquin/i.test(cfg.tipo);
            if (!ehPix && !ehCartao) return;
            // 1) preferir a tabela por BANDEIRA (modalidade+bandeira+parcelas vindos da tela nova)
            let pct = 0; let parcLabel = String(f?.parcelas || 1);
            const tForma = this.taxaFormaDe(f?.modalidade);
            if (ehCartao && f?.bandeira && tForma) {
              const parcT = tForma === 'credito parcelado' ? (Number(f?.parcelas) || 1) : 1;
              const bps = taxaTable.get(`${this.norm(cfg.adquirente || f?.forma || '')}|${this.norm(f.bandeira)}|${tForma}|${parcT}`);
              if (bps != null) { pct = bps / 100; parcLabel = String(parcT); }
            }
            // 2) fallback: taxa flat cadastrada na própria forma (recebimentos antigos, sem bandeira)
            if (pct <= 0) {
              const parc = String(f?.parcelas || 1);
              pct = Number(String(cfg.taxas?.[parc] ?? cfg.taxas?.['1'] ?? '0').replace(',', '.')) || 0;
              parcLabel = parc;
            }
            if (pct <= 0) return;
            const feeCent = Math.round((Number(f?.valor) || 0) * (pct / 100) * 100); if (feeCent <= 0) return;
            const catId = ehPix ? (catTax.pix || catTax.cartao) : (catTax.cartao || catTax.pix); if (!catId) return;
            planos.push({ extId: `taxa:${rec.id}:${idx}`, feeCent, catId, data: rec.data ?? new Date(), appointmentId: rec.appointmentId, desc: `Taxa ${f?.forma || ''}${parcLabel !== '1' ? ` (${parcLabel}x)` : ''}`.trim(), conta: contaDaForma(f?.forma) });
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
                descricao: p.desc, contaId: p.conta, unidadeId, categoriaId: p.catId,
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

    // ---- CRÉDITO DO CLIENTE usado na venda → BAIXA do adiantamento (não conta o dinheiro 2x) ----
    // A recarga já entrou como RECEITA "Adiantamento". Ao pagar com crédito de loja, a receita da venda
    // é reconhecida (Receita Bruta), mas NÃO entrou dinheiro novo → lançamos DESPESA "(baixa)" na MESMA
    // conta da receita, zerando o efeito no saldo. Card ("crédito à vista/parcelado") NÃO entra aqui.
    try {
      const catBaixa = await this.prisma.categoria.findFirst({ where: { tipo: 'DESPESA' as any, nome: { contains: 'Adiantamento' } }, select: { id: true } });
      if (catBaixa) {
        const ehCreditoLoja = (nome?: string) => {
          const n = this.norm(nome || ''); const cfg = formasCfg.get(n); const t = this.norm(cfg?.tipo || '');
          return /cr[eé]dito d[oe] (pet|client)/.test(n) || /cr[eé]dito d[oe] (pet|client)/.test(t) || /cr[eé]dito do cliente/.test(t);
        };
        const planosCred: { extId: string; feeCent: number; data: Date; appointmentId: string | null; conta: string }[] = [];
        for (const rec of recs) {
          const formas = Array.isArray(rec.formas) ? (rec.formas as any[]) : [];
          let credCent = 0;
          for (const f of formas) { if (ehCreditoLoja(f?.forma)) credCent += Math.round((Number(f?.valor) || 0) * 100); }
          if (credCent > 0) planosCred.push({ extId: `credito-uso:${rec.id}`, feeCent: credCent, data: rec.data ?? new Date(), appointmentId: rec.appointmentId, conta: contaDaForma(formaPorApp.get(rec.appointmentId || '')) });
        }
        if (planosCred.length) {
          const jaCred = await this.prisma.lancamento.findMany({ where: { origem: 'CRM' as any, externalId: { in: planosCred.map((p) => p.extId) } }, select: { externalId: true } });
          const feitos = new Set(jaCred.map((e) => e.externalId));
          for (const p of planosCred) {
            if (feitos.has(p.extId)) continue;
            try {
              await this.lancamentos.create({
                tipo: 'DESPESA' as any, valorCentavos: p.feeCent,
                data: p.data.toISOString(), dataPagamento: p.data.toISOString(),
                descricao: 'Baixa de adiantamento (crédito usado)',
                contaId: p.conta, categoriaId: catBaixa.id,
                origem: 'CRM' as any, externalId: p.extId, appointmentId: p.appointmentId ?? undefined,
                status: 'CONFIRMADO' as any, aplicarRegras: false,
              } as any);
            } catch (e) { this.logger.warn(`baixa adiantamento ${p.extId}: ${String((e as any)?.message || e)}`); }
          }
        }
      }
    } catch (e) { this.logger.warn(`baixa adiantamento: ${String((e as any)?.message || e)}`); }

    // 📦 Pacotes pré-pagos: diferimento + reconhecimento por sessão (idempotente).
    try { await this.processarPacotes(); } catch (e) { this.logger.warn(`pacotes: ${String((e as any)?.message || e)}`); }

    return { vendas: groups.size, lancamentos: criados, atualizados, taxas, semConta: false, semDepara };
  }

  // Competência-sentinela = receita de pacote DIFERIDA (ainda não reconhecida). Data futura → o DRE
  // (que filtra por mês) nunca a mostra. Ao reconhecer a sessão, troca pela competência real.
  private readonly COMP_DIFERIDO = new Date(Date.UTC(2099, 11, 1));

  /**
   * PACOTES pré-pagos = adiantamento (competência): a venda NÃO vira receita cheia (foi excluída do
   * caminho normal acima). Cria N lançamentos de receita DIFERIDOS (competência-sentinela) com
   * dataPagamento = dia da venda, e reconhece 1/N a cada SESSÃO usada (competência = mês da sessão).
   * No CAIXA (agrupa por dataPagamento) os N somam o valor NA VENDA. Idempotente por externalId.
   */
  async processarPacotes(): Promise<{ criados: number; reconhecidos: number }> {
    const catServico = await this.catReceita();
    const contaId = await this.contaPadrao();
    if (!catServico || !contaId) return { criados: 0, reconhecidos: 0 };
    const pacs = await this.prisma.listaItem.findMany({ where: { lista: { startsWith: 'petpac_' } } });
    let criados = 0, reconhecidos = 0;
    for (const it of pacs) {
      let d: any; try { d = JSON.parse(it.valor); } catch { continue; }
      if (d?.origem !== 'venda' || !d?.origemVenda) continue; // só pacotes VENDIDOS (manual da ficha não gera receita aqui)
      const total = Math.max(0, Math.round(Number(d.total) || 0));
      if (total <= 0) continue;
      const partes = String(d.origemVenda).split(':'); // venda:<appt>:<productId>
      const saleAppt = partes[1], productId = partes[2];
      if (!saleAppt || !productId) continue;
      const item = await this.prisma.appointmentItem.findFirst({ where: { appointmentId: saleAppt, productId }, select: { valorTotal: true } });
      const valorCent = Math.round((Number(item?.valorTotal) || 0) * 100);
      if (valorCent <= 0) continue;
      const appt = await this.prisma.appointment.findUnique({ where: { id: saleAppt }, select: { date: true, tutorId: true, recebimentos: { select: { data: true }, orderBy: { data: 'asc' }, take: 1 } } });
      const saleDate = appt?.recebimentos?.[0]?.data ?? appt?.date ?? new Date();
      const parcelas = ratearCentavos(valorCent, total); // rateio unificado (financeiro.regras)
      // 1) garante os N lançamentos diferidos (sentinela)
      for (let i = 0; i < total; i++) {
        const extId = `pacote:${d.origemVenda}:${i}`;
        const ja = await this.prisma.lancamento.findFirst({ where: { origem: 'CRM' as any, externalId: extId }, select: { id: true } });
        if (ja) continue;
        const val = parcelas[i]; // rateio: a última parcela absorve o resíduo
        try {
          await this.lancamentos.create({
            tipo: 'RECEITA', status: 'CONFIRMADO', valorCentavos: val,
            data: saleDate.toISOString(), dataPagamento: saleDate.toISOString(),
            competencia: this.COMP_DIFERIDO.toISOString(), // DIFERIDO (sentinela)
            descricao: `${d.nome || 'Pacote'} — sessão ${i + 1}/${total}`,
            contaId, categoriaId: catServico,
            origem: 'CRM', externalId: extId,
            appointmentId: saleAppt, tutorId: appt?.tutorId ?? undefined,
            aplicarRegras: false,
          } as any);
          criados++;
        } catch { /* dedup */ }
      }
      // 2) reconhece as sessões USADAS (competência = mês da sessão). Só mexe nos ainda-diferidos → idempotente.
      const baixas: string[] = Array.isArray(d.baixas) ? d.baixas : [];
      for (let i = 0; i < baixas.length && i < total; i++) {
        const sess = await this.prisma.appointment.findUnique({ where: { id: baixas[i] }, select: { date: true } }).catch(() => null);
        const quando = sess?.date ?? saleDate;
        const comp = competenciaMes(quando);
        const r = await this.prisma.lancamento.updateMany({
          where: { origem: 'CRM' as any, externalId: `pacote:${d.origemVenda}:${i}`, competencia: this.COMP_DIFERIDO },
          data: { competencia: comp },
        }).catch(() => ({ count: 0 }));
        reconhecidos += (r as any).count || 0;
      }
      // 3) QUEBRA (breakage): pacote EXPIROU com sessões não usadas → reconhece o restante como
      //    receita na competência da EXPIRAÇÃO (a clínica fica com o adiantamento). Idempotente
      //    (só mexe nos ainda-diferidos). Validade vem do produto (pacoteValidadeQtd/Unidade);
      //    sem validade cadastrada → o pacote não expira e nada é reconhecido por quebra.
      const usados = Math.min(baixas.length, total);
      if (usados < total) {
        const prod = await this.prisma.product.findUnique({ where: { id: productId }, select: { pacoteValidadeQtd: true, pacoteValidadeUnidade: true } }).catch(() => null);
        const vqtd = Math.max(0, Math.round(Number(prod?.pacoteValidadeQtd) || 0));
        if (vqtd > 0) {
          const inicio = new Date(it.createdAt ?? saleDate);
          const exp = dataExpiracao(inicio, vqtd, prod?.pacoteValidadeUnidade);
          if (new Date() > exp) {
            const compExp = competenciaMes(exp);
            for (let i = usados; i < total; i++) {
              const r = await this.prisma.lancamento.updateMany({
                where: { origem: 'CRM' as any, externalId: `pacote:${d.origemVenda}:${i}`, competencia: this.COMP_DIFERIDO },
                data: { competencia: compExp, descricao: `${d.nome || 'Pacote'} — sessão ${i + 1}/${total} (expirado · quebra)` },
              }).catch(() => ({ count: 0 }));
              reconhecidos += (r as any).count || 0;
            }
          }
        }
      }
    }
    if (criados || reconhecidos) this.logger.log(`Pacotes: ${criados} sessão(ões) diferida(s), ${reconhecidos} reconhecida(s).`);
    return { criados, reconhecidos };
  }
}
