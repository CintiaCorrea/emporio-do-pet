import { describe, it, expect } from "vitest";
import { valorPorExtenso } from "./valorPorExtenso";

describe("valor por extenso do recibo", () => {
  it("valores do dia a dia da clínica", () => {
    expect(valorPorExtenso(1198.99)).toBe("mil cento e noventa e oito reais e noventa e nove centavos");
    expect(valorPorExtenso(150)).toBe("cento e cinquenta reais");
    expect(valorPorExtenso(1936.6)).toBe("mil novecentos e trinta e seis reais e sessenta centavos");
    expect(valorPorExtenso(2188)).toBe("dois mil cento e oitenta e oito reais");
    expect(valorPorExtenso(37.57)).toBe("trinta e sete reais e cinquenta e sete centavos");
  });

  it("os casos que costumam sair errados", () => {
    expect(valorPorExtenso(1)).toBe("um real");
    expect(valorPorExtenso(0.01)).toBe("um centavo");
    expect(valorPorExtenso(100)).toBe("cem reais");
    expect(valorPorExtenso(1010)).toBe("mil e dez reais");
    expect(valorPorExtenso(1200)).toBe("mil e duzentos reais");
    expect(valorPorExtenso(1234)).toBe("mil duzentos e trinta e quatro reais");
    expect(valorPorExtenso(0)).toBe("zero reais");
  });
});
