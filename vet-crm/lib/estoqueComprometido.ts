// NÚCLEO ÚNICO — "esse produto ainda dá pra vender?"
//
// A baixa do estoque acontece quando a venda é PAGA. Enquanto a venda fica aberta (comanda do dia),
// o produto continua contando como disponível — e podia ser vendido duas vezes sem ninguém perceber.
// Decisão da Cintia (02/09/2026): não reservar estoque, e sim AVISAR na hora de lançar quando o
// saldo já estiver comprometido por outra venda aberta. Quem avisa é este arquivo (PDV e comanda).

export type ItemComprometido = {
  itemId: string;
  nome: string;
  estoque: number;
  comprometido: number;
  disponivel: number;
};

export type MapaEstoque = Map<string, ItemComprometido>;

/** Lê o que já está prometido em vendas abertas. Só vem item que controla estoque. */
export async function carregarEstoqueComprometido(): Promise<MapaEstoque> {
  try {
    const r = await fetch('/api/caixa/estoque-comprometido', { cache: 'no-store' });
    if (!r.ok) return new Map();
    const d = await r.json();
    const arr: ItemComprometido[] = Array.isArray(d) ? d : (d.data || []);
    return new Map(arr.map((x) => [x.itemId, x]));
  } catch {
    return new Map();
  }
}

/**
 * Frase de aviso pra mostrar quando a pessoa lança o item, ou null quando está tudo certo.
 * `jaNaTela` = quantas unidades desse item já estão nesta venda que ela está montando agora.
 */
export function avisoDeEstoque(
  mapa: MapaEstoque,
  catalogoItemId: string | undefined,
  quantidade = 1,
  jaNaTela = 0,
): string | null {
  if (!catalogoItemId) return null;
  const it = mapa.get(catalogoItemId);
  if (!it) return null; // item sem controle de estoque, ou nada prometido ainda
  const pedido = quantidade + jaNaTela;
  if (it.disponivel - pedido >= 0) return null;
  const outras = it.comprometido - jaNaTela;
  if (it.estoque <= 0) return `${it.nome}: sem estoque (0 em estoque).`;
  if (outras > 0) {
    return `${it.nome}: ${it.estoque} em estoque, mas ${outras} já ${outras === 1 ? 'está' : 'estão'} em venda aberta. Confira antes de entregar.`;
  }
  return `${it.nome}: só ${it.estoque} em estoque e você está lançando ${pedido}.`;
}
