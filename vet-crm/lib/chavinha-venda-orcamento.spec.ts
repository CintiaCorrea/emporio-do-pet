// A CHAVINHA (18/09/2026). Cintia: "transformar venda em orçamento e vice versa tem que ser
// simples para quem está no atendimento e hoje não está sendo."
// Antes, virar venda só existia no carrinho da ficha do pet: da lista era ✏️ → ficha → aba →
// transformar, três telas. Este teste guarda o botão nos TRÊS lugares onde a recepção trabalha.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ler = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
const PORTA = "/converter";

describe("orçamento vira venda onde a recepção está", () => {
  it("na lista de orçamentos, dentro da Consulta de vendas", () => {
    const s = ler("components/vendas/ListaDeOrcamentos.tsx");
    expect(s).toContain("💰 Virar venda");
    expect(s).toContain(PORTA);
  });

  it("no detalhe do orçamento, dentro do Ponto de venda", () => {
    const s = ler("app/(user)/dashboard/erp/ponto-de-venda/page.tsx");
    expect(s).toContain("💰 Virar venda");
    expect(s).toContain(PORTA);
    // e não manda mais a pessoa para a ficha do pet só para converter
    expect(s).not.toContain("Abrir para transformar em venda");
  });

  it("no carrinho da ficha do pet, com o mesmo nome", () => {
    const s = ler("components/pets/PetComandaRail.tsx");
    expect(s).toContain("Virar venda");
    expect(s).toContain(PORTA);
  });
});

describe("venda vira orçamento", () => {
  it("continua na linha da venda, na Consulta de vendas", () => {
    const s = ler("app/(user)/dashboard/erp/consulta-vendas/page.tsx");
    expect(s).toContain("📄 Virar orçamento");
    expect(s).toContain("/api/orcamentos/da-venda/");
  });
});

describe("o mesmo aviso nos três lugares", () => {
  const frase = "Vira uma venda concluída, com os mesmos itens. O orçamento sai da lista.";
  for (const arq of [
    "components/vendas/ListaDeOrcamentos.tsx",
    "app/(user)/dashboard/erp/ponto-de-venda/page.tsx",
    "components/pets/PetComandaRail.tsx",
  ]) {
    it(arq, () => expect(ler(arq)).toContain(frase));
  }
});
