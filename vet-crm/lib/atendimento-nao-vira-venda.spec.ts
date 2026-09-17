import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

// 🛡️ O ATENDIMENTO É O PRONTUÁRIO, NÃO A VENDA (Cintia, 17/09/2026: "tela de atendimento era
// somente para abrir o atendimento para o veterinário mais rápido, não era para ter ligação com a
// venda"). Editar serviços e valores é na venda — no carrinho ou pela Consulta de vendas.
const src = readFileSync(join(__dirname, "..", "app", "(user)", "dashboard", "erp", "pets", "[id]", "page.tsx"), "utf8");

describe("o atendimento não vira venda", () => {
  it("a edição do atendimento não tem mais caixa de itens", () => {
    expect(src).not.toContain("<EditorDeItens");
    expect(src).not.toContain("setEditItens");
  });

  it("salvar o atendimento não manda itens nem valor", () => {
    const i = src.indexOf("async function salvarEditAtd");
    const trecho = src.slice(i, i + 1200);
    expect(trecho).not.toContain("body.items");
    expect(trecho).not.toContain("body.value");
  });

  it("e a tela diz onde se edita a venda", () => {
    expect(src).toContain("Os serviços e valores se editam <b>na venda</b>");
  });
});
