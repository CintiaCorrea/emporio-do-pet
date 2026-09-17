import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

// Cintia, 17/09/2026: corte da cobrança em 31/08 23:59 e os R$ 150 do registro de internação da
// Vanessa fora do "a receber". A regra mora no servidor (common/cobranca.regras); as telas só
// mostram o selo e não oferecem receber o que é histórico.
const RAIZ = join(__dirname, "..");
const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");

describe("cobrança pela regra única nas telas", () => {
  it("Consulta de vendas: selo Histórico e sem Receber", () => {
    const src = ler("app", "(user)", "dashboard", "erp", "consulta-vendas", "page.tsx");
    expect(src).toContain("label: 'Histórico'");
    expect(src).toContain("(v.aberto ?? 0) > 0.009 && !v.historico");
  });
  it("resumo de vendas não soma histórico no a receber", () => {
    expect(ler("lib", "resumoDeVendas.ts")).toContain("aberto: v.historico ? 0 :");
  });
  it("ponto de venda não lista agosto como conta do dia", () => {
    expect(ler("app", "(user)", "dashboard", "erp", "ponto-de-venda", "page.tsx")).toContain("!v.futura && !v.historico");
  });
  it("ficha do cliente e do pet usam o aberto do servidor", () => {
    expect(ler("app", "(user)", "dashboard", "erp", "tutores", "[id]", "page.tsx")).toContain("a.aberto != null ? Number(a.aberto)");
    expect(ler("components", "profile", "PetProfilePanel.tsx")).toContain("stats.valorAReceber ??");
  });
});
