// O TEXTO DO ORÇAMENTO NO WHATSAPP — um só, para todos os lugares que enviam.
//
// Nasceu dentro da ficha do pet (PetComandaRail). Em 08/09/2026 a Cintia pediu o envio também
// na aba de Orçamentos da Consulta de vendas — e um segundo texto parecido significaria dois
// orçamentos diferentes saindo da mesma clínica, para o mesmo cliente, dependendo de qual tela
// a pessoa abriu. O cliente não sabe que são duas telas; ele vê a casa se contradizendo.
//
// Mora aqui, com teste, porque isto vai para fora: é a única parte do sistema que o cliente lê.

const BRL = (v: any) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type ItemDoOrcamento = {
  descricao?: string | null;
  quantidade?: number | null;
  valorUnitario?: number | null;
};

export type OrcamentoParaTexto = {
  petNome?: string | null;
  tutorNome?: string | null;
  itens?: ItemDoOrcamento[] | null;
  /** O total cobrado. Sem ele, soma-se os itens. */
  total?: number | null;
  observacao?: string | null;
  /** A data do orçamento. Sem ela, vale hoje. */
  data?: string | Date | null;
};

/** A linha de um item: "• 2× Consulta — *R$ 300,00*". Quantidade 1 não vira "1×". */
function linhaDoItem(it: ItemDoOrcamento): string {
  const q = Number(it.quantidade) || 1;
  const valor = q * (Number(it.valorUnitario) || 0);
  const nome = String(it.descricao || "Item").trim();
  return q > 1 ? `• ${q}× ${nome} — *${BRL(valor)}*` : `• ${nome} — *${BRL(valor)}*`;
}

export function somaDosItens(itens?: ItemDoOrcamento[] | null): number {
  return (itens || []).reduce(
    (s, it) => s + (Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0),
    0,
  );
}

export function textoDoOrcamento(o: OrcamentoParaTexto): string {
  const itens = Array.isArray(o.itens) ? o.itens : [];
  const total = o.total != null ? Number(o.total) : somaDosItens(itens);
  const obs = String(o.observacao || "").trim();
  const dia = (() => {
    try { return new Date(o.data || Date.now()).toLocaleDateString("pt-BR"); }
    catch { return new Date().toLocaleDateString("pt-BR"); }
  })();

  return [
    `💰 *Orçamento — ${o.petNome || "seu pet"}*`,
    `🏥 Empório do Pet · 🗓️ ${dia}`,
    o.tutorNome ? `👤 Tutor(a): ${o.tutorNome}` : null,
    ``,
    // Orçamento sem item existe (rascunho aberto e não preenchido) e não pode virar uma
    // mensagem com o cabeçalho "Itens do orçamento:" e nada embaixo.
    ...(itens.length ? [`*Itens do orçamento:*`, ...itens.map(linhaDoItem)] : [`_Sem itens lançados._`]),
    ``,
    `━━━━━━━━━━━━━━━`,
    `💵 *Total: ${BRL(total)}*`,
    obs ? `` : null,
    obs ? `📝 *Observação:* ${obs}` : null,
    ``,
    `Qualquer dúvida, é só chamar por aqui! 🐾`,
    `— Equipe Empório do Pet`,
  ]
    .filter((l) => l !== null)
    .join("\n");
}
