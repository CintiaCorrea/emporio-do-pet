import { describe, it, expect } from "vitest";
import { validarPagamentosCartao, adquirenteDaLinha, ehCartao, ehMaquininha, ehLinkPagamento, PagForma, FormaCfg } from "./formasPagamento";

// REGRA DA CASA (05/09/2026, terceira e definitiva versão — decidida pela Cintia).
//
// Errei duas vezes tentando eleger UM identificador obrigatório pra toda forma de cartão:
//   1. NSU + AUT  → o papel da maquininha normalmente só imprime a AUT
//   2. só a AUT   → o Nubank por LINK não tem identificador nenhum
//
// A saída não era escolher um campo, era separar as FORMAS. Maquininha imprime papel e tem AUT;
// link de pagamento não imprime nada e concilia por valor e data. Nos dois a recepção escolhe
// bandeira e parcelamento.
//
// A AUT ficou como identificador porque é o que a recepção lê mais fácil no comprovante.
// Estes testes existem pra essa distinção não se perder: se alguém voltar a exigir AUT do link
// (trava o balcão) ou parar de exigir da maquininha (fura a conciliação), o deploy para aqui.
describe("formas de pagamento no cartão", () => {
  const cfg: FormaCfg[] = [
    { nome: "Cielo Crédito", tipo: "Maquininha", adquirente: "Cielo" },
    { nome: "Nubank link", tipo: "Link de pagamento", adquirente: "Nubank" },
    { nome: "Dinheiro", tipo: "Espécie" },
    { nome: "PIX", tipo: "PIX" },
  ];
  const maquininha = cfg[0], link = cfg[1];
  const cartaoOk: PagForma = {
    forma: "Cielo Crédito", valor: 150, adquirente: "Cielo",
    modalidade: "Crédito à vista", bandeira: "Visa", nsu: "123456", aut: "998877",
  };
  const linkOk: PagForma = {
    forma: "Nubank link", valor: 150, adquirente: "Nubank",
    modalidade: "Crédito parcelado", bandeira: "Visa", parcelas: 3,
  };

  describe("as três situações", () => {
    it("maquininha é cartão E tem comprovante", () => {
      expect(ehCartao(maquininha)).toBe(true);
      expect(ehMaquininha(maquininha)).toBe(true);
      expect(ehLinkPagamento(maquininha)).toBe(false);
    });
    it("link é cartão MAS não tem comprovante — pede bandeira e parcelas, não pede AUT", () => {
      expect(ehCartao(link)).toBe(true);
      expect(ehLinkPagamento(link)).toBe(true);
      expect(ehMaquininha(link)).toBe(false);
    });
    it('"Cartão / link de pagamento" conta como LINK — a palavra link decide', () => {
      const misto: FormaCfg = { nome: "Nubank", tipo: "Cartão por link de pagamento" };
      expect(ehMaquininha(misto)).toBe(false);
      expect(ehCartao(misto)).toBe(true);
    });
    it("dinheiro e PIX não são cartão nenhum", () => {
      expect(ehCartao(cfg[2])).toBe(false);
      expect(ehCartao(cfg[3])).toBe(false);
    });
  });

  describe("maquininha: exige operadora e AUT", () => {
    it("passa quando tem os dois", () => {
      expect(validarPagamentosCartao([cartaoOk], cfg)).toBeNull();
    });
    it("recusa sem AUT — o papel da maquininha sempre traz esse número", () => {
      expect(validarPagamentosCartao([{ ...cartaoOk, aut: undefined }], cfg)).toMatch(/AUT/i);
      expect(validarPagamentosCartao([{ ...cartaoOk, aut: "  " }], cfg)).toMatch(/AUT/i);
    });
    it("recusa sem operadora", () => {
      const semDono = [{ nome: "Maquininha sem dono", tipo: "Maquininha" }] as FormaCfg[];
      const f: PagForma = { ...cartaoOk, forma: "Maquininha sem dono", adquirente: undefined };
      expect(validarPagamentosCartao([f], semDono)).toMatch(/operadora/i);
    });
    it("passa SEM NSU — nem toda maquininha imprime, e é outro número", () => {
      expect(validarPagamentosCartao([{ ...cartaoOk, nsu: "" }], cfg)).toBeNull();
      expect(validarPagamentosCartao([{ ...cartaoOk, nsu: undefined }], cfg)).toBeNull();
    });
    it("aceita AUT com letras — a Infinity imprime coisas como EVOQEE", () => {
      expect(validarPagamentosCartao([{ ...cartaoOk, aut: "EVOQEE" }], cfg)).toBeNull();
    });
  });

  describe("link de pagamento: exige só a operadora", () => {
    it("salva sem AUT e sem NSU — não existe comprovante pra ler", () => {
      expect(validarPagamentosCartao([linkOk], cfg)).toBeNull();
      expect(validarPagamentosCartao([{ ...linkOk, aut: "", nsu: "" }], cfg)).toBeNull();
    });
    it("mas continua exigindo a operadora — essa a pessoa sabe sem olhar papel", () => {
      const semDono = [{ nome: "Link sem dono", tipo: "Link de pagamento" }] as FormaCfg[];
      const f: PagForma = { ...linkOk, forma: "Link sem dono", adquirente: undefined };
      expect(validarPagamentosCartao([f], semDono)).toMatch(/operadora/i);
    });
  });

  describe("o resto", () => {
    it("NÃO exige nada de dinheiro, PIX ou crédito do cliente", () => {
      expect(validarPagamentosCartao([{ forma: "Dinheiro", valor: 80 }], cfg)).toBeNull();
      expect(validarPagamentosCartao([{ forma: "PIX", valor: 80 }], cfg)).toBeNull();
    });
    it("ignora linha de cartão com valor zero (ainda não preenchida)", () => {
      expect(validarPagamentosCartao([{ forma: "Cielo Crédito", valor: 0 }], cfg)).toBeNull();
    });
    it("com várias formas, diz QUAL delas está faltando", () => {
      const erro = validarPagamentosCartao(
        [{ forma: "Dinheiro", valor: 50 }, { ...cartaoOk, valor: 10, aut: "" }],
        cfg,
      );
      expect(erro).toMatch(/2ª forma/);
    });
    it("a operadora escolhida na baixa vence a configurada na forma", () => {
      expect(adquirenteDaLinha({ forma: "Cielo Crédito", valor: 10, adquirente: "Stone" }, maquininha)).toBe("Stone");
      expect(adquirenteDaLinha({ forma: "Cielo Crédito", valor: 10 }, maquininha)).toBe("Cielo");
    });
  });
});
