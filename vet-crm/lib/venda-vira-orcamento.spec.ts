import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

// Cintia, 17/09/2026: "vendas pode virar orçamento caso seja feita errada, sem necessidade de
// refazer". Vendeu por engano, o cliente desistiu, era só para ver o preço — a venda vira orçamento
// com os mesmos itens. Só enquanto não há dinheiro recebido.
const RAIZ = join(__dirname, "..");
const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");

describe("venda vira orçamento", () => {
  it("o botão aparece no detalhe da venda, e só sem dinheiro recebido", () => {
    const src = ler("app", "(user)", "dashboard", "erp", "consulta-vendas", "page.tsx");
    expect(src).toContain("📄 Virar orçamento");
    expect(src).toContain("{(v.pago ?? 0) <= 0.009 && (");
    expect(src).toContain("/api/orcamentos/da-venda/");
  });

  it("a rota existe", () => {
    expect(ler("app", "api", "orcamentos", "da-venda", "[appointmentId]", "route.ts")).toContain("/orcamentos/da-venda/");
  });
});
