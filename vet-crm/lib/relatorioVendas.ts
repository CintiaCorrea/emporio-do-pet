// Relatório de vendas/orçamentos por cliente — o núcleo que agrupa e soma.
//
// Pedido da Cintia (07/09/2026): "Preciso poder imprimir relatórios de vendas/orçamento dos
// clientes, principalmente quando temos muitas vendas abertas."
//
// O caso que dói é o cliente com várias contas em aberto: a tela do PDV mostra o cliente com
// "3 contas abertas", mas não existe um papel pra conferir com ele. Aqui é só a conta —
// quem desenha é lib/documentos/relatorio-vendas-print.

export type LinhaVendaRelatorio = {
  id?: string;
  numero?: number | string | null;
  data?: string;
  tutor?: string;
  tutorId?: string;
  pet?: string;
  valor?: number;
  pago?: number;
};

export type GrupoRelatorio = {
  chave: string;
  tutor: string;
  linhas: LinhaVendaRelatorio[];
  total: number;
  pago: number;
  aReceber: number;
};

export type ResumoRelatorio = {
  grupos: GrupoRelatorio[];
  quantidade: number;
  total: number;
  pago: number;
  aReceber: number;
};

const n = (v: unknown) => Number(v) || 0;

/**
 * Agrupa as vendas por CLIENTE e soma cada grupo.
 *
 * A chave é o id do tutor quando existe — dois clientes com o mesmo nome não podem virar um só
 * na hora de cobrar. Sem id, cai no nome; sem nome, a venda fica sozinha (não somem no "—").
 *
 * Ordem: quem deve mais primeiro (é o que a recepção precisa ver), e em empate, por nome. Dentro
 * do cliente, a conta mais antiga primeiro — é a ordem em que se cobra.
 */
export function agruparPorCliente(linhas: LinhaVendaRelatorio[] | null | undefined): ResumoRelatorio {
  const mapa = new Map<string, GrupoRelatorio>();
  for (const l of Array.isArray(linhas) ? linhas : []) {
    if (!l) continue;
    const chave = String(l.tutorId || l.tutor || l.id || "").trim() || `avulsa:${mapa.size}`;
    const g = mapa.get(chave) || { chave, tutor: String(l.tutor || "Cliente não identificado"), linhas: [], total: 0, pago: 0, aReceber: 0 };
    const total = n(l.valor);
    const pago = Math.min(n(l.pago), total);   // pago maior que o total não vira crédito aqui
    g.linhas.push(l);
    g.total += total;
    g.pago += pago;
    g.aReceber += Math.max(0, total - pago);
    mapa.set(chave, g);
  }
  const grupos = [...mapa.values()]
    .map((g) => ({ ...g, linhas: [...g.linhas].sort((a, b) => new Date(a.data || 0).getTime() - new Date(b.data || 0).getTime()) }))
    .sort((a, b) => (b.aReceber - a.aReceber) || a.tutor.localeCompare(b.tutor, "pt-BR"));

  return {
    grupos,
    quantidade: grupos.reduce((s, g) => s + g.linhas.length, 0),
    total: grupos.reduce((s, g) => s + g.total, 0),
    pago: grupos.reduce((s, g) => s + g.pago, 0),
    aReceber: grupos.reduce((s, g) => s + g.aReceber, 0),
  };
}
