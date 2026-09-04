import { describe, it, expect } from "vitest";
import { erroDoPeso, lerPeso, pesoPlausivel, sugestoesDeCorrecao } from "./peso";

// BLINDAGEM da trava de peso NA TELA. Espelha backend/src/common/peso.spec.ts — os dois
// lados precisam concordar, senao a tela deixa passar o que o servidor recusa (ou o
// contrario, que e pior: a pessoa digita certo e a tela reclama).
//
// Caso real: Snoopy (#7974), poodle, cadastrado com 8100 kg.
describe("peso (front)", () => {
  describe("o caso do Snoopy", () => {
    it("8100 kg e barrado antes de salvar", () => {
      expect(erroDoPeso("8100")).toMatch(/não é possível/i);
    });
    it("e a mensagem oferece as duas leituras possiveis", () => {
      expect(erroDoPeso("8100")).toMatch(/8,1 kg ou 81 kg/);
    });
    it("8,1 passa", () => {
      expect(erroDoPeso("8,1")).toBeNull();
    });
  });

  describe("lerPeso aceita como a pessoa digita", () => {
    it("virgula e ponto valem o mesmo", () => {
      expect(lerPeso("8,1")).toBe(8.1);
      expect(lerPeso("8.1")).toBe(8.1);
    });
    it("espaco em volta nao atrapalha", () => {
      expect(lerPeso("  18,4  ")).toBe(18.4);
    });
    it("vazio e null — o campo e opcional", () => {
      expect(lerPeso("")).toBeNull();
      expect(lerPeso(null)).toBeNull();
      expect(lerPeso(undefined)).toBeNull();
    });
    it("texto vira NaN", () => {
      expect(Number.isNaN(lerPeso("abc") as number)).toBe(true);
    });
  });

  describe("erroDoPeso", () => {
    it.each(["0,1", "4,2", "18,4", "45", "110", "120"])('deixa passar %s kg', (p) =>
      expect(erroDoPeso(p)).toBeNull(),
    );
    it("campo vazio nao reclama", () => {
      expect(erroDoPeso("")).toBeNull();
    });
    it("zero passa — significa 'ainda nao pesado'", () => {
      expect(erroDoPeso("0")).toBeNull();
    });
    it("texto avisa que e pra escrever so o numero", () => {
      expect(erroDoPeso("oito quilos")).toMatch(/só o número/i);
    });
    it("negativo e barrado", () => {
      expect(erroDoPeso("-5")).toMatch(/não pode ser negativo/i);
    });
    it("peso de mosca e barrado com mensagem propria", () => {
      expect(erroDoPeso("0,01")).toMatch(/filhote recém-nascido/i);
    });
    it("acima do limite sem leitura possivel manda conferir a virgula", () => {
      expect(erroDoPeso("999999")).toMatch(/vírgula/i);
    });
  });

  describe("concorda com o servidor", () => {
    it("mesmos limites", () => {
      expect(pesoPlausivel(120)).toBe(true);
      expect(pesoPlausivel(121)).toBe(false);
      expect(pesoPlausivel(0.05)).toBe(true);
      expect(pesoPlausivel(0.01)).toBe(false);
    });
    it("mesmas sugestoes do backend", () => {
      expect(sugestoesDeCorrecao(8100)).toEqual([8.1, 81]);
      expect(sugestoesDeCorrecao(184)).toEqual([1.84, 18.4]);
      expect(sugestoesDeCorrecao(18.4)).toEqual([]);
    });
  });
});
