import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

// O GUIA DE VENDAS DO ACADEMY conta o sistema como ele é hoje (Cintia, 17/09/2026). Este teste
// falha se o guia voltar a falar de coisas que saíram — é o jeito de o material não envelhecer calado.
const guia = readFileSync(join(__dirname, "..", "public", "academia", "guia-vendas.html"), "utf8");

describe("o guia de vendas do Academy está atualizado", () => {
  it("fala das quatro portas e do carrinho", () => {
    expect(guia).toContain("Carrinho da ficha do pet");
    expect(guia).toContain("Transformar orçamento em venda");
    expect(guia).toContain("Virar orçamento");
  });

  it("explica receber, crédito e devolução", () => {
    expect(guia).toContain("crédito do cliente");
    expect(guia).toContain("Devolver crédito");
    expect(guia).toContain("AUT");
  });

  it("não fala mais do que saiu do sistema", () => {
    expect(guia).not.toContain("Gerar comanda do dia</b>");
    expect(guia).not.toContain("Vendas em aberto");
    expect(guia).not.toContain("Recebimentos sem forma");
  });
});
