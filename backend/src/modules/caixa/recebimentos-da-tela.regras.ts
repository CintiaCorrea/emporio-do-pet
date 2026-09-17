/**
 * COMO A BAIXA APARECE NA TELA DE RECEBIMENTOS — no molde do SimplesVet.
 *
 * Cintia, 17/09/2026, com os prints: "Eu vejo o recebimento, mas não consigo ver as informações
 * da baixa, dia, forma, parcelamento." Os dados estavam gravados (modalidade, parcelas, bandeira,
 * AUT, NSU em `recebimentos.formas`); a tela só mostrava o nome da forma.
 */

/** Recebimento antigo chega com formas tortas ([[]], vazio): achata e fica só com objetos. */
export function formasDoRecebimento(formas: unknown): any[] {
  return (Array.isArray(formas) ? (formas as any[]).flat() : []).filter(
    (f: any) => f && typeof f === 'object' && !Array.isArray(f),
  );
}

/**
 * A condição da forma, como a linha de baixo do SimplesVet ("A Vista", "Parcelado 2x").
 * Parcelas mandam; sem parcelas, vale a modalidade gravada (Crédito à vista, Débito…).
 */
export function condicaoDaForma(f: any): string {
  const n = Math.trunc(Number(f?.parcelas) || 0);
  if (n > 1) return `Parcelado ${n}x`;
  const modalidade = String(f?.modalidade || '').trim();
  if (modalidade && !/parcelado/i.test(modalidade)) return modalidade;
  return 'À vista';
}

/** Forma + condição numa frase curta, para a coluna da lista: "InfinityPay · Parcelado 2x". */
export function rotuloDaForma(f: any): string {
  const nome = String(f?.forma || '').trim() || 'Sem forma';
  return `${nome} · ${condicaoDaForma(f)}`;
}

export type FormaComCondicoes = { nome: string; valor: number; condicoes: { nome: string; valor: number }[] };

/**
 * O quadro "Formas de recebimento" do resumo: cada forma com as condições embaixo.
 * O que o recebimento tem além da soma das formas (baixa sem forma) cai em "Sem forma", para o
 * total do quadro bater com a receita.
 */
export function formasComCondicoes(recs: { valorTotal: any; formas: unknown }[]): FormaComCondicoes[] {
  const mapa = new Map<string, Map<string, number>>();
  const soma = (forma: string, cond: string, v: number) => {
    if (!mapa.has(forma)) mapa.set(forma, new Map());
    const m = mapa.get(forma)!;
    m.set(cond, (m.get(cond) || 0) + v);
  };
  for (const r of recs || []) {
    const fs = formasDoRecebimento(r.formas);
    let somado = 0;
    for (const f of fs) {
      const v = Number(f?.valor) || 0;
      somado += v;
      soma(String(f?.forma || '').trim() || 'Sem forma', condicaoDaForma(f), v);
    }
    const resto = (Number(r.valorTotal) || 0) - somado;
    if (resto > 0.005) soma('Sem forma', 'À vista', resto);
  }
  const redondo = (v: number) => Math.round(v * 100) / 100;
  return [...mapa.entries()]
    .map(([nome, conds]) => {
      const condicoes = [...conds.entries()].map(([n, v]) => ({ nome: n, valor: redondo(v) })).sort((a, b) => b.valor - a.valor);
      return { nome, valor: redondo(condicoes.reduce((s, c) => s + c.valor, 0)), condicoes };
    })
    .sort((a, b) => b.valor - a.valor);
}
