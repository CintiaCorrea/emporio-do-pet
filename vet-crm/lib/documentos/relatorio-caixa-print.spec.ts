import { describe, it, expect, vi } from "vitest";

// O papel é montado por lib/print → window.open. Aqui o que interessa é o CONTEÚDO: capturo o
// HTML que o motor receberia e leio o que está escrito nele.
const capturado: { titulo: string; corpo: string }[] = [];
vi.mock("@/lib/print", () => ({
  imprimirDocumento: async (titulo: string, corpo: string) => { capturado.push({ titulo, corpo }); },
}));

import { imprimirCaixaDetalhado, imprimirResumoDeCaixas } from "@/lib/documentos/relatorio-caixa-print";

const caixa = {
  numero: 12, status: "FECHADO", abertura: "2026-09-08T09:20:00", fechamento: "2026-09-08T18:26:00",
  suprimento: 82, observacao: "Abertura de caixa", user: { name: "Gabriela" },
  valorEsperado: 1000, valorContado: 1000, diferenca: 0,
  recebimentos: [
    { id: "r1", data: "2026-09-08T10:30:00", appointmentId: "ap1", valorTotal: 300,
      formas: [{ forma: "InfinitePay Crédito", valor: 300, parcelas: 3 }],
      appointment: { id: "ap1", value: 300, numeroVenda: 1081, pet: { name: "Lua" }, tutor: { id: "t1", name: "Ana" } } },
  ],
  movimentos: [{ data: "2026-09-08T14:00:00", tipo: "SANGRIA", descricao: "Depósito", conta: "Banco", forma: "Dinheiro", valor: 200 }],
  creditosUtilizados: [{ data: "2026-09-08T15:00:00", valor: 937.84, descricao: "Uso em recebimento", tutor: { name: "Bia" } }],
  creditosGerados: [{ data: "2026-09-08T11:00:00", valor: 50, descricao: "Caução", tutor: { name: "Cida" } }],
};

const papel = async (fn: () => Promise<void>) => { capturado.length = 0; await fn(); return capturado[0]; };

describe("o papel do caixa é documento, não captura de tela", () => {
  it("traz o cabeçalho do caixa com operador e conferência", async () => {
    const p = await papel(() => imprimirCaixaDetalhado(caixa as any));
    expect(p.titulo).toContain("nº 12");
    expect(p.corpo).toContain("Gabriela");
    expect(p.corpo).toContain("Conferido");
  });

  it("mostra a condição de parcelamento — o papel deles perde isso", async () => {
    // "A tela mostra a condição de parcelamento e o papel não" (Cintia, 08/09/2026). Sem o
    // "Parcelado 3x" não dá para conferir maquininha.
    const p = await papel(() => imprimirCaixaDetalhado(caixa as any));
    expect(p.corpo).toContain("Parcelado 3x");
  });

  it("cada coluna traz o que o nome diz — o número da venda na coluna Venda", async () => {
    // "No PDF a coluna Venda vem preenchida com a data da venda, não com o número — os rótulos
    // estão trocados em relação ao conteúdo."
    const p = await papel(() => imprimirCaixaDetalhado(caixa as any));
    expect(p.corpo).toContain("#1081");
  });

  it("o crédito utilizado SAI no papel, fora do total", async () => {
    // "Não sai no papel: o bloco Comentários de revisão e o bloco Créditos utilizados." É
    // justamente a pegadinha que ela apontou — um caixa pode parecer sem movimento.
    const p = await papel(() => imprimirCaixaDetalhado(caixa as any));
    expect(p.corpo).toContain("Créditos utilizados neste caixa");
    expect(p.corpo).toContain("Fora do total do caixa");
  });

  it("a sangria aparece com sinal de saída", async () => {
    const p = await papel(() => imprimirCaixaDetalhado(caixa as any));
    expect(p.corpo).toMatch(/−\s*R\$\s*200/);
  });

  it("caixa vazio imprime sem quebrar", async () => {
    const p = await papel(() => imprimirCaixaDetalhado({ numero: 1, status: "FECHADO" } as any));
    expect(p.corpo).toContain("Caixa sem movimento");
  });
});

describe("o resumo de vários caixas tem total geral", () => {
  it("soma os caixas — o papel deles não tem linha de total", async () => {
    const p = await papel(() => imprimirResumoDeCaixas([
      { numero: 1, status: "FECHADO", abertura: "2026-09-07T09:00:00", user: { name: "Gabriela" }, recebido: 1000, suprimentos: 100, sangrias: 0, despesas: 0, diferenca: 0, valorContado: 1100 },
      { numero: 2, status: "FECHADO", abertura: "2026-09-08T09:00:00", user: { name: "Victoria" }, recebido: 500, suprimentos: 50, sangrias: 20, despesas: 0, diferenca: null, obsFechamento: "Encerrado automaticamente à meia-noite" },
    ] as any, "07/09/2026 a 08/09/2026"));
    expect(p.corpo).toContain("Total de 2 caixa(s)");
    expect(p.corpo).toMatch(/R\$\s*1\.500,00/);      // recebimentos somados
    expect(p.corpo).toContain("Conferido");           // o que foi contado
    expect(p.corpo).toContain("Encerrado à meia-noite"); // e o que não foi
    expect(p.corpo).toContain("Período:");
  });

  it("período vazio não quebra", async () => {
    const p = await papel(() => imprimirResumoDeCaixas([] as any));
    expect(p.corpo).toContain("Nenhum caixa no período");
  });
});

describe("a tela usa este papel, e não o print do navegador", () => {
  it("o botão do caixa imprime o documento", () => {
    const src = require("fs").readFileSync(
      require("path").resolve(__dirname, "../..", "app/(user)/dashboard/erp/caixa/page.tsx"), "utf8");
    expect(src).toContain("imprimirCaixaDetalhado");
    expect(src).toContain("imprimirResumoDeCaixas");
    // window.print() saía a TELA — menu, abas e botões, cortada onde a página acabasse.
    expect(src).not.toContain("window.print()");
  });
});
