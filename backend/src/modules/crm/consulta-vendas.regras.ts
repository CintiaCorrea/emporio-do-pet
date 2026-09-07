// Regras PURAS de dinheiro da Consulta de vendas.
//
// Existem porque a mesma conta aparece em quatro lugares da tela (card, quadro de status, linha
// do dia e total) e, no sistema de onde a clinica veio, esses quatro numeros NAO fechavam entre
// si — o quadro de status somava "quanto ja recebi" numas linhas e "quanto falta" noutras, e o
// total ficava R$ 70,26 fora de tudo. Aqui a conta e uma so.

export type RecebimentoDaVenda = { valorTotal?: number | null };

/**
 * Quanto uma venda JA RECEBEU — nunca mais do que ela vale.
 *
 * Troco e pagamento a maior sao assunto do caixa. Se entrassem aqui, a venda ficaria com saldo
 * negativo e derrubaria o "a receber" do periodo inteiro sem ninguem entender por que.
 */
export function pagoDaVenda(valor?: number | null, recebimentos?: RecebimentoDaVenda[] | null): number {
  const total = Number(valor) || 0;
  const soma = (Array.isArray(recebimentos) ? recebimentos : []).reduce(
    (s, r) => s + (Number(r?.valorTotal) || 0),
    0,
  );
  return Math.max(0, Math.min(soma, total));
}

/** Quanto uma venda ainda deve. */
export function abertoDaVenda(valor?: number | null, recebimentos?: RecebimentoDaVenda[] | null): number {
  return Math.max(0, (Number(valor) || 0) - pagoDaVenda(valor, recebimentos));
}

/** A situacao da venda, do jeito que a tela mostra. */
export type SituacaoVenda = 'ABERTA' | 'PARCIAL' | 'PAGA';

export function situacaoDaVenda(valor?: number | null, recebimentos?: RecebimentoDaVenda[] | null): SituacaoVenda {
  const total = Number(valor) || 0;
  const pago = pagoDaVenda(total, recebimentos);
  // Um centavo de diferenca por arredondamento nao pode deixar a venda "quase paga" pra sempre.
  if (total > 0 && pago >= total - 0.009) return 'PAGA';
  return pago > 0 ? 'PARCIAL' : 'ABERTA';
}
