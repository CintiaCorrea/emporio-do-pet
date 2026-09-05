import { describe, it, expect } from "vitest";
import { labDoItem, linhaDoItem, itemParaVenda, nomeSemMarcador, ehVeter } from "@/lib/catalogoVendavel";

// BLINDAGEM do caminho do CATÁLOGO NOVO (_novo): vende por descrição+valor+custo, guarda catalogoItemId.
// EXAME novo: manda tipoItem:"EXAME" + catalogoItemId (entra no Kanban pela FONTE NOVA cat_item_exame),
// mas NUNCA catalogoExameId (a base antiga exa_catalogo). Item novo comum (não-exame) vai sem tipoItem.
describe("catalogoVendavel — catálogo NOVO (_novo)", () => {
  it("linhaDoItem: item novo vira linha por descrição+valor+custo + catalogoItemId (sem servicoId/productId)", () => {
    const l = linhaDoItem({ id: "cat1", nome: "Consulta", valorPadrao: 120, custoPadrao: 30, tipo: "SERVICO", _novo: true });
    expect(l).toMatchObject({ descricao: "Consulta", valorUnitario: 120, custoUnitario: 30, _novo: true, catalogoItemId: "cat1" });
    expect((l as any).servicoId).toBeUndefined();
    expect((l as any).productId).toBeUndefined();
    expect(itemParaVenda(l).tipoItem).toBeUndefined(); // item novo NÃO-exame não manda tipoItem
  });
  it("itemParaVenda: EXAME novo manda tipoItem EXAME + catalogoItemId (fonte nova), nunca catalogoExameId (base antiga)", () => {
    const l = linhaDoItem({ id: "cat2", nome: "Hemograma", valorPadrao: 80, tipo: "EXAME", _novo: true, _exame: true, _fornecedorNome: "Veter" });
    const body = itemParaVenda(l);
    expect(body.tipoItem).toBe("EXAME");         // entra no fluxo de exame (Kanban) pela fonte nova
    expect(body.catalogoExameId).toBeUndefined(); // NÃO usa a base antiga exa_catalogo
    expect(body.catalogoItemId).toBe("cat2");    // guarda o id novo (backend resolve o lab por cat_item_exame)
    expect(body.descricao).toBe("Hemograma");
    expect(body.valorUnitario).toBe(80);
  });
  it("exame do catálogo novo ainda mostra o selo do lab (labDoItem via _exame+fornecedor)", () => {
    const lab = labDoItem({ _exame: true, _fornecedorNome: "Veter" });
    expect(lab).toEqual({ nome: "Veter", veter: true });
  });
  it("EXAME novo: a linha carrega fornecedorId (gera o a-pagar do lab) + custo do lab — Fatia 5", () => {
    const l = linhaDoItem({ id: "cat3", nome: "Hemograma", valorPadrao: 80, custoPadrao: 35, tipo: "EXAME", _novo: true, _fornecedorId: "labVeter", _fornecedorNome: "Veter" });
    expect(l.fornecedorId).toBe("labVeter");
    expect(l.custoUnitario).toBe(35);
    const body = itemParaVenda(l);
    expect(body.fornecedorId).toBe("labVeter"); // o motor de a-pagar do lab lê AppointmentItem.fornecedorId
    expect(body.custoUnitario).toBe(35);
    expect(body.catalogoItemId).toBe("cat3");
    expect(body.tipoItem).toBe("EXAME"); // exame novo entra no fluxo pela fonte nova (cat_item_exame)
  });
  it("labDoItem: exame novo (tipo EXAME) mostra o lab mesmo sem _exame; produto não mostra", () => {
    expect(labDoItem({ tipo: "EXAME", _fornecedorNome: "Veter" })).toEqual({ nome: "Veter", veter: true });
    expect(labDoItem({ tipo: "PRODUTO", _fornecedorNome: "Fornecedor X" })).toBeNull();
  });
});

describe("catalogoVendavel — ehVeter (lab padrão)", () => {
  it("reconhece Veter em qualquer forma; nega os outros/ vazio", () => {
    expect(ehVeter("Veter")).toBe(true);
    expect(ehVeter("laboratório VETER diagnóstico")).toBe(true);
    expect(ehVeter("Alvaro")).toBe(false);
    expect(ehVeter("")).toBe(false);
    expect(ehVeter(null)).toBe(false);
  });
});

// BLINDAGEM da diferenciação de laboratório na venda: exame mostra o lab + estrela no Veter.
describe("catalogoVendavel — labDoItem (lab + estrela na venda)", () => {
  it("exame do Veter → estrela (veter=true)", () => {
    expect(labDoItem({ _exame: true, _fornecedorNome: "Veter" })).toEqual({ nome: "Veter", veter: true });
    expect(labDoItem({ _exame: true, _fornecedorNome: "Laboratório Veter Diagnóstico" })?.veter).toBe(true);
  });
  it("exame de outro lab → sem estrela (veter=false)", () => {
    expect(labDoItem({ _exame: true, _fornecedorNome: "Alvaro" })).toEqual({ nome: "Alvaro", veter: false });
  });
  it("produto/serviço (não-exame) → sem rótulo de lab", () => {
    expect(labDoItem({ _exame: false, _fornecedorNome: "Qualquer" })).toBeNull();
    expect(labDoItem({ _fornecedorNome: "Veter" })).toBeNull();
    expect(labDoItem(null)).toBeNull();
  });
  it("exame sem fornecedor → sem rótulo (não inventa)", () => {
    expect(labDoItem({ _exame: true, _fornecedorNome: null })).toBeNull();
    expect(labDoItem({ _exame: true, _fornecedorNome: "  " })).toBeNull();
  });
  it("o rótulo do lab NÃO entra na descrição salva (fica só na UI)", () => {
    const l = linhaDoItem({ id: "e1", nome: "🔬 HEMOGRAMA", valorPadrao: 40, _exame: true, _fornecedorNome: "Veter" });
    expect(l.descricao).toBe("HEMOGRAMA"); // sem "🔬", sem lab
    expect(nomeSemMarcador("🔬 HEMOGRAMA")).toBe("HEMOGRAMA");
  });
});

// ⚖️ PREÇO POR PORTE na hora da venda (05/09/2026). O peso do ANIMAL escolhe o preço; antes a
// recepção escolhia pelo NOME do item ("ACEPRAN - 11 A 20 KG"), que é como se cobrava errado
// sem ninguém perceber. Os valores são os do Acepran na produção (#7, #1, #3, #5).
describe("linhaDoItem com peso do animal", () => {
  const acepran = {
    id: "ac", nome: "ACEPRAN", valorPadrao: 37.57, custoPadrao: 5, _novo: true,
    _precosPorte: JSON.stringify([
      { ate: 10, rotulo: "0 a 10 kg", preco: 37.57, custo: 5 },
      { ate: 20, rotulo: "11 a 20 kg", preco: 44.91, custo: 7 },
      { ate: 30, rotulo: "21 a 30 kg", preco: 51.49, custo: 9 },
      { ate: 40, rotulo: "31 a 40 kg", preco: 58.44, custo: 11 },
      { ate: null, rotulo: "41 a 50+ kg", preco: null },
    ]),
  };

  it("cão de 14,2 kg leva o preço E o custo da faixa dele", () => {
    const l = linhaDoItem(acepran as any, 14.2);
    expect(l.valorUnitario).toBe(44.91);
    expect(l.custoUnitario).toBe(7);
    expect(l._faixaRotulo).toBe("11 a 20 kg");
    expect(l._avisoPorte).toBeNull();
  });

  it("na borda, 10,0 fica na primeira faixa e 10,05 já vai pra segunda", () => {
    expect(linhaDoItem(acepran as any, 10).valorUnitario).toBe(37.57);
    expect(linhaDoItem(acepran as any, 10.05).valorUnitario).toBe(44.91);
  });

  it("pet SEM peso não vira preço zero — mantém o base e pede a faixa", () => {
    const l = linhaDoItem(acepran as any, null);
    expect(l.valorUnitario).toBe(37.57); // preço-base do item, não zero
    expect(l._avisoPorte).toMatch(/peso do animal não está no cadastro/i);
    expect(l._faixas).toHaveLength(5);
  });

  it("faixa cadastrada SEM preço avisa em vez de usar o preço do vizinho", () => {
    const l = linhaDoItem(acepran as any, 47);
    expect(l._avisoPorte).toMatch(/41 a 50\+ kg/);
    expect(l._faixaRotulo).toBe("41 a 50+ kg");
  });

  it("item sem faixas ignora o peso e segue como sempre foi", () => {
    const l = linhaDoItem({ id: "x", nome: "CONSULTA", valorPadrao: 150, _novo: true } as any, 33);
    expect(l.valorUnitario).toBe(150);
    expect(l._faixas).toBeUndefined();
    expect(l._avisoPorte).toBeUndefined();
  });

  it("a faixa viaja junto com a identidade do item — não atrapalha o resto", () => {
    const l = linhaDoItem(acepran as any, 25);
    expect(l.catalogoItemId).toBe("ac");
    expect(l._novo).toBe(true);
    expect(itemParaVenda(l).valorUnitario).toBe(51.49);
  });
});
