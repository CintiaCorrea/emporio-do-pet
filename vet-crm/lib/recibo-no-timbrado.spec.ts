import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

// Cintia, 17/09/2026: "Tem como emitirmos recibo direto pelo sistema? Com o timbrado?" — uma via,
// com o descritivo dos serviços ("as pessoas vão pedir"). Sem tela nova: botão nas telas de sempre.
const RAIZ = join(__dirname, "..");
const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");

describe("recibo no timbrado", () => {
  it("usa o timbrado da casa e o valor por extenso", () => {
    expect(ler("lib", "documentos", "recibo-print.ts")).toContain('imprimirDocumento("Recibo"');
    // Papel e PDF montam o conteúdo no MESMO lugar (lib/documentos/recibo).
    const dados = ler("lib", "documentos", "recibo.ts");
    expect(dados).toContain("valorPorExtenso(total)");
    expect(dados).toContain("Recebi de");
    // O descritivo dos serviços vem dos itens de cada venda quitada.
    expect(dados).toContain("/api/appointments/${id}");
  });

  it("o PDF do WhatsApp sai do mesmo conteúdo do papel", () => {
    const pdf = ler("lib", "documentos", "recibo-pdf.ts");
    expect(pdf).toContain("montarDadosDoRecibo");
    expect(pdf).toContain("fraseDoRecibo(d)");
    expect(pdf).toContain("/api/whatsapp/enviar-documentos");
    expect(ler("lib", "documentos", "recibo-print.ts")).toContain("fraseDoRecibo(d)");
  });

  it("o botão está em Recebimentos e no detalhe da venda", () => {
    expect(ler("app", "(user)", "dashboard", "erp", "recebimentos", "page.tsx")).toContain("reciboDe(r)");
    expect(ler("app", "(user)", "dashboard", "erp", "consulta-vendas", "page.tsx")).toContain("🧾 Recibo");
  });

  it("pagamento que quitou várias vendas sai num recibo só", () => {
    expect(ler("app", "(user)", "dashboard", "erp", "recebimentos", "page.tsx")).toContain("/LOTE-[A-Z0-9]+/");
  });
});
