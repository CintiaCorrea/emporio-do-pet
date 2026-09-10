import { describe, it, expect } from "vitest";
import { codigoDoProjeto } from "@/lib/testes/varreduraDoProjeto";

// 🛡️ QUEM RECEBE PERGUNTA EM QUAL CAIXA A BAIXA ENTRA.
//
// A Cintia, 10/09/2026: "as baixas estão indo para o caixa de hoje mesmo o caixa da Gabriela
// estando aberto." A regra de então escolhia sozinha o caixa mais recente da pessoa — e o mais
// recente é sempre o de hoje. A venda #1177, do dia 03/09, foi recebida no dia 10 e gravada no
// caixa do dia 10. Ninguém errou o clique: o sistema nunca perguntou.
//
// Esta trava existe porque a volta atrás é fácil e silenciosa: basta alguém trocar a faixa de
// escolha por "pega o meu caixa e pronto", e o dinheiro volta a cair no dia errado sem nenhum
// teste ficar vermelho.

const TELAS_QUE_RECEBEM = ["app/(user)/dashboard/erp/comandas/page.tsx"];

describe("a baixa pergunta em qual caixa entra", () => {
  const arquivos = codigoDoProjeto();
  const acha = (caminho: string) => {
    const a = arquivos.find((f) => f.caminho === caminho);
    expect(a, `arquivo não encontrado: ${caminho}`).toBeTruthy();
    return a!.src;
  };

  it.each(TELAS_QUE_RECEBEM)("%s oferece a escolha do caixa", (caminho) => {
    const src = acha(caminho);
    expect(src).toContain("EscolhaDoCaixa");
    // Sem enxergar os caixas de OUTROS dias não há o que escolher: `carregarMeuCaixa` só lê
    // os de hoje, e foi exatamente esse recorte que escondeu o problema.
    expect(src).toContain("carregarMeusCaixasAbertos");
  });

  it("a escolha vive num núcleo puro, testado, e não dentro da tela", () => {
    const nucleo = arquivos.find((f) => f.caminho === "lib/escolhaDoCaixa.ts");
    expect(nucleo, "lib/escolhaDoCaixa.ts sumiu").toBeTruthy();
    expect(nucleo!.src).toContain("export function escolhaDoCaixa");
    expect(
      codigoDoProjeto().length &&
        require("fs").existsSync(require("path").resolve(__dirname, "escolhaDoCaixa.test.ts")),
    ).toBe(true);
  });

  it("o componente da escolha some quando só há um caixa — o caso comum não ganha pergunta", () => {
    const src = acha("components/caixa/EscolhaDoCaixa.tsx");
    expect(src).toContain("if (!e.precisaEscolher) return null;");
  });
}, 30000);
