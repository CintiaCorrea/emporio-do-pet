import { describe, it, expect } from "vitest";
import { codigoDoProjeto } from "@/lib/testes/varreduraDoProjeto";

// 🛡️ QUEM LANÇA ITEM LÊ O PESO DO ANIMAL.
//
// A Cintia, 11/09/2026: "o sistema continua não lendo o peso quando vamos lançar na
// venda/orçamento."
//
// São 63 itens cobrados por faixa de peso, e o preço-base de cada um é o da faixa MAIS BARATA.
// Ignorar o peso não dá erro: dá o preço do animal pequeno para todo mundo. Na Cerenia são
// R$ 77,92 no lugar de até R$ 385,99; no Metronidazol, R$ 44,53 no lugar de R$ 121,06.
//
// Duas telas erravam, de jeitos diferentes:
//
//   PetComandaRail        descartava `_precosPorte` ao copiar o catálogo. O núcleo recebia o
//                         item como se fosse de preço único e nem chegava a perguntar o peso.
//                         Falha calada — nenhum aviso.
//   OrcamentoRapidoModal  pegava `valorPadrao` direto do catálogo, sem passar pelo núcleo.
//
// As duas voltas atrás são de uma linha e nenhuma quebra o build. Por isso a trava lê o fonte.

const TELAS_QUE_LANCAM = [
  "components/pets/PetComandaRail.tsx",
  "components/vendas/OrcamentoRapidoModal.tsx",
  "components/vendas/EditorDeItens.tsx",
];

describe("as telas de lançamento consultam o peso", () => {
  const arquivos = codigoDoProjeto();
  const fonte = (caminho: string) => {
    const a = arquivos.find((f) => f.caminho === caminho);
    expect(a, `arquivo não encontrado: ${caminho}`).toBeTruthy();
    return a!.src;
  };

  it.each(TELAS_QUE_LANCAM)("%s chama o núcleo passando um peso", (caminho) => {
    const src = fonte(caminho);
    // `linhaDoItem(item)` com UM argumento é exatamente o defeito: o núcleo assume "sem peso".
    const chamadas = [...src.matchAll(/linhaDoItem\(/g)];
    expect(chamadas.length, "a tela deixou de usar o núcleo de preço").toBeGreaterThan(0);
    expect(src).toMatch(/pesoKg|pesoPet/);
  });

  it("a comanda do cliente não descarta as faixas ao copiar o catálogo", () => {
    // O bug era o `.map` que remontava os itens sem `_precosPorte`.
    expect(fonte("components/pets/PetComandaRail.tsx")).toContain("_precosPorte");
  });

  it("o orçamento rápido não pega o preço-base direto do catálogo", () => {
    const src = fonte("components/vendas/OrcamentoRapidoModal.tsx");
    expect(src).not.toMatch(/onPick=\{\(c: any\) => setItem\(i, \{ descricao: c\.nome, valor: c\.valorPadrao/);
    expect(src).toContain("linhaDoItem(c, pesoKg)");
  });

  it("a troca de faixa é do núcleo, não copiada em cada tela", () => {
    for (const caminho of ["components/pets/PetComandaRail.tsx", "components/vendas/OrcamentoRapidoModal.tsx"]) {
      expect(fonte(caminho), caminho).toContain("aplicarFaixa");
    }
  });

  it("o seletor de faixa é um componente só", () => {
    const comp = arquivos.find((f) => f.caminho === "components/vendas/FaixaDePesoDaLinha.tsx");
    expect(comp, "FaixaDePesoDaLinha sumiu").toBeTruthy();
    for (const caminho of ["components/pets/PetComandaRail.tsx", "components/vendas/OrcamentoRapidoModal.tsx"]) {
      expect(fonte(caminho), caminho).toContain("FaixaDePesoDaLinha");
    }
  });
}, 30000);
