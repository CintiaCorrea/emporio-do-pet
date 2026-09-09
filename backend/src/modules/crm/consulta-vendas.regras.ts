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

// ── O QUE E UMA VENDA, NO CAMPO `type` ────────────────────────────────────────────────────────
//
// A Cintia, em 08/09/2026, abrindo a Consulta de vendas: "e cade as vendas de setembro?"
//
// Nao eram so as de setembro: era TUDO o que foi vendido dentro do nosso sistema, desde sempre.
// A mesma coisa foi escrita com duas grafias e ninguem percebeu porque agosto (importado)
// aparecia normalmente:
//
//   · o importador do SimplesVet grava  type: 'VENDA'
//   · o nosso ponto de venda grava      type: 'Venda'
//   · a internacao grava                type: 'Venda'
//   · e a consulta procurava so por     type: 'VENDA'
//
// Comparacao de texto no Postgres distingue maiuscula de minuscula. Entao a tela mostrava o
// passado importado e escondia o presente — que e o pior tipo de erro, porque parece funcionar.
//
// A lista mora aqui, com teste, para a proxima grafia nao nascer solta no meio de uma query.

/** As grafias que significam VENDA no campo `type` do agendamento. */
export const TIPOS_DE_VENDA = ['VENDA', 'Venda', 'venda'] as const;

/** As grafias que significam ORCAMENTO — proposta nao e venda, e nao entra no total. */
export const TIPOS_DE_ORCAMENTO = ['ORCAMENTO', 'ORÇAMENTO', 'Orcamento', 'Orçamento', 'orcamento', 'orçamento'] as const;

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** `true` para qualquer grafia de venda. Ignora caixa alta/baixa e acento. */
export function ehTipoDeVenda(tipo?: string | null): boolean {
  return semAcento(String(tipo || '').trim()).toLowerCase() === 'venda';
}

/** `true` para qualquer grafia de orcamento. */
export function ehTipoDeOrcamento(tipo?: string | null): boolean {
  return semAcento(String(tipo || '').trim()).toLowerCase() === 'orcamento';
}
