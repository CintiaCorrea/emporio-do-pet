import { describe, it, expect } from "vitest";
import { aplicarPeso, type FaixaPorte } from "./porte";

// Cintia, 16/09/2026: "sem preço à mão, peso tem que estar registrado". A troca de faixa na mão
// (aplicarFaixa) saiu; quem escolhe é o peso. Quando o peso é registrado na própria venda, as
// linhas que já estavam lá pegam o preço da faixa do peso novo. Cerenia de produção (5 em 5 kg).
const CERENIA: FaixaPorte[] = [
  { ate: 10, rotulo: "0 a 10 kg", preco: 77.92, custo: 20 },
  { ate: 15, rotulo: "11 a 15 kg", preco: 155.84, custo: 40 },
  { ate: null, rotulo: "acima de 15 kg", preco: null },
];
const LINHA = { _faixas: CERENIA, valorUnitario: 77.92, custoUnitario: 20, _faixaRotulo: null, _avisoPorte: "Este item tem preço por porte e o peso do animal não está no cadastro." };

describe("aplicarPeso", () => {
  it("peso registrado agora: a linha pega a faixa e o preço dela", () => {
    const l = aplicarPeso(LINHA, 12.4);
    expect(l.valorUnitario).toBe(155.84);
    expect(l.custoUnitario).toBe(40);
    expect(l._faixaRotulo).toBe("11 a 15 kg");
    expect(l._avisoPorte).toBeNull();
  });

  it("faixa sem preço não vira zero nem herda o da vizinha — mantém e avisa", () => {
    const l = aplicarPeso(LINHA, 22);
    expect(l.valorUnitario).toBe(77.92);
    expect(l._avisoPorte).toContain("não tem preço");
  });

  it("item de preço único não muda", () => {
    const unico = { valorUnitario: 35, custoUnitario: 0 };
    expect(aplicarPeso(unico, 8)).toEqual(unico);
  });
});
