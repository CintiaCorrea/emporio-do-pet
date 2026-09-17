import { describe, it, expect } from "vitest";
import { lancarDoCadastro } from "@/lib/catalogoVendavel";
import { readFileSync } from "fs";
import { join } from "path";

// Cintia, 17/09/2026, com o print da nova venda: a caução de R$ 600 não salvava porque a tela
// pedia o peso do animal. Caução é o valor que o cliente deixa — não tem preço de cadastro.
const CAUCAO: any = {
  id: "cat-caucao", itemNome: "Caução", preco: 0, _ehCaucao: true,
  precosPorte: [{ de: 0, ate: 10, preco: 600 }],
};

describe("caução não pede peso", () => {
  it("entra no carrinho mesmo sem peso do pet", () => {
    const r = lancarDoCadastro(CAUCAO, null, "Reginaldo");
    expect(r.ok).toBe(true);
    expect((r as any).linha._ehCaucao).toBe(true);
  });

  it("a tela leva a marca de caução para a linha e não trava o salvar", () => {
    const src = readFileSync(join(__dirname, "..", "app", "(user)", "dashboard", "erp", "ponto-de-venda", "page.tsx"), "utf8");
    expect(src).toContain("_ehCaucao: l._ehCaucao");
    expect(src).toContain("it._avisoPorte && !it._ehCaucao");
  });
});
