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
  "app/(user)/dashboard/erp/pets/[id]/atendimentos/novo/page.tsx",
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

  it("ninguém volta a comparar o tipo do item à mão", () => {
    // O catálogo antigo grava SERVICE (inglês), o novo grava SERVICO (português). Comparar
    // com um só faz os 241 serviços do catálogo novo caírem na lista de produtos — foi assim
    // que "Transfusão de sangue" virou item que dá pra ver e não dá pra cobrar.
    // Quem decide é ehServicoDoCatalogo, e só ela.
    for (const tela of TELAS_DE_VENDA) {
      expect(ler(tela)).not.toMatch(/tipo\s*[=!]==\s*["']SERVICE["']/);
    }
  });

  it("nenhum item some entre as listas de serviço e produto", () => {
    const src = ler("app/(user)/dashboard/erp/internacoes/[id]/page.tsx");
    // Antes: `i.tipo && i.tipo !== "SERVICE"` — item com tipo em branco não caía em NENHUMA
    // das duas listas e sumia calado das duas. Agora as duas listas saem da MESMA função, o
    // que torna impossível um item ficar fora das duas.
    expect(src).toContain("cat.filter(ehServicoDoCatalogo)");
    expect(src).toContain("cat.filter((i) => !ehServicoDoCatalogo(i))");
  });

  it("o \"Editar o dia\" da internação traz os itens de venda", () => {
    const src = ler("app/(user)/dashboard/erp/internacoes/[id]/page.tsx");
    // A Cintia, com o print aberto nesta tela: "não traz o item"; e depois: "mas não é para
    // ser campo puro. É uma tela de venda, tem que trazer os itens de venda!". O campo de
    // descrição da linha do dia era <input> puro — digitar "trans" não procurava nada. E é
    // JUSTAMENTE aqui que ela edita a comanda.
    expect(src).toContain("pickLinhaDoDia");
    expect(src).not.toMatch(/<input value=\{l\.descricao/);
  });

  it.each([
    "components/vendas/OrcamentoRapidoModal.tsx",
    "app/(user)/dashboard/erp/modelos-orcamento/page.tsx",
    "app/(user)/dashboard/erp/pets/[id]/atendimentos/novo/page.tsx",
  ])("%s não entrega o catálogo ao <datalist> do navegador", (tela) => {
    const src = ler(tela);
    // ~900 <option> jogadas no navegador: quem filtrava era o Chrome, comparando COM acento,
    // e o onBlur limpava o campo quando o texto não batia letra por letra.
    expect(src).not.toMatch(/<datalist[ >]/);
    expect(src).toContain("BuscaItemCatalogo");
  });
});

describe("a lista aparece INTEIRA — dá pra ver antes de escolher", () => {
  it("o seletor abre a lista por portal, presa à tela", () => {
    const src = ler("components/vendas/BuscaItemCatalogo.tsx");
    // A Cintia, com o print do modal aberto: "precisa melhorar a usabilidade, não tem como
    // escolher se não visualizamos. Toda vez que for criar ou mudar alguma coisa tem que
    // lembrar disso." A lista era `absolute` dentro do modal e saía cortada em duas linhas e
    // meia. Item que a busca acha e a pessoa não consegue ver é item não encontrado.
    expect(src).toContain("createPortal");
    expect(src).toContain('position: "fixed"');
    // E quando não cabe embaixo, ela sobe — é o caso do campo perto do rodapé do modal.
    expect(src).toMatch(/bottom: window\.innerHeight/);
  });

  it("nenhuma tela de venda voltou a abrir a lista dentro do próprio modal", () => {
    // `absolute` + `overflow` do modal = lista cortada. Se aparecer de novo numa tela de
    // venda, é a mesma reclamação voltando.
    for (const tela of TELAS_DE_VENDA) {
      expect(ler(tela)).not.toMatch(/className="absolute z-10 left-0 right-0/);
    }
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
