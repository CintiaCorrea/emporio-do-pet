// Composição dos pacotes/kits pros documentos impressos (orçamento/venda): dado o NOME do pacote
// que veio na linha do documento, devolve os itens que o compõem (nome + quantidade, SEM preço).
// O item do orçamento/venda só guarda a descrição (o nome do pacote), então casamos pelo nome.

type ItemComp = { nome: string; quantidade: number };
let cache: { at: number; map: Map<string, ItemComp[]> } | null = null;

const norm = (s: any) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export async function carregarComposicaoPacotes(): Promise<Map<string, ItemComp[]>> {
  if (cache && Date.now() - cache.at < 5 * 60_000) return cache.map;
  try {
    const r = await fetch("/api/catalogo/pacotes-composicao", { cache: "no-store" });
    const d = await r.json();
    const arr = Array.isArray(d) ? d : (d.data || d.itens || []);
    const map = new Map<string, ItemComp[]>();
    for (const p of arr) {
      if (p?.nome && Array.isArray(p.itens) && p.itens.length) {
        map.set(norm(p.nome), p.itens.map((x: any) => ({ nome: String(x.nome || ""), quantidade: Number(x.quantidade) || 1 })));
      }
    }
    cache = { at: Date.now(), map };
    return map;
  } catch {
    return cache?.map || new Map();
  }
}

/** Itens que compõem o pacote com esta descrição (ou null se a linha não for um pacote). */
export function itensDoPacote(map: Map<string, ItemComp[]>, descricao: any): ItemComp[] | null {
  const its = map.get(norm(descricao));
  return its && its.length ? its : null;
}
