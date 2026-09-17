import { describe, it, expect } from "vitest";
import { codigoDoProjeto } from "@/lib/testes/varreduraDoProjeto";

// 🛡️ QUEM LANÇA ITEM LÊ O PESO DO ANIMAL — E NÃO LANÇA SEM ELE.
//
// A Cintia, 11/09/2026: "o sistema continua não lendo o peso quando vamos lançar na
// venda/orçamento." E em 16/09/2026: "sem preço à mão, peso tem que estar registrado" e "trazer
// automaticamente, conforme o peso lançado no sistema, a faixa EXATA do produto/serviço".
//
// O preço-base de um item cobrado por faixa é o da faixa MAIS BARATA. Ignorar o peso não dá erro:
// dá o preço do animal pequeno para todo mundo. Na Cerenia são R$ 77,92 no lugar de até R$ 385,99.
//
// A porta única é lib/catalogoVendavel.lancarDoCadastro: sem peso, item com faixa não entra; faixa
// sem preço não entra. A troca de faixa na mão (aplicarFaixa, FaixaDePesoDaLinha) saiu; o peso é
// registrado na própria venda (components/vendas/PesoDaVenda).

const TELAS_QUE_LANCAM = [
  "app/(user)/dashboard/erp/ponto-de-venda/page.tsx",
  "components/pets/PetComandaRail.tsx",
];

describe("as telas de lançamento passam pela porta única, com o peso", () => {
  const arquivos = codigoDoProjeto();
  const fonte = (caminho: string) => {
    const a = arquivos.find((f) => f.caminho === caminho);
    expect(a, `arquivo não encontrado: ${caminho}`).toBeTruthy();
    return a!.src;
  };

  it.each(TELAS_QUE_LANCAM)("%s lança pelo lancarDoCadastro passando um peso", (caminho) => {
    expect(fonte(caminho)).toMatch(/lancarDoCadastro\([^,]+, (pesoPet|pesoKg)/);
  });

  it.each(TELAS_QUE_LANCAM)("%s não troca faixa na mão", (caminho) => {
    const src = fonte(caminho);
    expect(src).not.toContain("aplicarFaixa");
    expect(src).not.toContain("FaixaDePesoDaLinha");
  });

  it("o seletor de faixa na mão não existe mais", () => {
    expect(arquivos.find((f) => f.caminho === "components/vendas/FaixaDePesoDaLinha.tsx")).toBeFalsy();
  });

  it("o carrinho da ficha e o ponto de venda registram o peso ali mesmo", () => {
    for (const caminho of ["app/(user)/dashboard/erp/ponto-de-venda/page.tsx", "components/pets/PetComandaRail.tsx"]) {
      expect(fonte(caminho), caminho).toContain("<PesoDaVenda");
      expect(fonte(caminho), caminho).toContain("aplicarPeso(");
    }
  });

  it("o carrinho da ficha usa o catálogo inteiro, com as faixas", () => {
    // O bug de 11/09 era uma cópia reduzida do catálogo que descartava `_precosPorte`.
    expect(fonte("components/pets/PetComandaRail.tsx")).toContain("carregarCatalogoVendavel().then(setCat)");
  });

  // O DEFEITO DO ARTROSAN (11/09/2026): o núcleo escolhia a faixa e o ponto de venda jogava fora ao
  // montar a linha do carrinho. As faixas continuam viajando na linha — é por elas que o preço é
  // refeito quando o peso é registrado.
  it("o ponto de venda guarda as faixas na linha do carrinho", () => {
    const src = fonte("app/(user)/dashboard/erp/ponto-de-venda/page.tsx");
    const base = src.slice(src.indexOf("const base = {"), src.indexOf("const base = {") + 400);
    expect(base).toContain("_faixas: l._faixas");
    expect(base).toContain("_faixaRotulo: l._faixaRotulo");
    expect(base).toContain("_avisoPorte: l._avisoPorte");
  });
});
