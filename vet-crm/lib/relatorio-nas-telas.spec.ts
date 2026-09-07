import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// 🛡️ PROTEÇÃO DO RELATÓRIO DE VENDAS.
//
// A Cintia, em 07/09/2026: "Preciso poder imprimir relatórios de vendas/orçamento dos clientes,
// principalmente quando temos muitas vendas abertas."
//
// O "principalmente" é a chave: a lista do Caixa mostra 8 linhas e o resto sumia sem avisar —
// exatamente com muitas contas abertas, que é quando a lista importa. Um relatório que também
// cortasse não resolveria nada. Estes testes travam as duas pontas: o botão existe, e o corte
// da tela é dito em voz alta.

const raiz = path.resolve(__dirname, "..");
const ler = (p: string) =>
  fs.readFileSync(path.join(raiz, p), "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const PDV = "app/(user)/dashboard/erp/ponto-de-venda/page.tsx";

describe("dá pra imprimir a conta do cliente", () => {
  it("o Caixa oferece o relatório", () => {
    expect(ler(PDV)).toContain("imprimirRelatorioVendas");
  });

  it("o cliente com várias contas abertas tem impressão só dele", () => {
    // É o caso que a Cintia citou: conferir com o cliente na frente o que está em aberto.
    expect(ler(PDV)).toContain("imprimirRelatorioDoCliente");
  });

  it("o relatório sai agrupado por cliente", () => {
    // Uma lista corrida de 40 vendas não serve pra cobrar ninguém.
    expect(ler("lib/documentos/relatorio-vendas-print.ts")).toContain("agruparPorCliente");
  });

  it("o relatório sai INTEIRO — nada de slice na hora de imprimir", () => {
    expect(ler("lib/documentos/relatorio-vendas-print.ts")).not.toMatch(/\.slice\(0,\s*\d+\)/);
  });
});

describe("o corte da lista de vendas nunca é mudo", () => {
  it("a tela avisa quando há mais vendas do que cabem", () => {
    // `vendasFiltradas.slice(0, 8)` continua existindo (a tela é estreita) — o que não pode
    // voltar é o resto sumir calado.
    const src = ler(PDV);
    expect(src).toContain("não couberam na lista");
    expect(src).toContain("não couberam · 🖨️ ver todos no relatório");
  });
});
