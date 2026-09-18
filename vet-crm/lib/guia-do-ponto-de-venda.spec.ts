// A AMOSTRA DO MATERIAL NOVO DA ACADEMIA (18/09/2026). Cintia: "o que consta lá está totalmente
// fora, a parte de vendas tem vários detalhes e nuances que precisam ser melhor explicados".
// O guia de vendas era UMA página para o módulo inteiro. Agora cada parte tem a sua, no molde do
// guia do WhatsApp. Este teste guarda o que não pode faltar na página do Ponto de venda.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const guia = fs.readFileSync(path.join(process.cwd(), "public/academia/guia-vendas-ponto-de-venda.html"), "utf8");

describe("o molde do guia do WhatsApp", () => {
  const whats = fs.readFileSync(path.join(process.cwd(), "public/academia/guia-whatsapp.html"), "utf8");
  for (const peca of ["header class=\"hero\"", "ol class=\"steps\"", "class=\"btnrow\"", "class=\"rules\""]) {
    it(`usa ${peca}, como o do WhatsApp`, () => {
      expect(whats).toContain(peca);
      expect(guia).toContain(peca);
    });
  }
  it("e acrescenta as duas seções que faltavam: nuances e o que dá errado", () => {
    expect(guia).toContain("class=\"note");
    expect(guia).toContain("table class=\"fix\"");
  });
});

describe("as regras que a recepção erra no balcão estão escritas", () => {
  const tem = (t: string) => expect(guia).toContain(t);
  it("o peso manda no preço", () => tem("O peso manda no preço"));
  it("preço não se digita", () => tem("O preço não se digita"));
  it("item só do catálogo", () => tem("Item só entra se vier do catálogo"));
  it("caução recebida sozinha", () => tem("A caução precisa ser recebida sozinha"));
  it("cada um no seu caixa", () => tem("Cada pessoa lança no próprio caixa"));
  it("as cores da lista do dia", () => { tem("🟢 Verde"); tem("🔴 Vermelho"); tem("⚪ Cinza"); });
  it("o botão vermelho do que o cliente já deve", () => tem("Deve R$"));
});

describe("a Academia mostra a página", () => {
  it("o tema Vendas abre no Ponto de venda", () => {
    const pag = fs.readFileSync(path.join(process.cwd(), "app/(user)/dashboard/academia/page.tsx"), "utf8");
    expect(pag).toContain("/academia/guia-vendas-ponto-de-venda.html");
    expect(pag).toContain("🛒 Ponto de venda");
  });
});
