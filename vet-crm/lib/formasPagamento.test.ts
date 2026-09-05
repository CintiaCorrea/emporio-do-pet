import { describe, it, expect } from "vitest";
import { validarPagamentosCartao, adquirenteDaLinha, PagForma, FormaCfg } from "./formasPagamento";

// REGRA DA CASA (05/09/2026, CORRIGIDA pela Cintia): venda no cartão só salva com OPERADORA
// e AUT. NSU e autorização são números DIFERENTES, e o papel da maquininha normalmente
// imprime só a AUT — exigir os dois travava a venda por um dado que a atendente não tem como
// ler. A AUT é o que casa a venda com a linha do extrato na conciliação.
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

  it("passa quando o cartão tem operadora e AUT", () => {
    expect(validarPagamentosCartao([cartaoOk], cfg)).toBeNull();
  });

  it("passa SEM NSU — o papel da maquininha normalmente só traz a AUT", () => {
    expect(validarPagamentosCartao([{ ...cartaoOk, nsu: "" }], cfg)).toBeNull();
    expect(validarPagamentosCartao([{ ...cartaoOk, nsu: undefined }], cfg)).toBeNull();
  });

  it("mas aceita o NSU quando a maquininha imprime", () => {
    expect(validarPagamentosCartao([{ ...cartaoOk, nsu: "123456" }], cfg)).toBeNull();
  });

  it("recusa cartão sem AUT — é o número que casa com o extrato", () => {
    expect(validarPagamentosCartao([{ ...cartaoOk, aut: undefined }], cfg)).toMatch(/autoriza/i);
    expect(validarPagamentosCartao([{ ...cartaoOk, aut: "  " }], cfg)).toMatch(/autoriza/i);
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
      [{ forma: "Dinheiro", valor: 50 }, { ...cartaoOk, aut: "" }],
      cfg,
    );
    expect(erro).toMatch(/2ª forma/);
  });

  it("a operadora escolhida na baixa vence a configurada na forma", () => {
    expect(adquirenteDaLinha({ forma: "Cielo Crédito", valor: 10, adquirente: "Stone" }, cfg[0])).toBe("Stone");
    expect(adquirenteDaLinha({ forma: "Cielo Crédito", valor: 10 }, cfg[0])).toBe("Cielo");
  });
});
