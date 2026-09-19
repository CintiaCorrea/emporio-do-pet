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
    // O TÍTULO DOS DOIS PRIMEIROS PASSOU A DEPENDER DA VENDA (19/09/2026): antes de pagar sai o
    // relatório da compra; depois de pago, o recibo. Quem escolhe é papelDaVenda, não a recepção.
    expect(src).toContain("papelDaVenda(v, 'imprimir')");
    expect(src).toContain("papelDaVenda(v, 'whats')");
    expect(src).toContain("'Imprimir o recibo do pagamento' : 'Imprimir o relatório da compra'");
    // Desde 17/09/2026 o editar abre o CARRINHO da ficha (um editor só para venda e orçamento).
    expect(src).toContain('aria-label="Editar a venda"');
    expect(src).toContain("?carrinho=venda&editarVenda=");
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
