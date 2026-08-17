import { describe, it, expect } from "vitest";
import { ehDinheiro, ehMaquininha, modalidadeToTaxaForma, adquirenteDe, MODALIDADES, PARC } from "@/lib/formasPagamento";

// BLINDAGEM do centro de RECEBIMENTO. Estes helpers mexem em dinheiro:
// - ehDinheiro decide troco e o que entra na gaveta;
// - modalidadeToTaxaForma casa a modalidade com a tabela de taxas de cartão (nome sem acento);
// - ehMaquininha decide se pede bandeira/parcelas.
// Se alguém quebrar isso, troco/taxa saem errados. O teste trava o comportamento.

describe("formasPagamento — ehDinheiro", () => {
  it("reconhece dinheiro / espécie (gera troco)", () => {
    expect(ehDinheiro("Dinheiro")).toBe(true);
    expect(ehDinheiro("dinheiro")).toBe(true);
    expect(ehDinheiro("Espécie")).toBe(true);
    expect(ehDinheiro("Especie")).toBe(true);
  });
  it("NÃO trata cartão/pix como dinheiro", () => {
    expect(ehDinheiro("Pix")).toBe(false);
    expect(ehDinheiro("Cartão crédito")).toBe(false);
    expect(ehDinheiro("Crédito do pet")).toBe(false);
    expect(ehDinheiro("")).toBe(false);
    expect(ehDinheiro(undefined)).toBe(false);
  });
});

describe("formasPagamento — modalidade → taxa (nome da tabela, sem acento)", () => {
  it("mapeia as 3 modalidades exatamente como a tabela de taxas espera", () => {
    expect(modalidadeToTaxaForma("Débito")).toBe("Debito");
    expect(modalidadeToTaxaForma("Crédito à vista")).toBe("Credito a vista");
    expect(modalidadeToTaxaForma("Crédito parcelado")).toBe("Credito parcelado");
  });
  it("modalidade desconhecida → vazio (não casa taxa errada)", () => {
    expect(modalidadeToTaxaForma("")).toBe("");
    expect(modalidadeToTaxaForma(undefined)).toBe("");
  });
  it("as 3 modalidades canônicas estão presentes", () => {
    expect(MODALIDADES).toContain("Débito");
    expect(MODALIDADES).toContain("Crédito à vista");
    expect(MODALIDADES).toContain("Crédito parcelado");
  });
});

describe("formasPagamento — maquininha e parcelas", () => {
  it("ehMaquininha detecta cartão pelo tipo", () => {
    expect(ehMaquininha({ nome: "Cielo", tipo: "maquininha" })).toBe(true);
    expect(ehMaquininha({ nome: "Cielo", tipo: "cartao" })).toBe(true);
    expect(ehMaquininha({ nome: "Dinheiro", tipo: "dinheiro" })).toBe(false);
    expect(ehMaquininha(undefined)).toBe(false);
  });
  it("adquirenteDe usa o adquirente e cai pro nome", () => {
    expect(adquirenteDe({ nome: "Maq 1", adquirente: "Cielo" })).toBe("Cielo");
    expect(adquirenteDe({ nome: "Cielo" })).toBe("Cielo");
  });
  it("PARC cobre 2..12 parcelas", () => {
    expect(PARC[0]).toBe(2);
    expect(PARC[PARC.length - 1]).toBe(12);
    expect(PARC.length).toBe(11);
  });
});
