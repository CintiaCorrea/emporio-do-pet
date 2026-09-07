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

describe("no ponto de venda é UMA lista só, colorida pela situação", () => {
  it("as abas 'Não pago / Pago' não voltam", () => {
    // Cintia, 07/09/2026: "não quero duas abas no ponto de venda". A venda paga sai da lista
    // e vira recebimento; o que fica em pé é a pagar (verde), atrasada (vermelha) e orçamento
    // (cinza). Aba divide o que ela quer ver junto.
    const src = ler(PDV);
    expect(src).not.toContain("setVendaTab");
    expect(src).not.toContain("Não pago");
  });

  it("a atrasada é separada da conta do dia", () => {
    // É a diferença entre as duas cores: conta de hoje é rotina, conta de ontem é cobrança.
    expect(ler(PDV)).toContain("ehAtrasada");
  });

  it("a lista lê as contas em aberto de TODOS os dias", () => {
    // Conta em aberto não pertence a um dia. Antes isso era um checkbox que vinha desmarcado —
    // ou seja, a atrasada ficava invisível por padrão, que é justamente a que precisa aparecer.
    expect(ler(PDV)).toContain("vendasEmAberto");
    expect(ler(PDV)).not.toContain("Abertas (todos os dias)");
  });
});

describe("o relatório do dia sai como no SimplesVet", () => {
  it("o Caixa imprime as comandas do dia", () => {
    // Cintia, 07/09/2026: "o relatório é para ser impresso as comandas por dia, como no
    // simplesvet" — e com os itens de cada comanda, não só o total.
    expect(ler(PDV)).toContain("imprimirComandasDia");
  });

  it("cada comanda sai com os seus itens", () => {
    const src = ler("lib/documentos/relatorio-vendas-print.ts");
    expect(src).toContain("imprimirComandasDoDia");
    expect(src).toContain("it.quantidade");
    expect(src).toContain("it.valorUnitario");
  });

  it("a comanda não parte no meio da página", () => {
    // Bloco cortado entre folhas é conferência perdida.
    expect(ler("lib/documentos/relatorio-vendas-print.ts")).toContain("page-break-inside:avoid");
  });
});
