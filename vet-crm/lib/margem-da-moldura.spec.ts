// A MARGEM DA BORDA DA TELA VEM DA MOLDURA (19/09/2026 — Bloco 2 da padronização).
//
// Cintia, 18/09: "as margens poderiam SEMPRE ser obedecidas e ser as mesmas". Eram 60 telas
// escrevendo a própria (p-6 em 41, p-4 em 19, e p-8, p-10, p-12, px-3, py-20 na cauda) e 75
// sem margem nenhuma, com o conteúdo encostado na borda. Trocando de tela, o conteúdo pulava.
//
// A causa não era desleixo: a moldura não dava margem, então cada tela inventava a sua.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.join(process.cwd(), "styles/globals.css"), "utf8");
const moldura = fs.readFileSync(path.join(process.cwd(), "app/(user)/dashboard/layout.tsx"), "utf8");

describe("quem dá a margem é a moldura", () => {
  it("a regra existe, e usa a medida com nome", () => {
    expect(css).toContain('.dash-main:not([data-margem="da-tela"]) > *');
    expect(css).toContain("padding: var(--emp-margem-celular)");
    expect(css).toContain("padding: var(--emp-margem)");
  });

  it("são 24px no computador e 16px no celular", () => {
    expect(css).toContain("--emp-margem: 24px");
    expect(css).toContain("--emp-margem-celular: 16px");
    expect(css).toMatch(/@media \(min-width: 768px\) \{\s*\.dash-main:not\(\[data-margem="da-tela"\]\) > \* \{/);
  });

  it("a margem é do elemento DA TELA, não do <main>", () => {
    // Se fosse do <main>, as 31 telas que pintam o próprio fundo (bege, branco, gradiente)
    // ficariam com o fundo encolhido e uma tarja em volta. Dando ao filho, o fundo continua
    // de ponta a ponta e só o conteúdo entra.
    expect(css).not.toMatch(/\.dash-main \{[^}]*padding:/);
  });
});

describe("a exceção das telas com dono", () => {
  // Enquanto a reforma das vendas não terminar, estas quatro telas são da aba das vendas.
  // A moldura não encosta nelas: ficam exatamente como estão hoje.
  const DONAS = [
    "/dashboard/erp/ponto-de-venda",
    "/dashboard/erp/caixa",
    "/dashboard/erp/consulta-vendas",
    "/dashboard/erp/configuracoes-vendas",
  ];

  it("são exatamente as quatro telas da reforma, e nenhuma outra", () => {
    const lista = moldura.match(/const TELAS_DA_REFORMA_DE_VENDAS = \[([^\]]*)\]/);
    expect(lista).not.toBeNull();
    const rotas = (lista![1].match(/'([^']+)'/g) || []).map((r) => r.replace(/'/g, ""));
    expect(rotas.sort()).toEqual([...DONAS].sort());
  });

  it("a moldura marca essas telas para não receber a margem", () => {
    expect(moldura).toContain("data-margem={daPropriaMargem ? 'da-tela' : undefined}");
  });

  it("está escrito no código o dia em que a exceção morre", () => {
    // Exceção em moldura sobrevive ao motivo dela se ninguém escrever quando tirar.
    expect(moldura).toContain("QUANDO A REFORMA DAS VENDAS TERMINAR: apagar esta lista inteira");
  });
});
