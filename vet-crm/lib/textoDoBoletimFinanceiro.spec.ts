import { describe, it, expect } from "vitest";
import { textoDoBoletimFinanceiro, agruparItens } from "@/lib/textoDoBoletimFinanceiro";

// 🛡️ Cintia, 12/09/2026: "preciso que o boletim vá estruturado e não dessa forma".
const conta = [
  { descricao: "AMOXICILINA LA (AGEMOXI / CLAMOXYL) - ATE 10 KG — aplicação 10:00", quantidade: 1, valorUnitario: 37.57 },
  { descricao: "AMOXICILINA LA (AGEMOXI / CLAMOXYL) - ATE 10 KG — aplicação 10:00", quantidade: 1, valorUnitario: 37.57 },
  { descricao: "AMOXICILINA LA (AGEMOXI / CLAMOXYL) - ATE 10 KG — aplicação 10:00", quantidade: 1, valorUnitario: 37.57 },
  { descricao: "AMOXICILINA LA (AGEMOXI / CLAMOXYL) - ATE 10 KG — aplicação 10:00", quantidade: 1, valorUnitario: 37.57 },
  { descricao: "Diária de internação", quantidade: 1, valorUnitario: 150 },
];

describe("boletim financeiro da internação", () => {
  it("junta as aplicações repetidas numa linha só", () => {
    // O que saía: a MESMA medicação quatro vezes, uma por aplicação.
    const g = agruparItens(conta);
    expect(g).toHaveLength(2);
    const med = g.find((i) => String(i.descricao).startsWith("AMOXICILINA"))!;
    expect(med.quantidade).toBe(4);
    expect(med.valorUnitario).toBe(37.57);
  });

  it("tira o horário do nome — numa conta isso é ruído", () => {
    expect(agruparItens(conta)[0].descricao).not.toContain("aplicação 10:00");
  });

  it("NÃO imprime a linha zerada das diárias", () => {
    // "Diárias (8×): R$ 0,00" saía sempre assim: a diária virou ITEM da conta e o total por
    // fora ficou zerado de propósito, mas ninguém tirou a linha órfã.
    const t = textoDoBoletimFinanceiro({ petNome: "Garoto", dias: 8, itens: conta });
    expect(t).not.toContain("R$ 0,00");
    expect(t).not.toMatch(/Di[áa]rias \(\d+/);
  });

  it("fecha com o total certo — soma das linhas agrupadas", () => {
    const t = textoDoBoletimFinanceiro({ petNome: "Garoto", dias: 8, itens: conta });
    expect(t.replace(/\u00a0/g, " ")).toContain("💵 *Total: R$ 300,28*");   // 4×37,57 + 150
  });

  it("com caução, mostra o abatimento e o saldo", () => {
    const t = textoDoBoletimFinanceiro({ petNome: "Garoto", dias: 8, itens: conta, caucao: 200 }).replace(/\u00a0/g, " ");
    expect(t).toContain("✅ Caução em conta: R$ 200,00");
    expect(t).toContain("🔴 *Saldo estimado: R$ 100,28*");
  });

  it("tem a mesma estrutura dos outros documentos da casa", () => {
    const t = textoDoBoletimFinanceiro({ petNome: "Garoto", tutorNome: "Monick", dias: 8, itens: conta });
    for (const marca of ["🏥 Empório do Pet", "👤 Tutor(a):", "━━━━━━━━━━━━━━━", "— Equipe Empório do Pet"]) {
      expect(t).toContain(marca);
    }
  });

  it("conta vazia não vira mensagem quebrada", () => {
    expect(textoDoBoletimFinanceiro({ petNome: "Garoto", itens: [] })).toContain("Nenhum item lançado");
  });
});
