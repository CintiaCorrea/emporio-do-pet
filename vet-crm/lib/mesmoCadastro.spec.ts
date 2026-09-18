import { describe, it, expect } from "vitest";
import { mesmoValor, soLetrasENumeros } from "./mesmoCadastro";

describe("o ✓ verde de Cadastros recebidos", () => {
  it("marca e-mail igual — o caso que nunca funcionou (não tem dígito)", () => {
    expect(mesmoValor("maria@gmail.com", "Maria@Gmail.com")).toBe(true);
  });

  it("marca nome de pet igual, mesmo o cadastro antigo tendo vários", () => {
    expect(mesmoValor("Beagle", "Luna, Beagle, Thor", "lista")).toBe(true);
  });

  it("não marca pet parecido — 'Lua' não é 'Luna'", () => {
    expect(mesmoValor("Lua", "Luna, Beagle", "lista")).toBe(false);
  });

  it("continua marcando CPF, com ou sem pontuação", () => {
    expect(mesmoValor("12345678900", "123.456.789-00")).toBe(true);
  });

  it("ignora acento e caixa no endereço", () => {
    expect(mesmoValor("Rua São João, 120", "rua sao joao 120")).toBe(true);
  });

  it("vazio nunca marca — dois traços não são uma coincidência", () => {
    expect(mesmoValor("", "")).toBe(false);
    expect(mesmoValor("—", "—")).toBe(false);
    expect(mesmoValor("maria@gmail.com", "")).toBe(false);
  });

  it("valores diferentes não marcam", () => {
    expect(mesmoValor("maria@gmail.com", "joana@gmail.com")).toBe(false);
  });

  it("normaliza como esperado", () => {
    expect(soLetrasENumeros("José D'Ávila")).toBe("josedavila");
  });
});
