import { describe, it, expect } from "vitest";
import { aplicarFaixa, type FaixaPorte } from "./porte";

// A Cintia, 11/09/2026: "o sistema continua nao lendo o peso quando vamos lancar na
// venda/orcamento". Tres telas precisam da mesma troca de faixa; a regra passa a ser uma so.
const FAIXAS: FaixaPorte[] = [
  { ate: 10, rotulo: "0 a 10 kg", preco: 77.92, custo: 20 },
  { ate: 20, rotulo: "11 a 20 kg", preco: 155.84, custo: 40 },
  { ate: null, rotulo: "41 a 50+ kg", preco: null },   // cadastrada, sem preço
];
const LINHA = { _faixas: FAIXAS, valorUnitario: 77.92, custoUnitario: 20, _faixaRotulo: "0 a 10 kg", _avisoPorte: null };

describe("aplicarFaixa", () => {
  it("troca preço e custo pela faixa escolhida", () => {
    const l = aplicarFaixa(LINHA, "11 a 20 kg");
    expect(l.valorUnitario).toBe(155.84);
    expect(l.custoUnitario).toBe(40);
    expect(l._faixaRotulo).toBe("11 a 20 kg");
    expect(l._avisoPorte).toBeNull();
  });

  it("FAIXA SEM PREÇO não vira zero nem herda o da vizinha — mantém e avisa", () => {
    const l = aplicarFaixa(LINHA, "41 a 50+ kg");
    expect(l.valorUnitario).toBe(77.92);       // ficou o que estava
    expect(l._avisoPorte).toBe("A faixa 41 a 50+ kg não tem preço cadastrado.");
    expect(l._faixaRotulo).toBe("41 a 50+ kg"); // a escolha da pessoa é respeitada
  });

  it("rótulo que não existe não mexe em nada", () => {
    expect(aplicarFaixa(LINHA, "inventada")).toEqual(LINHA);
  });

  it("linha sem faixas não é alterada", () => {
    const semFaixas = { valorUnitario: 50 };
    expect(aplicarFaixa(semFaixas, "0 a 10 kg")).toEqual(semFaixas);
  });
});
