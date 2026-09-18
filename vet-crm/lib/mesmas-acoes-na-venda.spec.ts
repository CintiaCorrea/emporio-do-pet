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
  it("imprimir o comprovante", () => {
    expect(consulta).toContain("imprimirVenda");
    expect(pdv).toContain("🖨️ Imprimir");
    expect(pdv).toContain("imprimirVenda(detVenda)");
  });

  it("enviar a venda em PDF no WhatsApp", () => {
    expect(consulta).toContain("enviarVendaNoWhats");
    expect(pdv).toContain("enviarVendaNoWhats");
    expect(pdv).toContain("💬 Enviar");
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
    for (const rotulo of ["↩️ Devolver", "🗑 Excluir", "🧾 Recibo", "💬 Recibo no WhatsApp", "💰 Receber"]) {
      expect(pdv).toContain(rotulo);
    }
  });
});
