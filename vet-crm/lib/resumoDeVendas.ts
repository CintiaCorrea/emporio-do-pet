// O RESUMO DA CONSULTA DE VENDAS — todos os quadros saem daqui, de uma passada só.
//
// Existe por causa do que a leitura do SimplesVet (07/09/2026) encontrou: na mesma tela
// conviviam quatro totais que não fechavam entre si. O quadro de situação somava "quanto já
// recebi" em duas linhas e "quanto falta" na terceira, e o total dele ficava R$ 70,26 fora de
// todo o resto; a coluna de percentual trocava de fórmula entre a linha e o rodapé.
//
// Aqui a regra é uma só e vale para todos os quadros:
//   líquido  = a soma do VALOR das vendas (o que foi cobrado)
//   desconto = a soma dos descontos dos itens
//   bruto    = líquido + desconto        ← por construção, bruto − desconto = líquido
//   recebido = o que entrou de fato
//   aberto   = líquido − recebido, nunca negativo
//
// Decisões da Cintia que estão embutidas: orçamento NUNCA chega aqui (ele não é venda), e
// crédito de cliente não é produto vendido — no sistema antigo era, porque não havia outro
// jeito de lançar, e o mesmo dinheiro aparecia como produto e como forma de pagamento.

export type ItemDaVenda = {
  descricao?: string | null;
  quantidade?: number | null;
  valorUnitario?: number | null;
  valorTotal?: number | null;
  desconto?: number | null;
  grupo?: string | null;        // congelado da importacao do SimplesVet
  grupoNome?: string | null;    // do NOSSO catalogo (cat_grupos) — e este que manda
  grupoPai?: string | null;     // o grupo pai, quando existe
  tipoItem?: string | null;     // PRODUTO | SERVICO | EXAME | VACINA | PACOTE | KIT
  convenio?: string | null;     // quem paga o item, quando nao e o tutor
  servicoId?: string | null;
  productId?: string | null;
  catalogoItemId?: string | null;
};

export type RecebimentoDaVenda = { valor?: number | null; data?: string | null; formas?: unknown };

export type VendaDoResumo = {
  id?: string;
  date?: string | null;
  valor?: number | null;
  pago?: number | null;
  situacao?: "ABERTA" | "PARCIAL" | "PAGA";
  funcionario?: string | null;
  itens?: ItemDaVenda[] | null;
  recebimentos?: RecebimentoDaVenda[] | null;
};

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const dia = (d: unknown) => String(d ?? "").slice(0, 10);
const pct = (parte: number, todo: number) => (todo > 0 ? (parte / todo) * 100 : 0);

/** O bruto e o desconto de UMA venda, lidos dos itens dela. */
function daVenda(v: VendaDoResumo) {
  const itens = Array.isArray(v.itens) ? v.itens : [];
  let bruto = 0, desconto = 0;
  for (const it of itens) {
    const q = n(it.quantidade) || 1;
    const vu = n(it.valorUnitario);
    bruto += q * vu;
    desconto += n(it.desconto);
  }
  const liquido = n(v.valor);
  const pago = Math.max(0, Math.min(n(v.pago), liquido));
  return { bruto, desconto, liquido, pago, aberto: Math.max(0, liquido - pago) };
}

export type LinhaDia = { dia: string; qtd: number; ticket: number; bruto: number; desconto: number; percentual: number; liquido: number; recebido: number; aberto: number };
export type LinhaForma = { forma: string; valor: number; parcelas: { rotulo: string; valor: number }[] };
export type LinhaSituacao = { situacao: "ABERTA" | "PARCIAL" | "PAGA"; rotulo: string; qtd: number; valor: number; recebido: number; aberto: number };
export type LinhaNome = { nome: string; qtd: number; bruto: number; desconto: number; liquido: number };
export type LinhaGrupo = LinhaNome & { percentual: number; pai: string | null };
export type LinhaConvenio = { nome: string; itens: number; valor: number };
export type LinhaItem = LinhaNome & { grupo: string; chave: string; nomeRepetido: boolean };

export type Resumo = {
  cards: { qtd: number; bruto: number; desconto: number; percentualDesconto: number; liquido: number; recebido: number; aberto: number; ticket: number };
  porDia: LinhaDia[];
  porForma: LinhaForma[];
  porSituacao: LinhaSituacao[];
  porFuncionario: LinhaNome[];
  porGrupo: LinhaGrupo[];
  porTipo: LinhaNome[];
  porConvenio: LinhaConvenio[];
  porItem: LinhaItem[];
  porDataDeBaixa: { dia: string; valor: number }[];
  /** Diferença entre a soma dos itens e o valor cobrado (desconto dado na venda inteira). */
  ajusteDeVenda: number;
};

const ROTULO_SITUACAO: Record<string, string> = { ABERTA: "Aberto", PARCIAL: "Baixa parcial", PAGA: "Baixado" };
const ROTULO_TIPO: Record<string, string> = {
  PRODUTO: "Produto", SERVICO: "Serviço", EXAME: "Exame", VACINA: "Vacina", PACOTE: "Pacote", KIT: "Kit",
};

export function resumoDeVendas(vendas: VendaDoResumo[] | null | undefined): Resumo {
  const lista = Array.isArray(vendas) ? vendas : [];

  let bruto = 0, desconto = 0, liquido = 0, recebido = 0, somaItens = 0;
  const dias = new Map<string, LinhaDia>();
  const formas = new Map<string, { valor: number; parcelas: Map<string, number> }>();
  const situacoes = new Map<string, LinhaSituacao>();
  const funcs = new Map<string, LinhaNome>();
  const grupos = new Map<string, LinhaNome & { pai: string | null }>();
  const tipos = new Map<string, LinhaNome>();
  const convenios = new Map<string, LinhaConvenio>();
  const itens = new Map<string, LinhaItem>();
  const baixas = new Map<string, number>();
  const nomesPorChave = new Map<string, Set<string>>();

  for (const v of lista) {
    const d = daVenda(v);
    liquido += d.liquido;
    desconto += d.desconto;
    recebido += d.pago;
    somaItens += d.bruto - d.desconto;

    // ── por dia (do dia da VENDA, regime de competência) ──
    const k = dia(v.date);
    const ld = dias.get(k) || { dia: k, qtd: 0, ticket: 0, bruto: 0, desconto: 0, percentual: 0, liquido: 0, recebido: 0, aberto: 0 };
    ld.qtd += 1;
    ld.liquido += d.liquido;
    ld.desconto += d.desconto;
    ld.recebido += d.pago;
    dias.set(k, ld);

    // ── por situação: as três colunas juntas, pra o quadro FECHAR ──
    const sit = (v.situacao || (d.pago <= 0 ? "ABERTA" : d.aberto <= 0.009 ? "PAGA" : "PARCIAL")) as LinhaSituacao["situacao"];
    const ls = situacoes.get(sit) || { situacao: sit, rotulo: ROTULO_SITUACAO[sit] || sit, qtd: 0, valor: 0, recebido: 0, aberto: 0 };
    ls.qtd += 1; ls.valor += d.liquido; ls.recebido += d.pago; ls.aberto += d.aberto;
    situacoes.set(sit, ls);

    // ── por funcionário ──
    const nomeF = (v.funcionario || "").trim() || "Sem funcionário";
    const lf = funcs.get(nomeF) || { nome: nomeF, qtd: 0, bruto: 0, desconto: 0, liquido: 0 };
    lf.qtd += 1; lf.bruto += d.bruto; lf.desconto += d.desconto; lf.liquido += d.bruto - d.desconto;
    funcs.set(nomeF, lf);

    // ── por grupo e por item ──
    for (const it of Array.isArray(v.itens) ? v.itens : []) {
      const q = n(it.quantidade) || 1;
      const b = q * n(it.valorUnitario);
      const desc = n(it.desconto);
      // O catalogo manda; o campo da importacao e so o ultimo recurso (venda antiga).
      const g = (it.grupoNome || it.grupo || "").trim() || "Sem grupo";
      const pai = (it.grupoPai || "").trim() || null;
      const lg = grupos.get(g) || { nome: g, pai, qtd: 0, bruto: 0, desconto: 0, liquido: 0 };
      lg.qtd += q; lg.bruto += b; lg.desconto += desc; lg.liquido += b - desc;
      grupos.set(g, lg);

      const tp = ROTULO_TIPO[String(it.tipoItem || "")] || "Não classificado";
      const lt = tipos.get(tp) || { nome: tp, qtd: 0, bruto: 0, desconto: 0, liquido: 0 };
      lt.qtd += q; lt.bruto += b; lt.desconto += desc; lt.liquido += b - desc;
      tipos.set(tp, lt);

      // Item pago pelo convenio: sai do total do tutor e vira a-receber mensal do convenio.
      const conv = (it.convenio || "").trim();
      if (conv) {
        const lc = convenios.get(conv) || { nome: conv, itens: 0, valor: 0 };
        lc.itens += q; lc.valor += b - desc;
        convenios.set(conv, lc);
      }

      // A chave do item é o ID do catálogo — dois cadastros com o MESMO nome são dois itens,
      // e é isso que a tela precisa mostrar pra alguém arrumar o cadastro.
      const nomeIt = (it.descricao || "").trim() || "Item";
      const chave = String(it.catalogoItemId || it.productId || it.servicoId || `nome:${nomeIt.toLowerCase()}`);
      const li = itens.get(chave) || { grupo: g, chave, nome: nomeIt, qtd: 0, bruto: 0, desconto: 0, liquido: 0, nomeRepetido: false };
      li.qtd += q; li.bruto += b; li.desconto += desc; li.liquido += b - desc;
      itens.set(chave, li);

      const chavesDoNome = nomesPorChave.get(nomeIt.toLowerCase()) || new Set<string>();
      chavesDoNome.add(chave);
      nomesPorChave.set(nomeIt.toLowerCase(), chavesDoNome);
    }

    // ── formas de recebimento e data da baixa (regime de caixa) ──
    for (const r of Array.isArray(v.recebimentos) ? v.recebimentos : []) {
      const kb = dia(r.data);
      if (kb) baixas.set(kb, (baixas.get(kb) || 0) + n(r.valor));

      const fs = Array.isArray(r.formas) ? (r.formas as any[]) : [];
      if (!fs.length) {
        const lfm = formas.get("Não informada") || { valor: 0, parcelas: new Map<string, number>() };
        lfm.valor += n(r.valor);
        formas.set("Não informada", lfm);
        continue;
      }
      for (const f of fs) {
        const nome = String(f?.forma || "Não informada").trim() || "Não informada";
        const valor = n(f?.valor);
        const parcelas = n(f?.parcelas);
        const rotulo = parcelas > 1 ? `Parcelado ${parcelas}x` : "À Vista";
        const lfm = formas.get(nome) || { valor: 0, parcelas: new Map<string, number>() };
        lfm.valor += valor;
        lfm.parcelas.set(rotulo, (lfm.parcelas.get(rotulo) || 0) + valor);
        formas.set(nome, lfm);
      }
    }
  }

  bruto = liquido + desconto;

  const porDia = [...dias.values()]
    .map((l) => ({
      ...l,
      bruto: l.liquido + l.desconto,
      // Uma fórmula só, em toda linha e no rodapé: desconto ÷ bruto.
      percentual: pct(l.desconto, l.liquido + l.desconto),
      ticket: l.qtd > 0 ? (l.liquido + l.desconto) / l.qtd : 0,
      aberto: Math.max(0, l.liquido - l.recebido),
    }))
    .sort((a, b) => a.dia.localeCompare(b.dia));

  const porForma = [...formas.entries()]
    .map(([forma, x]) => ({
      forma,
      valor: x.valor,
      parcelas: [...x.parcelas.entries()]
        .map(([rotulo, valor]) => ({ rotulo, valor }))
        .sort((a, b) => (a.rotulo === "À Vista" ? -1 : b.rotulo === "À Vista" ? 1 : a.rotulo.localeCompare(b.rotulo, "pt-BR", { numeric: true }))),
    }))
    .sort((a, b) => b.valor - a.valor);

  const ordemSit: LinhaSituacao["situacao"][] = ["ABERTA", "PARCIAL", "PAGA"];
  const porSituacao = ordemSit.map((k) => situacoes.get(k)).filter(Boolean) as LinhaSituacao[];

  const brutoDosGrupos = [...grupos.values()].reduce((s, x) => s + x.bruto, 0);
  const porGrupo = [...grupos.values()]
    .map((g) => ({ ...g, percentual: pct(g.bruto, brutoDosGrupos) }))
    // Agrupado pelo pai (a arvore do catalogo) e, dentro dele, do maior pro menor.
    .sort((a, b) => (a.pai || a.nome).localeCompare(b.pai || b.nome, "pt-BR") || b.liquido - a.liquido);

  const porItem = [...itens.values()]
    .map((i) => ({ ...i, nomeRepetido: (nomesPorChave.get(i.nome.toLowerCase())?.size || 0) > 1 }))
    .sort((a, b) => a.grupo.localeCompare(b.grupo, "pt-BR") || b.liquido - a.liquido);

  return {
    cards: {
      qtd: lista.length,
      bruto,
      desconto,
      percentualDesconto: pct(desconto, bruto),
      liquido,
      recebido,
      aberto: Math.max(0, liquido - recebido),
      ticket: lista.length > 0 ? bruto / lista.length : 0,
    },
    porDia,
    porForma,
    porSituacao,
    porFuncionario: [...funcs.values()].sort((a, b) => b.liquido - a.liquido),
    porGrupo,
    porTipo: [...tipos.values()].sort((a, b) => b.liquido - a.liquido),
    porConvenio: [...convenios.values()].sort((a, b) => b.valor - a.valor),
    porItem,
    porDataDeBaixa: [...baixas.entries()].map(([d, valor]) => ({ dia: d, valor })).sort((a, b) => a.dia.localeCompare(b.dia)),
    // Quando a venda teve desconto no total (não no item), a soma dos itens não bate com o
    // cobrado. Em vez de esconder, a tela mostra a diferença com nome.
    ajusteDeVenda: Number((somaItens - liquido).toFixed(2)),
  };
}
