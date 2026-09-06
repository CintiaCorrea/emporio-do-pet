import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// 🛡️ PROTEÇÃO DA BUSCA DE ITENS NAS TELAS DE VENDA.
//
// A Cintia, em 06/09/2026, duas vezes no mesmo dia:
//   "localizar serviços e produtos quando digitamos a venda, muitas vezes não aparece"
//   "fui incluir transfusão na comanda da internação e ele não traz, já na comanda na tela
//    do pet ele traz. Esse tipo de erro é muito comum e atrapalha bastante a rotina"
//
// E a regra que ela deu: "é para TODOS os pontos de venda trazerem os itens de produtos e
// serviços."
//
// O que causava isso não era um bug só — eram três, cada um numa tela, todos invisíveis:
//   · `nome.includes(texto)` cru, que exige acento certo e palavras coladas na ordem;
//   · `.slice(0, 12)` cortando a lista sem avisar que havia mais;
//   · a internação filtrando o catálogo POR TIPO antes de buscar, o que deixava produto
//     fora do alcance de quem estava cobrando.
//
// Nenhum deles quebra o build, nenhum aparece no tsc, e todos parecem "o sistema não achou".
// Estes testes falham ANTES disso, com o motivo escrito.

const raiz = path.resolve(__dirname, "..");
const bruto = (p: string) => fs.readFileSync(path.join(raiz, p), "utf8");

/**
 * O código SEM os comentários.
 *
 * Duas vezes seguidas uma trava dessas acusou errado porque a âncora casou com o comentário
 * que EXPLICAVA o erro removido. Teste que acusa errado ensina a equipe a ignorar teste —
 * então aqui o comentário sai antes de qualquer comparação.
 */
const ler = (p: string) =>
  bruto(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")   // {/* comentário de JSX */}
    .replace(/\/\*[\s\S]*?\*\//g, "")        // /* bloco */
    .replace(/^\s*\/\/.*$/gm, "");             // // linha

/** Toda tela por onde a recepção lança item numa venda, comanda, orçamento ou conta. */
const TELAS_DE_VENDA = [
  "app/(user)/dashboard/erp/ponto-de-venda/page.tsx",
  "app/(user)/dashboard/erp/internacoes/[id]/page.tsx",
  "app/(user)/dashboard/erp/internacoes/page.tsx",
  "app/(user)/dashboard/erp/modelos-orcamento/page.tsx",
  "components/vendas/OrcamentoRapidoModal.tsx",
  "components/pets/PetComandaRail.tsx",
];

describe("a busca de itens é a mesma em toda tela que vende", () => {
  it.each(TELAS_DE_VENDA)("%s usa o núcleo lib/buscaCatalogo", (tela) => {
    const src = ler(tela);
    // Ou importa a função direto, ou usa o seletor pronto (que a usa por dentro).
    expect(src.includes("@/lib/buscaCatalogo") || src.includes("@/components/vendas/BuscaItemCatalogo")).toBe(true);
  });

  it.each(TELAS_DE_VENDA)("%s não voltou ao filtro cru por includes", (tela) => {
    const src = ler(tela);
    // O padrão que sumia com item acentuado e com palavra fora de ordem. Se ele voltar, é a
    // recepção deixando de achar "Vacina Antirrábica" ao digitar "antirrabica".
    const cru = /\.filter\(\([^)]*\) =>\s*\(?[\w.?]*(nome|name|descricao)[^)]*\)?[^)]*\.toLowerCase\(\)\.includes\(/;
    expect(cru.test(src)).toBe(false);
  });
});

describe("o catálogo chega inteiro em quem vende", () => {
  it("a internação busca no catálogo inteiro, não só nos serviços", () => {
    const src = ler("app/(user)/dashboard/erp/internacoes/[id]/page.tsx");
    // O item da conta sai de uma busca sobre `catalogo` — produto E serviço. Antes eram dois
    // <select> separados, e produto só aparecia na categoria "Insumo", que NÃO cobra: dava pra
    // ver o item e não dava pra cobrar por ele.
    expect(src).toContain("itens={catalogo as any}");
    expect(src).not.toMatch(/<select value=\{itemForm\.servicoId\}/);
    expect(src).not.toMatch(/<select value=\{itemForm\.productId\}/);
  });

  it("nenhum item some entre as listas de serviço e produto", () => {
    const src = ler("app/(user)/dashboard/erp/internacoes/[id]/page.tsx");
    // `i.tipo && i.tipo !== "SERVICE"` era um rombo: item com tipo em branco não caía em
    // NENHUMA das duas listas e sumia calado das duas.
    expect(src).not.toMatch(/filter\(\(i\) => i\.tipo && i\.tipo !== "SERVICE"/);
    expect(src).toMatch(/filter\(\(i\) => i\.tipo !== "SERVICE" && !i\._exame\)/);
  });

  it("o orçamento rápido não usa mais <datalist> com o catálogo inteiro", () => {
    const src = ler("components/vendas/OrcamentoRapidoModal.tsx");
    // ~900 <option> jogadas no navegador: quem filtrava era o Chrome, comparando COM acento,
    // e o onBlur limpava o campo quando o texto não batia letra por letra.
    expect(src).not.toMatch(/<datalist[ >]/);
    expect(src).toContain("BuscaItemCatalogo");
  });
});

describe("o corte da lista nunca é mudo", () => {
  it.each([
    "app/(user)/dashboard/erp/ponto-de-venda/page.tsx",
    "components/vendas/BuscaItemCatalogo.tsx",
  ])("%s avisa quando não coube tudo", (tela) => {
    expect(ler(tela)).toContain("avisoDeCorte");
  });
});
