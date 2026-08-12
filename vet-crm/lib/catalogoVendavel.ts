// FONTE ÚNICA do catálogo vendável — usar em TODA tela que vende ou orça (PDV, orçamento do
// inbox, modelos de orçamento, atendimento, internação, comanda…). Evita o bug recorrente de
// "produto/vacina não aparece": traz TODOS os itens ATIVOS do catálogo (Product: serviço +
// produto + medicamento/vacina), SEM truncar (limit alto — hoje ~1330 itens), e opcionalmente os
// exames (dedup preferindo o lab Veter). NUNCA usar limit baixo nem excludeService pra vender.

export type ItemVendavel = {
  id: string;
  nome: string;
  valorPadrao: number;
  custoPadrao?: number;
  tipo?: string;          // SERVICE | MEDICINE | ... (do Product.type)
  categoria?: string | null;
  _exame?: boolean;
  _fornecedorId?: string | null;
  _fornecedorNome?: string | null;
};

// LINHA de venda padronizada — o "centro operacional" de um item, IGUAL em toda tela.
export type LinhaVendavel = {
  descricao: string; valorUnitario: number; custoUnitario: number;
  servicoId?: string; productId?: string;
  _exame?: boolean; catalogoExameId?: string; fornecedorId?: string | null; fornecedorNome?: string | null;
};

/** Transforma um item do catálogo numa LINHA de venda/comanda/orçamento PADRÃO — trata exame vs
 *  produto/serviço de forma ÚNICA (id certo, tira o "🔬", carrega a identidade do exame). Toda tela
 *  que adiciona item deve usar isto: muda só a UX (o layout), o NÚCLEO é um só → mudou aqui, mudou
 *  em toda a cadeia. Cada tela usa os campos que suporta (ex.: só o PDV usa catalogoExameId). */
/** Tira o marcador visual "🔬 " do nome do exame — a convenção do marcador mora só aqui. */
export const nomeSemMarcador = (nome?: string) => (nome || "").replace(/^🔬\s*/, "");

/** Rótulo do LABORATÓRIO de um item do catálogo — só faz sentido pra EXAME. Fonte ÚNICA da regra
 *  "mostrar o lab na frente do exame + estrela no Veter (padrão)": devolve o nome do lab e se é o
 *  Veter (`/veter/i`, mesma convenção do resto do sistema). Todas as telas de venda usam isto. */
export function labDoItem(item?: { _exame?: boolean; _fornecedorNome?: string | null } | null): { nome: string; veter: boolean } | null {
  if (!item?._exame) return null;
  const nome = String(item._fornecedorNome || "").trim();
  if (!nome) return null;
  return { nome, veter: /veter/i.test(nome) };
}

export function linhaDoItem(item: ItemVendavel): LinhaVendavel {
  const descricao = nomeSemMarcador(item.nome);
  const base = { descricao, valorUnitario: Number(item.valorPadrao) || 0, custoUnitario: Number(item.custoPadrao) || 0 };
  if (item._exame) {
    return { ...base, _exame: true, catalogoExameId: item.id, fornecedorId: item._fornecedorId ?? null, fornecedorNome: item._fornecedorNome ?? null };
  }
  return { ...base, servicoId: item.id, productId: item.id };
}

/** Núcleo ÚNICO do ENVIO: objeto-base do item pra mandar ao servidor (venda/orçamento), a partir de
 *  uma linha. Garante que custo + fornecedor + identidade do exame SEMPRE viajam juntos — nenhuma
 *  tela "reembala" e perde campo. A tela só acrescenta o que é dela (quantidade, desconto, executor).
 *  Mudou aqui → muda em toda a cadeia (PDV, comanda, atendimento, internação, orçamento). */
export function itemParaVenda(l: { descricao?: string; valorUnitario?: number; custoUnitario?: number; _exame?: boolean; catalogoExameId?: string; fornecedorId?: string | null; servicoId?: string; productId?: string }): Record<string, any> {
  const base: Record<string, any> = {
    descricao: l.descricao,
    valorUnitario: Number(l.valorUnitario) || 0,
    ...(l.custoUnitario != null ? { custoUnitario: Number(l.custoUnitario) } : {}),
  };
  if (l._exame) return { ...base, tipoItem: "EXAME", catalogoExameId: l.catalogoExameId, fornecedorId: l.fornecedorId ?? undefined };
  return { ...base, ...(l.servicoId ? { servicoId: l.servicoId, productId: l.productId ?? l.servicoId } : {}) };
}

/** Carrega o catálogo vendável completo: serviços + produtos + medicamentos/vacinas + EXAMES.
 *  Exames vêm por PADRÃO (aparecem em toda venda/orçamento). Passe `{ exames: false }` só se a
 *  tela realmente não puder vender exame. */
export async function carregarCatalogoVendavel(opts?: { exames?: boolean }): Promise<ItemVendavel[]> {
  const out: ItemVendavel[] = [];

  // Produtos + serviços + medicamentos/vacinas — TODOS de uma vez, sem excludeService, sem truncar.
  try {
    const d = await fetch("/api/products?limit=5000", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
    const arr: any[] = Array.isArray(d?.products) ? d.products : (Array.isArray(d) ? d : (d?.data || d?.itens || []));
    for (const p of arr) {
      const nome = p?.name || p?.nome;
      if (!p || p.ativo === false || !nome) continue;
      out.push({
        id: p.id,
        nome,
        valorPadrao: Number(p.price ?? p.preco ?? p.valorPadrao ?? 0),
        custoPadrao: Number(p.custoPadrao ?? p.custo ?? 0) || undefined,
        tipo: p.type,
        categoria: p.category?.nome ?? null,
      });
    }
  } catch { /* rede — devolve o que tiver */ }

  // Exames (padrão SIM) — dedup por NOME, preferindo o lab Veter (padrão). Opt-out: { exames: false }.
  if (opts?.exames !== false) {
    try {
      const ex = await fetch("/api/fornecedores/exames/lista", { cache: "no-store" }).then((r) => r.json()).catch(() => []);
      const exArr: any[] = Array.isArray(ex) ? ex : (ex?.itens || ex?.data || []);
      const porNome = new Map<string, any>();
      for (const e of exArr) {
        const nome = String(e?.nome || "").trim();
        if (!nome) continue;
        const chave = nome.toLowerCase();
        const atual = porNome.get(chave);
        const ehVeter = /veter/i.test(e?.fornecedor?.nome || "");
        if (!atual || (ehVeter && !/veter/i.test(atual?.fornecedor?.nome || ""))) porNome.set(chave, e);
      }
      for (const e of porNome.values()) {
        out.push({
          id: e.id,
          nome: `🔬 ${e.nome}`,
          valorPadrao: Number(e.valorClienteSugerido ?? e.valorCliente ?? 0),
          custoPadrao: Number(e.valorFornecedor ?? 0) || undefined, // custo do lab → alimenta o a-pagar
          _exame: true,
          _fornecedorId: e.fornecedorId ?? e.fornecedor?.id ?? null,
          _fornecedorNome: e.fornecedor?.nome ?? null,
        });
      }
    } catch { /* rede */ }
  }

  return out;
}
