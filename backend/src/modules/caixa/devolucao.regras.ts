// A DEVOLUCAO — regras puras.
//
// A Cintia, em 07/09/2026, quando perguntei o que a devolucao faz: "devolve ao estoque / retira
// a comissao / lanca estorno. Acho que e melhor." E, sobre onde o dinheiro sai: "o estorno sai
// no caixa do dia."
//
// Sao TRES consequencias em tres lugares diferentes, e e por isso que devolucao nunca pode ser
// um "excluir venda": apagar a venda nao devolve produto pra prateleira, nao tira a comissao de
// quem vendeu e nao deixa rastro do dinheiro que saiu.
//
// Aqui mora so a decisao — o que devolver, quanto estornar, o que fazer com a comissao. Quem
// escreve no banco e o caixa.service.

export type ItemVendido = {
  id: string;
  catalogoItemId?: string | null;
  controlaEstoque?: boolean;
  quantidade?: number | null;
  valorUnitario?: number | null;
  desconto?: number | null;
  comissaoCalculada?: number | null;
  /** Preenchido quando a comissao ja entrou num extrato FECHADO. */
  comissaoExtratoId?: string | null;
};

export type PedidoDeDevolucao = { itemId: string; quantidade?: number | null };

export type LinhaDevolvida = {
  itemId: string;
  quantidade: number;
  valor: number;
  devolveAoEstoque: boolean;
  catalogoItemId: string | null;
  retiraComissao: boolean;
  comissaoTravada: boolean;
};

export type PlanoDeDevolucao = {
  linhas: LinhaDevolvida[];
  total: number;
  /** Itens cuja comissao ja foi fechada num extrato — o sistema NAO mexe, e a tela avisa. */
  comissoesTravadas: number;
};

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * O que acontece ao devolver estes itens desta venda.
 *
 * Regras que valem a pena estar escritas:
 *   · nao se devolve mais do que foi vendido;
 *   · o valor estornado e o LIQUIDO da linha (com o desconto que foi dado), proporcional a
 *     quantidade devolvida — estornar o cheio devolveria dinheiro que nunca entrou;
 *   · so volta pro estoque o que baixou do estoque: servico e exame nao tem prateleira;
 *   · comissao ja fechada em extrato NAO e mexida. O fechamento do dia 30 e um acerto de contas
 *     com pessoas; desfazer por dentro, depois de pago, e pior que deixar e resolver na mao.
 */
export function planejarDevolucao(
  itens: ItemVendido[] | null | undefined,
  pedidos: PedidoDeDevolucao[] | null | undefined,
): PlanoDeDevolucao {
  const porId = new Map((Array.isArray(itens) ? itens : []).map((i) => [String(i.id), i]));
  const linhas: LinhaDevolvida[] = [];
  let comissoesTravadas = 0;

  for (const p of Array.isArray(pedidos) ? pedidos : []) {
    const it = porId.get(String(p?.itemId || ''));
    if (!it) continue;

    const vendida = Math.max(0, n(it.quantidade) || 1);
    const pedida = p?.quantidade == null ? vendida : Math.max(0, n(p.quantidade));
    const qtd = Math.min(pedida, vendida);
    if (qtd <= 0) continue;

    // Liquido da linha, proporcional ao que volta.
    const liquidoDaLinha = Math.max(0, vendida * n(it.valorUnitario) - n(it.desconto));
    const valor = vendida > 0 ? (liquidoDaLinha * qtd) / vendida : 0;

    const travada = !!it.comissaoExtratoId;
    if (travada && n(it.comissaoCalculada) > 0) comissoesTravadas++;

    linhas.push({
      itemId: it.id,
      quantidade: qtd,
      valor: Number(valor.toFixed(2)),
      devolveAoEstoque: !!it.catalogoItemId && it.controlaEstoque === true,
      catalogoItemId: it.catalogoItemId || null,
      retiraComissao: !travada && n(it.comissaoCalculada) > 0,
      comissaoTravada: travada,
    });
  }

  return {
    linhas,
    total: Number(linhas.reduce((s, l) => s + l.valor, 0).toFixed(2)),
    comissoesTravadas,
  };
}
