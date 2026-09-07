import { describe, it, expect } from "vitest";
import { agruparPorCliente, LinhaVendaRelatorio } from "@/lib/relatorioVendas";

const v = (p: Omit<Partial<LinhaVendaRelatorio>, "valor" | "pago"> & { valor?: unknown; pago?: unknown }) => p as LinhaVendaRelatorio;

describe("agruparPorCliente: a conta do cliente fecha", () => {
  it("junta as vendas do mesmo cliente e soma", () => {
    const r = agruparPorCliente([
      v({ id: "1", tutorId: "t1", tutor: "Ada", valor: 100 }),
      v({ id: "2", tutorId: "t1", tutor: "Ada", valor: 250, pago: 50 }),
    ]);
    expect(r.grupos).toHaveLength(1);
    expect(r.grupos[0].total).toBe(350);
    expect(r.grupos[0].pago).toBe(50);
    expect(r.grupos[0].aReceber).toBe(300);
    expect(r.quantidade).toBe(2);
  });

  it("dois clientes de mesmo nome não viram um só", () => {
    // Homônimo existe (e a cobrança errada também). Quem manda é o id do tutor.
    const r = agruparPorCliente([
      v({ id: "1", tutorId: "t1", tutor: "Maria Silva", valor: 100 }),
      v({ id: "2", tutorId: "t2", tutor: "Maria Silva", valor: 200 }),
    ]);
    expect(r.grupos).toHaveLength(2);
  });

  it("venda sem tutor não some dentro de um cliente qualquer", () => {
    const r = agruparPorCliente([v({ id: "1", valor: 100 }), v({ id: "2", valor: 50 })]);
    expect(r.grupos).toHaveLength(2);
    expect(r.total).toBe(150);
  });

  it("quem deve mais aparece primeiro", () => {
    const r = agruparPorCliente([
      v({ id: "1", tutorId: "a", tutor: "Ana", valor: 100 }),
      v({ id: "2", tutorId: "b", tutor: "Bia", valor: 900 }),
    ]);
    expect(r.grupos.map((g) => g.tutor)).toEqual(["Bia", "Ana"]);
  });

  it("dentro do cliente, a conta mais antiga primeiro", () => {
    const r = agruparPorCliente([
      v({ id: "novo", tutorId: "t1", tutor: "Ada", valor: 10, data: "2026-09-06T10:00:00Z" }),
      v({ id: "velho", tutorId: "t1", tutor: "Ada", valor: 10, data: "2026-08-30T10:00:00Z" }),
    ]);
    expect(r.grupos[0].linhas.map((l) => l.id)).toEqual(["velho", "novo"]);
  });

  it("pago maior que o total não vira crédito no relatório", () => {
    // Troco/pagamento a maior é assunto do caixa. Aqui, a receber nunca fica negativo —
    // senão o total do dia sairia menor do que realmente falta receber.
    const r = agruparPorCliente([v({ id: "1", tutorId: "t1", tutor: "Ada", valor: 100, pago: 150 })]);
    expect(r.aReceber).toBe(0);
    expect(r.pago).toBe(100);
  });

  it("lista vazia dá relatório zerado, não erro", () => {
    expect(agruparPorCliente([])).toMatchObject({ grupos: [], quantidade: 0, total: 0, aReceber: 0 });
    expect(agruparPorCliente(null)).toMatchObject({ quantidade: 0 });
  });

  it("valor e pago sujos (texto, nulo) não contaminam a soma", () => {
    const r = agruparPorCliente([v({ id: "1", tutorId: "t1", tutor: "Ada", valor: "abc", pago: null })]);
    expect(r.total).toBe(0);
    expect(r.aReceber).toBe(0);
  });
});
