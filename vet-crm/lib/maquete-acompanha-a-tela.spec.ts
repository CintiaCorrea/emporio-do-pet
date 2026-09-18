// A MAQUETE NÃO PODE ENVELHECER (18/09/2026). Cintia: "como vai funcionar se precisarmos mudar
// alguma coisa, temos como atualizar isso in time?"
//
// A maquete é um DESENHO da tela, não a tela. Material velho ensina errado — então cada botão
// que a maquete mostra é conferido aqui contra o texto da tela de verdade. Se alguém renomeia ou
// tira um botão no Ponto de venda e esquece da maquete, este teste reprova ANTES de publicar,
// dizendo qual peça ficou para trás.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ler = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
const tela = ler("app/(user)/dashboard/erp/ponto-de-venda/page.tsx");
const maquete = ler("public/academia/maquete-ponto-de-venda.html");
const guia = ler("public/academia/guia-vendas-ponto-de-venda.html");

// Cada âncora é uma peça que a RECEPÇÃO vê na tela. `tela` é como o texto está escrito no
// código (às vezes em maiúsculas, ou montado por um seletor), `maquete` é como ele aparece
// desenhado. Os dois têm que existir — é isso que impede a maquete de envelhecer calada.
const ANCORAS: { tela: string; maquete: string; arquivo?: string }[] = [
  { tela: "Nova venda", maquete: "Nova venda" },
  { tela: "Produtos e serviços", maquete: "Produtos e serviços" },
  { tela: "Observações", maquete: "Observações" },
  { tela: "💰 Salvar e receber", maquete: "💰 Salvar e receber" },
  { tela: "💾 Salvar", maquete: "💾 Salvar" },
  { tela: "🖨️ Imprimir ", maquete: "🖨️ Imprimir venda" },
  { tela: "✕ Cancelar", maquete: "✕ Cancelar" },
  { tela: "🔍 Localizar venda", maquete: "🔍 Localizar venda" },
  { tela: "🔒 Fechar o caixa", maquete: "🔒 Fechar o caixa" },
  { tela: "Produto, serviço ou pacote", maquete: "Produto, serviço ou pacote" },
  // as quatro operações do caixa nascem de uma lista em maiúsculas
  { tela: "SUPRIMENTO", maquete: "Suprimento" },
  { tela: "SANGRIA", maquete: "Sangria" },
  { tela: "DESPESA", maquete: "Despesa" },
  { tela: "TRANSFERENCIA", maquete: "Transferência" },
  // o seletor de modelo mora no seu próprio componente
  { tela: "Usar um modelo", maquete: "Usar um modelo", arquivo: "components/vendas/SeletorModeloVenda.tsx" },
];

describe("a maquete mostra o que a tela mostra", () => {
  for (const a of ANCORAS) {
    it(`"${a.maquete}" existe na tela e na maquete`, () => {
      const fonte = a.arquivo ? ler(a.arquivo) : tela;
      expect(fonte.includes(a.tela), `"${a.tela}" sumiu da TELA — se foi de propósito, tire da maquete e desta lista`).toBe(true);
      expect(maquete.includes(a.maquete), `"${a.maquete}" existe na tela e falta na MAQUETE`).toBe(true);
    });
  }
});

describe("a maquete explica, não só desenha", () => {
  it("cada parte marcada tem o balãozinho e o painel", () => {
    const tips = (maquete.match(/data-tip=/g) || []).length;
    const titulos = (maquete.match(/data-t="/g) || []).length;
    expect(tips).toBeGreaterThanOrEqual(25);
    expect(titulos).toBeGreaterThanOrEqual(25);
  });

  it("o painel tem os três blocos — o que é, como usar, a regra e o porquê", () => {
    expect(maquete).toContain("O que é");
    expect(maquete).toContain("Como usar");
    expect(maquete).toContain("📜 A regra — e por quê");
    expect(maquete).toContain("Decidido em ");
  });

  it("as regras aparecem também todas juntas, para imprimir", () => {
    expect(maquete).toContain("As regras desta tela, todas juntas");
  });

  it("a maquete e o guia escrito falam do mesmo Ponto de venda", () => {
    for (const t of ["O peso", "catálogo", "caixa"]) {
      expect(maquete.toLowerCase()).toContain(t.toLowerCase());
      expect(guia.toLowerCase()).toContain(t.toLowerCase());
    }
  });
});
