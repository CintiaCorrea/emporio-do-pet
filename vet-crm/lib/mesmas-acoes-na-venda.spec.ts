// AS MESMAS AÇÕES, EM TODA PORTA QUE ABRE UMA VENDA (18/09/2026).
// Cintia: "podemos ter nessa tela, além das opções que já temos, as opções que temos na tela de
// vendas para facilitar para a equipe?" — a gaveta do Ponto de venda tinha devolver, excluir,
// recibo e receber; faltavam imprimir, enviar no WhatsApp e virar orçamento, e a recepção tinha
// que abrir a Consulta de vendas com o cliente esperando.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ler = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
const pdv = ler("app/(user)/dashboard/erp/ponto-de-venda/page.tsx");
const consulta = ler("app/(user)/dashboard/erp/consulta-vendas/page.tsx");

describe("a gaveta da venda no Ponto de venda oferece o mesmo que a Consulta de vendas", () => {
  it("imprimir — e o papel muda com a venda", () => {
    expect(pdv).toContain("🖨️ Imprimir {Number(detVenda.pago || 0) > 0.009 ? 'recibo' : 'venda'}");
    expect(pdv).toContain("imprimirVenda(detVenda)");
    expect(pdv).toContain("reciboDaVenda(detVenda, 'imprimir')");
  });

  it("enviar no WhatsApp — o mesmo papel", () => {
    expect(pdv).toContain("enviarVendaNoWhats");
    expect(pdv).toContain("reciboDaVenda(detVenda, 'whats')");
    expect(pdv).toContain("💬 Enviar ${Number(detVenda.pago || 0) > 0.009 ? 'recibo' : 'venda'}");
  });

  // UM PAPEL POR VEZ (Cintia, 19/09/2026: "qual a diferença recibo, recibo no whatsapp e
  // enviar?"). Eram quatro botões de documento na mesma gaveta; a escolha sobrava para a
  // recepção. A regra dela, de 17/09: antes de pagar sai o relatório da compra; depois de
  // pago, o recibo.
  it("não existem quatro botões de papel", () => {
    expect(pdv).not.toContain("💬 Recibo no WhatsApp");
    expect(pdv).not.toContain(">🧾 Recibo<");
  });

  it("a Consulta de vendas segue a mesma regra", () => {
    expect(consulta).toContain("async function papelDaVenda");
    expect(consulta).toContain("const jaPago = (v: any) => Number(v?.pago || 0) > 0.009;");
    expect(consulta).toContain("papelDaVenda(v, 'imprimir')");
    expect(consulta).toContain("papelDaVenda(v, 'whats')");
  });

  it("virar orçamento, quando nada foi recebido", () => {
    for (const arq of [pdv, consulta]) {
      expect(arq).toContain("📄 Virar orçamento");
      expect(arq).toContain("/api/orcamentos/da-venda/");
    }
    // a trava: só aparece com pagamento zerado
    expect(pdv).toContain("Number(detVenda.pago || 0) <= 0.009");
  });

  it("e continua com o que já tinha: devolver, excluir, recibo e receber", () => {
    for (const rotulo of ["↩️ Devolver", "🗑 Excluir", "💰 Receber"]) {
      expect(pdv).toContain(rotulo);
    }
  });
});
