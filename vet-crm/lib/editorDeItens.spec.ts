import { describe, it, expect } from "vitest";
import { totalDaLinha, totalDasLinhas, linhasParaGravar } from "@/lib/linhasDeVenda";
import { codigoDoProjeto } from "@/lib/testes/varreduraDoProjeto";

const linha = (quantidade: number, valorUnitario: number, desconto = 0) =>
  ({ descricao: "Consulta", quantidade, valorUnitario, desconto });

describe("a conta de uma linha de item", () => {
  it("quantidade × valor, menos o desconto", () => {
    expect(totalDaLinha(linha(2, 150))).toBe(300);
    expect(totalDaLinha(linha(2, 150, 50))).toBe(250);
  });

  it("nunca fica negativa: desconto maior que o item vale zero, não dinheiro ao contrário", () => {
    // Uma linha negativa some do total e ninguém entende por que a conta não fecha.
    expect(totalDaLinha(linha(1, 100, 500))).toBe(0);
  });

  it("sem quantidade, vale 1 — item lançado é item cobrado", () => {
    expect(totalDaLinha({ descricao: "X", quantidade: 0 as any, valorUnitario: 80 })).toBe(80);
  });

  it("valor sujo vale zero em vez de virar NaN", () => {
    expect(totalDaLinha({ descricao: "X", quantidade: 1, valorUnitario: "abc" as any })).toBe(0);
    expect(Number.isNaN(totalDasLinhas([{ descricao: "X", quantidade: 1, valorUnitario: null as any }]))).toBe(false);
  });

  it("o total é a soma das linhas, e lista vazia é zero", () => {
    expect(totalDasLinhas([linha(1, 170), linha(4, 40), linha(1, 224.25)])).toBeCloseTo(554.25, 2);
    expect(totalDasLinhas([])).toBe(0);
    expect(totalDasLinhas(null)).toBe(0);
  });
});

describe("o editor é UM só — a primeira peça do lançamento padrão", () => {
  const fonte = (rel: string) => codigoDoProjeto().find((a) => a.caminho === rel)?.src || "";

  it("a ficha do pet edita os itens do atendimento", () => {
    // "Preciso poder editar a venda na ficha do pet também" (Cintia, 08/09/2026). Antes,
    // corrigir um item lançado errado obrigava a apagar o atendimento inteiro e refazer — e
    // refazer perde a data, o profissional e a observação.
    const src = fonte("app/(user)/dashboard/erp/pets/[id]/page.tsx");
    expect(src).toContain("EditorDeItens");
    expect(src).toContain("body.items");
  });

  it("o total salvo vem da soma das linhas, não digitado à parte", () => {
    // Total digitado à parte é a conta da tela discordando da conta do caixa.
    expect(fonte("app/(user)/dashboard/erp/pets/[id]/page.tsx")).toContain("totalDasLinhas(editItens)");
  });

  it("o item entra pelo núcleo do catálogo, não remontado à mão", () => {
    // `linhaDoItem` é quem sabe o preço de hoje, a identidade do exame e a faixa de peso.
    // Remontar isso na tela foi como as telas de lançamento passaram a divergir.
    const src = fonte("components/vendas/EditorDeItens.tsx");
    expect(src).toContain("linhaDoItem");
    expect(src).toContain("buscarItens");
  });

  it("o dinheiro do editor sai com dois dígitos", () => {
    expect(fonte("components/vendas/EditorDeItens.tsx")).toContain("minimumFractionDigits: 2");
  });
});
