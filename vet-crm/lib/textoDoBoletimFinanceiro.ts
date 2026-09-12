// O BOLETIM FINANCEIRO DA INTERNAÇÃO NO WHATSAPP — mesma casa, mesma cara do orçamento.
//
// Cintia, 12/09/2026: "preciso que o boletim vá estruturado e não dessa forma". O que saía:
//
//   Diárias (8×): R$ 0,00                    ← sempre zero
//   AMOXICILINA LA (...) — aplicação 10:00: R$ 37,57
//   AMOXICILINA LA (...) — aplicação 10:00: R$ 37,57     ← a mesma coisa,
//   AMOXICILINA LA (...) — aplicação 10:00: R$ 37,57        quatro vezes
//   AMOXICILINA LA (...) — aplicação 10:00: R$ 37,57
//   Diária de internação: R$ 150,00
//
// TRÊS DEFEITOS. (1) A linha das diárias saía zerada porque a diária virou ITEM da conta —
// `diariaTotal = 0` é proposital, para não cobrar duas vezes — e ninguém tirou a linha órfã.
// (2) Cada aplicação virava uma linha, então a mesma medicação repetia. (3) Não tinha a
// estrutura dos outros documentos da casa.
//
// Aqui as aplicações iguais viram "4× AMOXICILINA — R$ 150,28", e o resto segue o desenho do
// textoDoOrcamento: mesmo cabeçalho, MESMA linha de item, mesma régua, mesma despedida. O
// cliente não sabe que são telas diferentes; ele vê a clínica falando de um jeito só.

import { linhaDoItem, type ItemDoOrcamento } from "@/lib/textoDoOrcamento";

const BRL = (v: unknown) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type ItemDaConta = {
  descricao?: string | null;
  quantidade?: number | null;
  valorUnitario?: number | null;
};

/**
 * Junta as linhas repetidas: quatro aplicações da mesma medicação, ao mesmo preço, viram uma
 * linha com quantidade 4. O horário sai do nome — "às 10:00" numa conta é ruído; o que o
 * tutor precisa saber é o que foi usado, quanto e quantas vezes.
 */
export function agruparItens(itens: ItemDaConta[]): ItemDoOrcamento[] {
  const semHorario = (d: string) =>
    d.replace(/\s*[—-]\s*aplica[çc][ãa]o\s*\d{1,2}:\d{2}\s*$/i, "").trim();

  const mapa = new Map<string, ItemDoOrcamento>();
  for (const it of Array.isArray(itens) ? itens : []) {
    const nome = semHorario(String(it?.descricao || "Item"));
    const vu = Number(it?.valorUnitario) || 0;
    const qtd = Number(it?.quantidade) || 1;
    const chave = `${nome}::${vu.toFixed(2)}`;
    const atual = mapa.get(chave);
    if (atual) atual.quantidade = (Number(atual.quantidade) || 0) + qtd;
    else mapa.set(chave, { descricao: nome, quantidade: qtd, valorUnitario: vu });
  }
  return [...mapa.values()];
}

export function textoDoBoletimFinanceiro(o: {
  petNome?: string | null;
  tutorNome?: string | null;
  dias?: number | null;
  box?: string | null;
  itens?: ItemDaConta[] | null;
  caucao?: number | null;
  /** Data do boletim; sem ela, vale hoje. */
  data?: string | Date | null;
}): string {
  const agrupados = agruparItens(o.itens || []);
  const total = agrupados.reduce(
    (s, i) => s + (Number(i.quantidade) || 1) * (Number(i.valorUnitario) || 0),
    0,
  );
  const caucao = Number(o.caucao) || 0;
  const saldo = Math.max(0, total - caucao);
  const dia = (() => {
    try { return new Date(o.data || Date.now()).toLocaleDateString("pt-BR"); }
    catch { return new Date().toLocaleDateString("pt-BR"); }
  })();

  return [
    `🏥 *Boletim financeiro — ${o.petNome || "seu pet"}*`,
    `🏥 Empório do Pet · 🗓️ ${dia}`,
    o.tutorNome ? `👤 Tutor(a): ${o.tutorNome}` : null,
    o.dias ? `🛏️ ${o.dias}º dia de internação${o.box ? ` · Box ${o.box}` : ""}` : (o.box ? `🛏️ Box ${o.box}` : null),
    ``,
    ...(agrupados.length
      ? [`*Conta até agora:*`, ...agrupados.map(linhaDoItem)]
      : [`_Nenhum item lançado até agora._`]),
    ``,
    `━━━━━━━━━━━━━━━`,
    `💵 *Total: ${BRL(total)}*`,
    caucao > 0.009 ? `✅ Caução em conta: ${BRL(caucao)}` : null,
    caucao > 0.009 ? `🔴 *Saldo estimado: ${BRL(saldo)}*` : null,
    ``,
    `Qualquer dúvida, é só chamar por aqui! 🐾`,
    `— Equipe Empório do Pet`,
  ]
    .filter((l) => l !== null)
    .join("\n");
}
