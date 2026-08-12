import { describe, it, expect } from "vitest";
import { labDoItem, linhaDoItem, nomeSemMarcador } from "@/lib/catalogoVendavel";

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
