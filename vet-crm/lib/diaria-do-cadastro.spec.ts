import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

// B5 (Cintia, 16/09/2026): "diária e itens só do cadastro, diária por faixa de peso". O valor da
// diária deixou de ser digitado: sai do item do cadastro e do peso do animal, como no ponto de venda.
const RAIZ = join(__dirname, "..");
const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");

describe("a diária vem do cadastro", () => {
  it("a tela de internar não tem campo de valor digitado", () => {
    const src = ler("app", "(user)", "dashboard", "erp", "internacoes", "page.tsx");
    expect(src).not.toContain('setForm({ ...form, dailyRate: e.target.value })');
    expect(src).toContain("Preço do cadastro, pela faixa de peso do animal");
  });

  it("acertar a diária manda o item do cadastro, não o número", () => {
    const src = ler("app", "(user)", "dashboard", "erp", "internacoes", "[id]", "page.tsx");
    expect(src).toContain("{ diariaCatalogoItemId: catalogoItemId }");
    expect(src).toContain("definirDiaria(diariaSugerida.valor, diariaSugerida.catalogoItemId)");
  });
});
