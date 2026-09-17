import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";
import { valorDigitado, valorParaCampo } from "./valorDigitado";

/**
 * O CAMPO DE DINHEIRO ACEITA CENTAVOS — E NÃO INVENTA VALOR.
 *
 * Cintia, 15/09/2026: "não está permitindo lançar os centavos nas baixas do caixa". E, no mesmo
 * dia: "já pedi que todos os campos com valor tenham dois dígitos após a vírgula" — ou seja, era
 * a segunda vez.
 *
 * O DEFEITO ERA PIOR DO QUE TRAVAR OS CENTAVOS. O campo estava ligado ao NÚMERO: ao teclar "12,"
 * o componente convertia para 12 e reescrevia o campo, apagando a vírgula. Quem digitava "12,50"
 * terminava com 125 — e nada na tela mostrava o instante em que o valor mudou. Não é um campo
 * que recusa: é um campo que grava outra coisa.
 *
 * Estava em quatro campos de três telas: o valor da baixa no caixa, e o valor unitário e o
 * desconto do item, no ponto de venda e na edição de comanda.
 */
describe("o que a pessoa digitou", () => {
  it("vírgula é decimal", () => {
    expect(valorDigitado("12,50")).toBe(12.5);
    expect(valorDigitado("0,99")).toBe(0.99);
    expect(valorDigitado("1234,56")).toBe(1234.56);
  });

  it("ponto também, porque muita gente digita assim", () => {
    expect(valorDigitado("12.50")).toBe(12.5);
  });

  it("MILHAR não vira centavo — errar aqui é errar por mil", () => {
    // "1.234" é mil duzentos e trinta e quatro, não um real e vinte e três.
    expect(valorDigitado("1.234")).toBe(1234);
    expect(valorDigitado("1.234,56")).toBe(1234.56);
    expect(valorDigitado("1,234.56")).toBe(1234.56);
  });

  it("aguenta o que a pessoa realmente digita", () => {
    expect(valorDigitado("R$ 12,50")).toBe(12.5);
    expect(valorDigitado("  12,50  ")).toBe(12.5);
    expect(valorDigitado("12")).toBe(12);
  });

  it("no meio da digitação não estraga o que já foi escrito", () => {
    // Estes são os estados intermediários de quem está digitando "12,50". Nenhum pode virar
    // outro número: era exatamente aqui que o "12," virava 12 e o "5" seguinte fazia 125.
    expect(valorDigitado("12,")).toBe(12);
    expect(valorDigitado("12,5")).toBe(12.5);
    expect(valorDigitado("12,50")).toBe(12.5);
  });

  it("lixo vira zero, não NaN", () => {
    // NaN atravessa a tela inteira e só aparece no total, como "R$ NaN".
    expect(valorDigitado("")).toBe(0);
    expect(valorDigitado("abc")).toBe(0);
    expect(valorDigitado(null)).toBe(0);
    expect(valorDigitado(undefined)).toBe(0);
    expect(valorDigitado(",")).toBe(0);
  });
});

describe("o que o campo mostra quando ninguém está digitando", () => {
  it("sempre duas casas — foi o pedido dela, duas vezes", () => {
    expect(valorParaCampo(12.5)).toBe("12,50");
    expect(valorParaCampo(12)).toBe("12,00");
    expect(valorParaCampo(1234.5)).toBe("1234,50");
  });

  it("zero fica vazio, para o campo não parecer preenchido", () => {
    expect(valorParaCampo(0)).toBe("");
  });
});

describe("uma peça só, em todas as telas", () => {
  const RAIZ = join(__dirname, "..");
  const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");

  it("o campo guarda o TEXTO enquanto se digita", () => {
    // É esta a correção: o número sai para fora a cada tecla (os totais batem ao vivo), mas não
    // volta para dentro do campo apagando o que a pessoa acabou de escrever.
    const campo = ler("components", "comum", "CampoValor.tsx");
    expect(campo).toContain("const [rascunho, setRascunho]");
    expect(campo).toContain("onValor(valorDigitado(e.target.value))");
  });

  it("o recebimento do caixa usa a peça", () => {
    expect(ler("components", "financeiro", "PagamentoFormas.tsx")).toContain("<CampoValor");
  });

  it("o ponto de venda usa a peça — desconto, na venda e na edição", () => {
    // O preço unitário saiu dos campos editáveis em 16/09/2026 ("sem preço à mão"): vem do cadastro.
    const pdv = ler("app", "(user)", "dashboard", "erp", "ponto-de-venda", "page.tsx");
    expect((pdv.match(/<CampoValor/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(pdv).not.toContain('placeholder="Unit." title="Valor unitário"');
  });

  it("e nenhum deles voltou a ler o número direto do onChange", () => {
    // O padrão que causou tudo: `value={numero}` com `onChange={... Number(e.target.value)}`.
    for (const arq of [
      ["components", "financeiro", "PagamentoFormas.tsx"],
      ["components", "comum", "CampoValor.tsx"],
    ]) {
      expect(ler(...arq)).not.toMatch(/value=\{[^}]*\.valor[^}]*\}[^>]*onChange=\{[^}]*Number\(/);
    }
  });
});
