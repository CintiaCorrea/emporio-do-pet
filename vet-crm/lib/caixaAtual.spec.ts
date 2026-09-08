import { describe, it, expect } from "vitest";
import { caixaParaReceber, rotuloCaixa } from "@/lib/caixaAtual";

const cx = (id: string, nome: string) => ({ id, numero: 1, abertura: "2026-09-08T09:00:00", operadorId: id + "-u", operadorNome: nome });

describe("o caixa é individual — ninguém lança no caixa de outra pessoa", () => {
  it("com o meu caixa aberto, é nele que se lança", () => {
    const meu = cx("a", "Gabriela");
    expect(caixaParaReceber({ meu, deOutros: [] }).caixa).toBe(meu);
  });

  it("o caixa da outra pessoa NÃO serve, mesmo sendo o único aberto", () => {
    // Era assim até 08/09/2026: conveniente e errado. O dinheiro entrava na gaveta de quem não
    // recebeu, e a diferença aparecia no fechamento — para a pessoa errada.
    const r = caixaParaReceber({ meu: null, deOutros: [cx("b", "Victoria")] });
    expect(r.caixa).toBeNull();
    expect(r.erro).toContain("Victoria");
    expect(r.erro).toContain("abra o seu".replace("a", "a"));
  });

  it("com vários caixas de outras pessoas, também não lança", () => {
    const r = caixaParaReceber({ meu: null, deOutros: [cx("b", "Victoria"), cx("c", "Cintia")] });
    expect(r.caixa).toBeNull();
    expect(r.erro).toContain("Victoria");
  });

  it("sem caixa nenhum, manda abrir o seu", () => {
    const r = caixaParaReceber({ meu: null, deOutros: [] });
    expect(r.caixa).toBeNull();
    expect(r.erro).toContain("Nenhum caixa aberto");
  });

  it("o rótulo mostra de quem é o caixa", () => {
    expect(rotuloCaixa(cx("a", "Gabriela"))).toContain("Gabriela");
  });
});
