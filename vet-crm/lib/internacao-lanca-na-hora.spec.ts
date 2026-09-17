import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

// A tela da internação lança pela porta única do servidor (construção B, 17/09/2026): a venda do
// dia acompanha na hora, sem depender de alguém abrir a ficha.
const src = readFileSync(join(__dirname, "..", "app", "(user)", "dashboard", "erp", "internacoes", "[id]", "page.tsx"), "utf8");

describe("a internação lança pela porta única", () => {
  it("nenhum lançamento da conta escreve na lista genérica", () => {
    expect(src).not.toContain("lista: `intconta_${id}`, valor:");
    expect(src).not.toContain('lista: "intconta_" + id, valor:');
  });

  it("lançar, editar e apagar item vão para /api/hospitalizations/<id>/conta", () => {
    const usos = src.match(/\/api\/hospitalizations\/\$\{id\}\/conta/g) || [];
    expect(usos.length).toBeGreaterThanOrEqual(5);
  });
});
