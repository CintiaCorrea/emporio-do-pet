import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

// Cintia, 17/09/2026: "As vendas não podem ser editadas, excluídas, enviadas como documento…
// não poderíamos ter aqui as mesmas possibilidades que em recibo? Só que com os nomes corretos,
// venda/orçamento." As ações saíram de dentro da linha aberta para a própria linha.
const RAIZ = join(__dirname, "..");
const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");

describe("ações na linha da venda", () => {
  const src = ler("app", "(user)", "dashboard", "erp", "consulta-vendas", "page.tsx");

  it("imprimir, enviar, editar e excluir ficam na linha", () => {
    expect(src).toContain('title="Imprimir a venda (comprovante no timbrado)"');
    expect(src).toContain('title="Enviar a venda em PDF no WhatsApp do cliente"');
    expect(src).toContain('title="Editar a venda no Ponto de venda"');
    expect(src).toContain('title="Excluir a venda"');
  });

  it("editar continua só do administrativo, e excluir passa pela regra única", () => {
    expect(src).toContain("Só o administrativo edita venda");
    expect(src).toContain("onExcluir(v)");
  });

  it("o PDF da venda sai no mesmo timbrado do recibo", () => {
    const pdf = ler("lib", "documentos", "venda-pdf.ts");
    expect(pdf).toContain("novoPdfDaCasa");
    expect(pdf).toContain("Segue o relatório da sua compra");
    expect(ler("lib", "documentos", "recibo-pdf.ts")).toContain("novoPdfDaCasa");
  });
});
