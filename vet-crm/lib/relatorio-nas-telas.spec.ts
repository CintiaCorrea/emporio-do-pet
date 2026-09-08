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

  it("o papel das comandas mora na Consulta de vendas", () => {
    // Saiu do ponto de venda a pedido dela (07/09): lá a coluna é estreita e os itens nem vêm
    // carregados. Na Consulta, o período já é escolhido e cada venda já traz os seus itens.
    expect(ler("app/(user)/dashboard/erp/consulta-vendas/page.tsx")).toContain("imprimirComandasDoDia");
    expect(ler(PDV)).not.toContain("imprimirComandasDia");
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

  it("a coluna de vendas ficou só com a lista", () => {
    // "Junta tudo" (Cintia, 07/09): saíram a legenda das cores e o cartão "Outros caixas" —
    // o menu lateral já leva ao Caixa. A cor continua contando a situação, e cada linha
    // explica no title.
    const src = ler(PDV);
    expect(src).not.toContain("Outros caixas");
    expect(src).not.toContain("Meus caixas");
  });

  it("o ponto de venda não mostra mais o resumo do dia", () => {
    // "Essas informações não precisam" (Cintia, 07/09). Recebido/A receber do dia vivem no
    // Caixa e na Consulta de vendas — aqui eram ruído em cima da lista.
    const src = ler(PDV);
    expect(src).not.toContain("recebidoHoje");
    expect(src).not.toContain("aReceberHoje");
  });
});

describe("o orçamento aparece onde a venda aparece", () => {
  it("a ficha do pet mostra os ITENS do orçamento, não só a contagem", () => {
    // "com data e itens, como a venda aparece" (Cintia, 07/09/2026). Antes dizia só "3 itens",
    // e para saber o que foi proposto ao cliente era preciso abrir o PDF.
    const src = ler("components/pets/PetComandaRail.tsx");
    expect(src).toContain("(o.itens || []).map");
  });

  it("o histórico do cliente traz os orçamentos dele", () => {
    const src = ler("app/(user)/dashboard/erp/tutores/[id]/page.tsx");
    expect(src).toContain("/api/orcamentos?tutorId=");
    expect(src).toContain("orcamentosFiltrados");
  });

  it("orçamento convertido avisa que já virou venda", () => {
    // O vínculo existe no banco (appointmentId). Mostrá-lo é o que impede cobrar duas vezes.
    expect(ler("app/(user)/dashboard/erp/tutores/[id]/page.tsx")).toContain("Já virou venda");
  });

  it("orçamento não entra no total gasto do cliente", () => {
    // Proposta não é dinheiro. O total do cliente continua somando só as compras.
    const src = ler("app/(user)/dashboard/erp/tutores/[id]/page.tsx");
    expect(src).toContain("comprasFiltradas.reduce((s, a) => s + (a.value || 0), 0)");
    expect(src).not.toContain("orcamentosFiltrados.reduce");
  });
});

describe("devolução: existe UMA só, e ela desfaz as três consequências", () => {
  it("o ponto de venda leva para a devolução que já existia, em vez de ter a sua", () => {
    // Erro meu em 07/09: escrevi uma segunda devolução sem ver que já havia uma completa no
    // financeiro (taxa do cartão, parcelas, dedução no DRE, crédito ou dinheiro). Duas
    // devoluções com contas diferentes é pior que nenhuma.
    const src = ler(PDV);
    expect(src).toContain("consulta-vendas?venda=");
    expect(src).not.toContain("/devolucao`");
  });
});
