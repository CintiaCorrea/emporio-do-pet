import { describe, it, expect } from "vitest";
import { validarPagamentosCartao, adquirenteDaLinha, PagForma, FormaCfg } from "./formasPagamento";

// REGRA DA CASA (04/09/2026, pedido da Cintia): venda no cartão só salva com OPERADORA,
// NSU e AUT preenchidos. É o que permite casar a venda com a linha do extrato da operadora
// na conciliação — sem isso a conferência do cartão vira trabalho manual no fim do mês.
// Este teste existe para a regra não se perder de novo: se alguém tirar a obrigatoriedade,
// o deploy para aqui.
describe("validarPagamentosCartao", () => {
  const cfg: FormaCfg[] = [
    { nome: "Cielo Crédito", tipo: "Maquininha", adquirente: "Cielo" },
    { nome: "Dinheiro", tipo: "Espécie" },
    { nome: "PIX", tipo: "PIX" },
  ];
  const cartaoOk: PagForma = {
    forma: "Cielo Crédito", valor: 150, adquirente: "Cielo",
    modalidade: "Crédito à vista", bandeira: "Visa", nsu: "123456", aut: "998877",
  };

  it("passa quando o cartão tem operadora, NSU e AUT", () => {
    expect(validarPagamentosCartao([cartaoOk], cfg)).toBeNull();
  });

  it("recusa cartão sem NSU", () => {
    expect(validarPagamentosCartao([{ ...cartaoOk, nsu: "" }], cfg)).toMatch(/NSU/i);
  });

  it("recusa cartão sem AUT", () => {
    expect(validarPagamentosCartao([{ ...cartaoOk, aut: undefined }], cfg)).toMatch(/autoriza/i);
  });

  it("recusa cartão sem operadora", () => {
    const semAdq = [{ nome: "Maquininha sem dono", tipo: "Maquininha" }] as FormaCfg[];
    const f: PagForma = { ...cartaoOk, forma: "Maquininha sem dono", adquirente: undefined };
    expect(validarPagamentosCartao([f], semAdq)).toMatch(/operadora/i);
  });

  it("NÃO exige nada de dinheiro, PIX ou crédito do cliente", () => {
    expect(validarPagamentosCartao([{ forma: "Dinheiro", valor: 80 }], cfg)).toBeNull();
    expect(validarPagamentosCartao([{ forma: "PIX", valor: 80 }], cfg)).toBeNull();
  });

  it("ignora linha de cartão com valor zero (ainda não preenchida)", () => {
    expect(validarPagamentosCartao([{ forma: "Cielo Crédito", valor: 0 }], cfg)).toBeNull();
  });

  it("com várias formas, diz QUAL delas está faltando", () => {
    const erro = validarPagamentosCartao(
      [{ forma: "Dinheiro", valor: 50 }, { ...cartaoOk, nsu: "" }],
      cfg,
    );
    expect(erro).toMatch(/2ª forma/);
  });

  it("a operadora escolhida na baixa vence a configurada na forma", () => {
    expect(adquirenteDaLinha({ forma: "Cielo Crédito", valor: 10, adquirente: "Stone" }, cfg[0])).toBe("Stone");
    expect(adquirenteDaLinha({ forma: "Cielo Crédito", valor: 10 }, cfg[0])).toBe("Cielo");
  });
});
