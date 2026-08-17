import { describe, it, expect } from "vitest";
import { linhaDoItem, itemParaVenda, nomeSemMarcador } from "@/lib/catalogoVendavel";
import { podeAvisarLab, ehFaseConcluida } from "@/lib/exameFases";

// BLINDAGEM do front. Trava dois riscos que já morderam:
// 1) o exame perder o custo/fornecedor no caminho da venda → sem "a-pagar ao laboratório";
// 2) o botão/lote de aviso ao lab depender de nome de fase inexistente ("coleta").
// Se alguém mexer nos núcleos e derrubar esses campos/regra, o teste FALHA.

const EXAME = { id: "ex1", nome: "🔬 Hemograma", valorPadrao: 80, custoPadrao: 30, _exame: true, _fornecedorId: "veter", _fornecedorNome: "Veter" };
const PRODUTO = { id: "p1", nome: "Ração Premium", valorPadrao: 50, custoPadrao: 20 };

describe("catalogoVendavel — núcleo do item", () => {
  it("nomeSemMarcador tira o 🔬", () => {
    expect(nomeSemMarcador("🔬 Urina")).toBe("Urina");
    expect(nomeSemMarcador("Ração")).toBe("Ração");
  });

  it("linhaDoItem(EXAME) carrega custo + fornecedor + identidade e tira o 🔬", () => {
    const l = linhaDoItem(EXAME as any);
    expect(l.descricao).toBe("Hemograma");
    expect(l.valorUnitario).toBe(80);
    expect(l.custoUnitario).toBe(30);          // ← custo do lab (alimenta o a-pagar)
    expect(l._exame).toBe(true);
    expect(l.catalogoExameId).toBe("ex1");
    expect(l.fornecedorId).toBe("veter");
    expect(l.servicoId).toBeUndefined();       // exame não é serviço
  });

  it("linhaDoItem(PRODUTO) vira serviço/produto (sem identidade de exame)", () => {
    const l = linhaDoItem(PRODUTO as any);
    expect(l.servicoId).toBe("p1");
    expect(l.productId).toBe("p1");
    expect(l.custoUnitario).toBe(20);
    expect(l._exame).toBeFalsy();
  });

  it("itemParaVenda(EXAME) manda tipoItem+catalogoExameId+fornecedorId+custo pro servidor", () => {
    const p = itemParaVenda(linhaDoItem(EXAME as any));
    expect(p.tipoItem).toBe("EXAME");
    expect(p.catalogoExameId).toBe("ex1");
    expect(p.fornecedorId).toBe("veter");
    expect(p.custoUnitario).toBe(30);
    expect(p.servicoId).toBeUndefined();
  });

  it("itemParaVenda(PRODUTO) manda servicoId/productId+custo", () => {
    const p = itemParaVenda(linhaDoItem(PRODUTO as any));
    expect(p.servicoId).toBe("p1");
    expect(p.productId).toBe("p1");
    expect(p.custoUnitario).toBe(20);
    expect(p.tipoItem).toBeUndefined();
  });
});

describe("exameFases — regra de avisar o laboratório", () => {
  it("elegível: tem lab + não avisado + não concluído", () => {
    expect(podeAvisarLab({ status: "Solicitar", fornecedorId: "veter", labAvisadoAt: null })).toBe(true);
  });
  it("NÃO depende da palavra 'coleta' (causa-raiz)", () => {
    // A fase real é "Solicitar" — a regra tem que valer nela.
    expect(podeAvisarLab({ status: "Solicitar", fornecedorId: "veter", labAvisadoAt: null })).toBe(true);
  });
  it("NÃO elegível sem lab / já avisado / concluído", () => {
    expect(podeAvisarLab({ status: "Solicitar", fornecedorId: null, labAvisadoAt: null })).toBe(false);
    expect(podeAvisarLab({ status: "Solicitar", fornecedorId: "veter", labAvisadoAt: "2026-08-11" })).toBe(false);
    expect(podeAvisarLab({ status: "Entregue", fornecedorId: "veter", labAvisadoAt: null })).toBe(false);
  });
  it("ehFaseConcluida reconhece as fases finais", () => {
    expect(ehFaseConcluida("Entregue")).toBe(true);
    expect(ehFaseConcluida("Solicitar")).toBe(false);
  });
});
