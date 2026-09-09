import { describe, it, expect } from "vitest";
import { textoDoRelatorioVendas } from "@/lib/textoDoRelatorioVendas";
import { textoDoOrcamento } from "@/lib/textoDoOrcamento";

const vendas = [
  { numero: 1129, data: "2026-09-03T15:00:00", pet: "Reginaldo", valor: 450.33, pago: 0,
    itens: [{ descricao: "CONSULTA - DRA VIVIAN", quantidade: 1, valorUnitario: 170 }] },
  { numero: 1149, data: "2026-09-05T17:37:00", pet: "Reginaldo", valor: 600, pago: 600,
    itens: [{ descricao: "Caução", quantidade: 1, valorUnitario: 600 }] },
  { numero: 1158, data: "2026-09-05T15:00:00", pet: "Reginaldo", valor: 863.32, pago: 200,
    itens: [{ descricao: "Diária de internação", quantidade: 2, valorUnitario: 150 }] },
];

describe("extrato de vendas no WhatsApp", () => {
  it("tem a MESMA estrutura do orçamento — o cliente vê uma casa só", () => {
    // A Cintia, 09/09/2026: "a conta aparece estruturada como quando enviamos o orçamento?"
    const extrato = textoDoRelatorioVendas({ cliente: "Vanessa Bezerra", petNome: "Reginaldo", vendas });
    const orcamento = textoDoOrcamento({ petNome: "Reginaldo", tutorNome: "Vanessa Bezerra", itens: [{ descricao: "Consulta", quantidade: 1, valorUnitario: 170 }] });
    for (const marca of ["🏥 Empório do Pet", "👤 Tutor(a):", "━━━━━━━━━━━━━━━", "💵 *Total:", "— Equipe Empório do Pet"]) {
      expect(orcamento).toContain(marca);
      expect(extrato).toContain(marca);
    }
  });

  it("usa a MESMA linha de item do orçamento, inclusive o 2×", () => {
    // O espaço de "R$ 300,00" vem do toLocaleString e é NÃO-QUEBRÁVEL (U+00A0). Comparar com
    // espaço normal reprova um texto que está certo — por isso normalizamos antes.
    const norm = (x: string) => x.replace(/ /g, " ");
    const t = norm(textoDoRelatorioVendas({ cliente: "Vanessa Bezerra", vendas }));
    expect(t).toContain("• 2× Diária de internação — *R$ 300,00*");
    expect(t).toContain("• CONSULTA - DRA VIVIAN — *R$ 170,00*");   // quantidade 1 não vira "1×"
  });

  it("diz a situação de cada venda: paga, parcial e em aberto", () => {
    const t = textoDoRelatorioVendas({ cliente: "Vanessa Bezerra", vendas });
    expect(t).toContain("✅ paga");
    expect(t).toContain("🟠 parcial");
    expect(t).toContain("🔴 em aberto");
  });

  it("fecha com total, recebido e saldo devedor", () => {
    const t = textoDoRelatorioVendas({ cliente: "Vanessa Bezerra", vendas });
    expect(t).toContain("💵 *Total:");
    expect(t).toContain("✅ Já recebido:");
    expect(t).toContain("🔴 *Saldo devedor:");
  });

  it("no modo cobrança, a venda já paga fica de fora", () => {
    const t = textoDoRelatorioVendas({ cliente: "Vanessa Bezerra", vendas, apenasEmAberto: true });
    expect(t).toContain("Contas em aberto");
    expect(t).not.toContain("Caução");   // paga por inteiro
    expect(t).toContain("Diária de internação");
  });

  it("manda só o que foi escolhido — não o histórico todo", () => {
    // "Posso selecionar o que quero enviar ou vai sempre o histórico todo?" (Cintia, 09/09).
    const t = textoDoRelatorioVendas({ cliente: "Vanessa Bezerra", vendas: [vendas[0]] });
    expect(t).toContain("CONSULTA - DRA VIVIAN");
    expect(t).not.toContain("Caução");
    expect(t).not.toContain("Diária de internação");
  });

  it("cliente sem dívida recebe uma frase, não uma lista vazia", () => {
    const t = textoDoRelatorioVendas({ cliente: "Fulano", vendas: [], apenasEmAberto: true });
    expect(t).toContain("Não há contas em aberto");
  });
});
