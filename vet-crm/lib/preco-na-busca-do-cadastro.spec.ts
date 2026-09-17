import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

// Cintia, 17/09/2026: "ele puxa o item pelo peso, mas não mostra mais o valor do peso como era
// antes e é como tem que ser". A lista de busca mostrava "⚖️ pelo peso" e a pessoa escolhia sem
// saber quanto custa para o animal que está na frente dela.
const RAIZ = join(__dirname, "..");
const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");

describe("a busca do cadastro mostra o preço deste animal", () => {
  it("a peça de busca aceita o preço calculado por quem sabe o peso", () => {
    const src = ler("components", "vendas", "BuscaItemCatalogo.tsx");
    expect(src).toContain("precoDe?: (item: ItemBuscavel) => { texto: string; abaixo?: string | null };");
  });

  it("o carrinho da ficha calcula pelo peso do pet", () => {
    const src = ler("components", "pets", "PetComandaRail.tsx");
    expect(src).toContain("porPeso && pesoPet ? linhaDoItem(c as any, pesoPet) : null");
    expect(src).toContain("faixa {linha._faixaRotulo}");
  });

  it("o ponto de venda também, e só diz 'pelo peso' quando falta o peso", () => {
    const src = ler("app", "(user)", "dashboard", "erp", "ponto-de-venda", "page.tsx");
    expect(src).toContain("const precoDoItemNaBusca");
    expect(src).toContain("if (!pesoPet) return { texto: '⚖️ pelo peso', abaixo: 'registre o peso' };");
  });
});
