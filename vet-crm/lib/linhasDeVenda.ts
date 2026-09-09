// A LINHA DE VENDA — a conta, separada da tela.
//
// Toda tela que lança item (ponto de venda, comanda da ficha do pet, internação, orçamento)
// precisa da mesma resposta para "quanto vale esta linha" e "quanto vale a lista". A aparência
// vive em components/vendas/EditorDeItens; a conta vive aqui, porque conta se testa e aparência
// não — e porque foi de contas repetidas em telas diferentes que vieram as divergências que a
// Cintia foi achando em 08/09/2026.

export type LinhaEditavel = {
  /** id do item já gravado (quando existe) — a tela usa para saber o que mudou. */
  id?: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  desconto?: number;
  /** os campos de identidade que o núcleo `linhaDoItem` monta e o backend espera. */
  servicoId?: string;
  productId?: string;
  catalogoItemId?: string;
  catalogoExameId?: string;
  fornecedorId?: string | null;
  custoUnitario?: number;
  _exame?: boolean;
  _novo?: boolean;
};

const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

/**
 * Quanto vale uma linha: quantidade × valor, menos o desconto.
 *
 * Nunca negativa. Um desconto maior que o item deixaria a linha tirando dinheiro do total, e
 * ninguém entenderia por que a conta não fecha. Sem quantidade vale 1: item lançado é item
 * cobrado.
 */
export function totalDaLinha(l: LinhaEditavel | null | undefined): number {
  if (!l) return 0;
  const q = num(l.quantidade) || 1;
  return Math.max(0, q * num(l.valorUnitario) - num(l.desconto));
}

/** O total da lista. Lista vazia é zero, não indefinido. */
export function totalDasLinhas(linhas: LinhaEditavel[] | null | undefined): number {
  return (linhas || []).reduce((s, l) => s + totalDaLinha(l), 0);
}

/**
 * As linhas no formato que o backend grava (`items` do agendamento/venda).
 *
 * O `valorTotal` sai daqui, e não da tela: é ele que o caixa soma depois. Tela e caixa contando
 * de jeitos diferentes é a origem da diferença que ninguém explica.
 */
export function linhasParaGravar(linhas: LinhaEditavel[] | null | undefined): Record<string, any>[] {
  return (linhas || []).map((l) => ({
    servicoId: l.servicoId ?? undefined,
    productId: l.productId ?? undefined,
    catalogoItemId: l.catalogoItemId ?? undefined,
    descricao: l.descricao,
    quantidade: num(l.quantidade) || 1,
    valorUnitario: num(l.valorUnitario),
    custoUnitario: l.custoUnitario != null ? num(l.custoUnitario) : undefined,
    fornecedorId: l.fornecedorId ?? undefined,
    desconto: num(l.desconto),
    valorTotal: totalDaLinha(l),
  }));
}
