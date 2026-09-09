// O EXTRATO DE VENDAS NO WHATSAPP — mesma casa, mesma cara do orçamento.
//
// Pedido da Cintia (09/09/2026): "preciso poder enviar os relatórios via whatsapp também".
// E, na sequência: "a conta aparece estruturada como quando enviamos o orçamento?"
//
// A pergunta é a regra. O textoDoOrcamento existe justamente porque dois textos parecidos
// significam a clínica se contradizendo na frente do cliente — ele não sabe que são duas
// telas. Então este arquivo segue o MESMO desenho: cabeçalho com pet, clínica e data, a
// mesma linha de item ("• 2× Nome — *R$ X*"), a mesma régua antes do total e a mesma
// despedida. Muda só o que precisa mudar: aqui cada venda tem data e situação de pagamento.
//
// Vai como TEXTO, não anexo: o projeto ainda não gera PDF, e no celular o cliente lê sem
// baixar nada. O envio usa o caminho dos documentos do prontuário — conversa aberta entrega
// na hora; fechada, usa o modelo que abre a conversa.

import { linhaDoItem, type ItemDoOrcamento } from "@/lib/textoDoOrcamento";

const BRL = (v: unknown) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type VendaDoTexto = {
  numero?: number | string | null;
  data?: string;
  pet?: string | null;
  valor?: number;
  pago?: number;
  itens?: ItemDoOrcamento[] | null;
};

const dia = (d?: string) => {
  try { return new Date(d || Date.now()).toLocaleDateString("pt-BR"); }
  catch { return ""; }
};

const abertoDe = (v: VendaDoTexto) => Math.max(0, Number(v.valor || 0) - Number(v.pago || 0));

/** Situação pelo SALDO, não pela etiqueta: venda parcialmente recebida ainda deve. */
function situacaoDa(v: VendaDoTexto): string {
  const aberto = abertoDe(v);
  if (aberto <= 0.009 && Number(v.valor || 0) > 0) return "✅ paga";
  if (Number(v.pago || 0) > 0.009) return `🟠 parcial — falta *${BRL(aberto)}*`;
  return "🔴 em aberto";
}

export function textoDoRelatorioVendas(opts: {
  cliente: string;
  petNome?: string | null;
  vendas: VendaDoTexto[];
  /** Modo cobrança: deixa de fora o que já está pago. */
  apenasEmAberto?: boolean;
}): string {
  const todas = [...(opts.vendas || [])].sort(
    (a, b) => new Date(a.data || 0).getTime() - new Date(b.data || 0).getTime(),
  );
  const lista = opts.apenasEmAberto ? todas.filter((v) => abertoDe(v) > 0.009) : todas;

  const total = lista.reduce((s, v) => s + Number(v.valor || 0), 0);
  const recebido = lista.reduce((s, v) => s + Number(v.pago || 0), 0);
  const emAberto = Math.max(0, total - recebido);

  const blocos = lista.flatMap((v) => {
    const num = v.numero != null ? ` #${v.numero}` : "";
    const itens = Array.isArray(v.itens) ? v.itens : [];
    return [
      `*${dia(v.data)}*${num}${v.pet ? ` · ${v.pet}` : ""} — ${situacaoDa(v)}`,
      ...(itens.length ? itens.map(linhaDoItem) : [`_Sem itens lançados._`]),
      `_Subtotal: ${BRL(v.valor)}_`,
      ``,
    ];
  });

  return [
    opts.apenasEmAberto
      ? `🧾 *Contas em aberto — ${opts.petNome || opts.cliente}*`
      : `🧾 *Extrato de compras — ${opts.petNome || opts.cliente}*`,
    `🏥 Empório do Pet · 🗓️ ${dia()}`,
    `👤 Tutor(a): ${opts.cliente || "Cliente"}`,
    ``,
    ...(lista.length
      ? blocos
      : [opts.apenasEmAberto ? `_Não há contas em aberto._ 🎉` : `_Nenhuma venda registrada._`, ``]),
    `━━━━━━━━━━━━━━━`,
    `💵 *Total: ${BRL(total)}*`,
    recebido > 0.009 ? `✅ Já recebido: ${BRL(recebido)}` : null,
    emAberto > 0.009 ? `🔴 *Saldo devedor: ${BRL(emAberto)}*` : null,
    ``,
    `Qualquer dúvida, é só chamar por aqui! 🐾`,
    `— Equipe Empório do Pet`,
  ]
    .filter((l) => l !== null)
    .join("\n");
}
