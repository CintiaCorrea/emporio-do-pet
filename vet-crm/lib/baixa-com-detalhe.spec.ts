import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

// Cintia, 17/09/2026, com os prints do SimplesVet: "Eu vejo o recebimento, mas não consigo ver as
// informações da baixa, dia, forma, parcelamento." Sem tela nova: as telas que já existem mostram.
const RAIZ = join(__dirname, "..");
const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");

describe("a baixa aparece com dia, caixa, forma e parcelamento", () => {
  it("Recebimentos: lista com baixa, caixa e forma com condição; resumo na ordem do SimplesVet", () => {
    const src = ler("app", "(user)", "dashboard", "erp", "recebimentos", "page.tsx");
    expect(src).toContain("<th>Baixa</th>");
    expect(src).toContain("<th>Caixa</th>");
    expect(src).toContain("r.formasRotulo");
    expect(src).toContain("resumo.porFormaCondicao");
    expect(src).toContain("Dia anterior");
    expect(src.indexOf("Usuário que realizou a baixa")).toBeLessThan(src.indexOf("Formas de recebimento"));
  });

  it("Consulta de vendas: o detalhe da venda traz as baixas efetuadas", () => {
    const src = ler("app", "(user)", "dashboard", "erp", "consulta-vendas", "page.tsx");
    expect(src).toContain("<BaixasDaVenda v={v} />");
    expect(src).toContain("/api/caixa/recebimentos?appointmentId=");
  });
});
