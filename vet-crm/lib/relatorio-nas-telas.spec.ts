import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// 🛡️ PROTEÇÃO DO PAPEL DE VENDA E DA LISTA DO PONTO DE VENDA.
//
// A Cintia, em 07/09/2026, corrigindo a primeira entrega:
//   1. "Precisa vir o descritivo de cada dia, não pode ser assim. Já tinha dito isso."
//   2. "Não precisamos desses botões. o de imprimir já está nas comandas."
//   3. "As comandas devem aparecer pelo dia em que estão abertas. Não precisa manter o acumulado
//       no ponto de venda, ele pode aparecer somente quando clicamos para receber a venda
//       aparecer o saldo devedor."
//
// O que ela recusou foi um papel que trazia só a linha da conta ("#1081 · 29/08 · Lua ·
// R$ 2.271,06") e uma lista de vendas tomada por cartões de acumulado por cliente. Nenhuma das
// duas coisas quebra o build, nenhuma aparece no tsc: é a tela ficando errada em silêncio.

const raiz = path.resolve(__dirname, "..");
const ler = (p: string) =>
  fs.readFileSync(path.join(raiz, p), "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const PDV = "app/(user)/dashboard/erp/ponto-de-venda/page.tsx";
const PAPEL = "lib/documentos/relatorio-vendas-print.ts";

describe("nenhum papel de venda sai sem o descritivo", () => {
  it("os dois papéis são montados pelo MESMO bloco de comanda", () => {
    // Um bloco só: se um dia alguém escrever um resumo sem itens, terá de sair daqui — e este
    // teste cai junto. Foi assim que o papel sem descritivo nasceu da primeira vez.
    const src = ler(PAPEL);
    expect(src).toContain("function blocoDaComanda");
    const usos = src.match(/blocoDaComanda/g) || [];
    expect(usos.length).toBeGreaterThanOrEqual(3); // a definição + os dois papéis
  });

  it("o bloco mostra item, quantidade, valor e desconto", () => {
    const src = ler(PAPEL);
    expect(src).toContain("it.descricao");
    expect(src).toContain("it.quantidade");
    expect(src).toContain("it.valorUnitario");
    expect(src).toContain("it.desconto");
  });

  it("a conta do cliente é separada POR DIA", () => {
    // "o descritivo de cada dia": o cliente lê a conta dele dia a dia, não numa lista corrida.
    const src = ler(PAPEL);
    expect(src).toContain("imprimirContasDoCliente");
    expect(src).toContain("const dias = new Map");
  });

  it("a comanda não parte no meio da página", () => {
    expect(ler(PAPEL)).toContain("page-break-inside:avoid");
  });

  it("a lista de comandas nunca é cortada na impressão", () => {
    // A tela corta em 8 linhas por falta de espaço; o papel, nunca. (O `.slice(0, 10)` que
    // existe no arquivo é o da data ISO — por isso o alvo aqui é a lista, com nome.)
    expect(ler(PAPEL)).not.toMatch(/comandas\w*\.slice\(\s*\d/);
  });
});

describe("a lista do ponto de venda é do DIA, e é uma só", () => {
  it("as abas 'Não pago / Pago' não voltam", () => {
    const src = ler(PDV);
    expect(src).not.toContain("setVendaTab");
    expect(src).not.toContain("Não pago");
  });

  it("a lista lê as vendas do dia escolhido, não o acumulado", () => {
    // `vendas` é a leitura do dia; `vendasEmAberto` é o acumulado e só serve ao saldo devedor.
    const src = ler(PDV);
    expect(src).toMatch(/vendasFiltradas = useMemo\(\(\) => vendas\b/);
    expect(src).not.toContain("Abertas (todos os dias)");
  });

  it("o acumulado por cliente não volta pra lista", () => {
    // Eram cartões "3 contas abertas · Baixar todas" empilhados em cima das vendas do dia.
    const src = ler(PDV);
    expect(src).not.toContain("gruposMulti");
    expect(src).not.toContain("Baixar todas");
  });

  it("a atrasada continua separada da conta do dia", () => {
    expect(ler(PDV)).toContain("ehAtrasada");
  });
});

describe("o acumulado aparece na hora de receber", () => {
  it("o recebimento mostra o saldo devedor do cliente", () => {
    const src = ler(PDV);
    expect(src).toContain("outrasEmAberto");
    expect(src).toContain("Saldo devedor de");
  });

  it("e de lá dá pra imprimir as contas desse cliente, com descritivo", () => {
    expect(ler(PDV)).toContain("imprimirContasDoTutor");
  });

  it("o Caixa imprime as comandas do dia", () => {
    expect(ler(PDV)).toContain("imprimirComandasDia");
  });
});

describe("o orçamento fica no dia em que foi feito", () => {
  it("a lista filtra o orçamento pelo dia mostrado", () => {
    // Sem esse filtro, orçamento de qualquer data reaparece todo dia e empurra a venda do dia
    // pra fora da tela — foi o que aconteceu na v1595.
    const src = ler(PDV);
    expect(src).toMatch(/orcamentosEmAberto = useMemo\(\(\) => orcamentos\.filter/);
    expect(src).toContain("=== vendaDia");
  });

  it("o ponto de venda não mostra mais o resumo do dia", () => {
    // "Essas informações não precisam" (Cintia, 07/09). Recebido/A receber do dia vivem no
    // Caixa e na Consulta de vendas — aqui eram ruído em cima da lista.
    const src = ler(PDV);
    expect(src).not.toContain("recebidoHoje");
    expect(src).not.toContain("aReceberHoje");
  });
});
