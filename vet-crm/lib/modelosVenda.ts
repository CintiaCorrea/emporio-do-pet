// Modelo de venda — os itens prontos + a observação que a tela ERP › "Modelo de orçamento"
// cadastra na lista `orcamentomodelo`.
//
// Até 07/09/2026 só o Orçamento rápido sabia usar o modelo; o próprio arquivo da tela de
// cadastro dizia "o «usar modelo» no orçamento/PDV é ligado depois". Pedido da Cintia:
// "TODOS os pontos de venda, com exceção da internação, devem permitir escolher o modelo a ser
// utilizado, dessa forma informações básicas já podem ficar registradas na observação".
//
// Aqui mora só a LEITURA do modelo e o casamento com o catálogo. Quem monta a linha da venda
// continua sendo lib/catalogoVendavel (linhaDoItem/itemParaVenda): o modelo não inventa item,
// não inventa preço e não decide se é serviço ou produto.
import { normalizar } from "@/lib/buscaCatalogo";
import { nomeSemMarcador } from "@/lib/catalogoVendavel";

export type ItemDeModelo = { descricao: string; servicoId?: string; quantidade: number; valorUnitario: number };
export type ModeloVenda = {
  id: string;
  nome: string;
  ativo?: boolean;
  observacao?: string;
  compartilhado?: boolean;
  autorId?: string;
  autorNome?: string;
  itens: ItemDeModelo[];
};

/** Linhas cruas de /api/listas?lista=orcamentomodelo → modelos legíveis, sem os inativos, em ordem. */
export function lerModelos(bruto: unknown): ModeloVenda[] {
  const arr = Array.isArray(bruto) ? bruto : ((bruto as any)?.itens ?? (bruto as any)?.data ?? []);
  if (!Array.isArray(arr)) return [];
  const lidos: ModeloVenda[] = [];
  for (const linha of arr) {
    let m: any = null;
    try { m = JSON.parse((linha as any)?.valor); } catch { m = null; }
    if (!m || typeof m !== "object") continue;   // linha quebrada não derruba a lista inteira
    if (m.ativo === false) continue;
    const itens = Array.isArray(m.itens) ? m.itens : [];
    lidos.push({
      id: String((linha as any)?.id ?? ""),
      nome: String(m.nome ?? "").trim() || "(sem nome)",
      ativo: true,
      observacao: m.observacao == null ? "" : String(m.observacao),
      compartilhado: m.compartilhado !== false,
      autorId: m.autorId ? String(m.autorId) : "",
      autorNome: m.autorNome ? String(m.autorNome) : "",
      itens: itens
        .map((it: any) => ({
          descricao: String(it?.descricao ?? "").trim(),
          servicoId: it?.servicoId ? String(it.servicoId) : "",
          quantidade: Number(it?.quantidade) || 1,
          valorUnitario: Number(it?.valorUnitario) || 0,
        }))
        .filter((it: ItemDeModelo) => it.descricao || it.servicoId),
    });
  }
  return lidos.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Os modelos ativos, prontos pra lista. Erro de rede não quebra a tela de venda: volta vazio. */
export async function carregarModelosVenda(): Promise<ModeloVenda[]> {
  try {
    const r = await fetch(`/api/listas?lista=orcamentomodelo`, { cache: "no-store" });
    if (!r.ok) return [];
    return lerModelos(await r.json());
  } catch { return []; }
}

/**
 * Acha o item do modelo dentro do catálogo: primeiro pelo id gravado, depois pelo nome
 * normalizado (sem acento, sem o 🔬 do exame) — o mesmo normalizar da busca.
 *
 * Casar importa por dois motivos: é o que faz o item chegar na venda com identidade (exame,
 * fornecedor, item do catálogo novo) e é o que traz o preço de HOJE. O modelo guarda o valor
 * do dia em que foi criado; o catálogo guarda o que vale agora — e é o catálogo que sabe
 * cobrar por faixa de peso.
 */
export function casarNoCatalogo<T extends { id?: string; nome?: string }>(
  item: { servicoId?: string; descricao?: string } | null | undefined,
  catalogo: T[],
): T | null {
  if (!Array.isArray(catalogo) || catalogo.length === 0) return null;
  const id = String(item?.servicoId ?? "").trim();
  if (id) {
    const porId = catalogo.find((c) => String(c?.id ?? "") === id);
    if (porId) return porId;
  }
  const alvo = normalizar(nomeSemMarcador(String(item?.descricao ?? "")));
  if (!alvo) return null;
  return catalogo.find((c) => normalizar(nomeSemMarcador(String(c?.nome ?? ""))) === alvo) ?? null;
}

/**
 * Junta a observação do modelo com o que a pessoa já escreveu. Nunca apaga o texto dela, e
 * aplicar o mesmo modelo duas vezes não escreve a observação duas vezes.
 */
export function juntarObservacao(atual: unknown, doModelo: unknown): string {
  const a = String(atual ?? "").trim();
  const b = String(doModelo ?? "").trim();
  if (!b) return a;
  if (!a) return b;
  if (normalizar(a).includes(normalizar(b))) return a;
  return `${a}\n${b}`;
}
