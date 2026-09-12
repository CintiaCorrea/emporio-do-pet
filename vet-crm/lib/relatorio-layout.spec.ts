import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * O LAYOUT DO RELATORIO DE VENDAS DO CLIENTE.
 *
 * Cintia, 12/09/2026: "quero que voce melhore o lay-out do relatorio". O caso que ela mandou
 * e o da Kate (tutora Tatyana): 11 comandas, R$ 6.187,64, tudo em aberto, espalhado em QUATRO
 * folhas — e o total so aparecia no pe da ultima. Os dados deste teste sao os dela.
 *
 * Tres regras nasceram dai, e sao estas que o teste guarda:
 *   1. o resumo vem primeiro, e o descritivo depois (a regra de 07/09/2026 continua: o
 *      descritivo de cada dia TEM que vir);
 *   2. coluna que nao tem nada a dizer nao aparece — "Desc." com travessao em 60 linhas e
 *      "Qtd" dizendo 1 empurravam a conta pra quarta folha;
 *   3. nada de dois rotulos de situacao sobrepostos no mesmo canto.
 */
let corpo = "";
/** O Intl do Node poe espaco NAO-SEPARAVEL entre "R$" e o numero. Comparar com espaco
 *  comum falha por um caractere invisivel — entao o esperado sai do mesmo formatador. */
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
vi.mock("@/lib/print", () => ({
  imprimirDocumento: async (_t: string, body: string) => { corpo = body; },
}));

const comanda = (numero: number, data: string, itens: [string, number, number][]) => ({
  id: `c${numero}`,
  numero,
  data: `${data}T12:00:00`,
  tutor: "Tatyana de Castro Bochensky Diniz de Freitas",
  pet: "Kate",
  valor: itens.reduce((s, [, q, vu]) => s + q * vu, 0),
  pago: 0,
  itens: itens.map(([descricao, quantidade, valorUnitario]) => ({ descricao, quantidade, valorUnitario, desconto: 0 })),
});

/** As comandas da Kate, do PDF de 12/09/2026. */
const KATE = [
  comanda(1016, "2026-08-22", [["RX - Radiosonar", 1, 0]]),
  comanda(1048, "2026-08-22", [
    ["Diaria/ Dia", 1, 150], ["Fluidoterapia M", 1, 55],
    ["CEFTRIAXONA - 11-20KG", 3, 102.97],            // <- a unica com quantidade > 1
    ["HEMOCULTURA + ANTIBIOGRAMA", 1, 549.98], ["HEMOGRAMA COMPLETO", 1, 80],
    ["ULTRASSOM ABDOMINAL", 1, 190], ["Cateter", 1, 41.75], ["RX - Radiosonar", 1, 300],
  ]),
  comanda(1104, "2026-08-29", [["AMILASE", 1, 50], ["LIPASE", 1, 60], ["Fluidoterapia 10 a 20K", 1, 45]]),
  comanda(1187, "2026-09-06", [["Diária de internação", 1, 150], ["ONDANSETRONA", 1, 44.53]]),
];

beforeEach(() => { corpo = ""; });

describe("relatorio de vendas do cliente: layout", () => {
  it("o resumo vem ANTES do descritivo, com o total na primeira folha", async () => {
    const { imprimirVendasDoCliente } = await import("./documentos/relatorio-vendas-print");
    await imprimirVendasDoCliente({ tutor: "Tatyana", comandas: KATE });

    const posResumo = corpo.indexOf("Total das vendas");
    const posDetalhe = corpo.indexOf("Descritivo de cada venda");
    expect(posResumo, "o quadro de totais sumiu").toBeGreaterThan(0);
    expect(posDetalhe, "o descritivo sumiu — a regra de 07/09/2026 nao pode se perder").toBeGreaterThan(0);
    expect(posResumo).toBeLessThan(posDetalhe);
    // e o descritivo de fato vem, com os itens
    expect(corpo).toContain("ULTRASSOM ABDOMINAL");
  });

  it("o resumo traz uma linha por venda, com situacao", async () => {
    const { imprimirVendasDoCliente } = await import("./documentos/relatorio-vendas-print");
    await imprimirVendasDoCliente({ tutor: "Tatyana", comandas: KATE });
    const resumo = corpo.slice(corpo.indexOf("Total das vendas"), corpo.indexOf("Descritivo de cada venda"));
    for (const n of [1016, 1048, 1104, 1187]) expect(resumo, `venda ${n}`).toContain(`#${n}`);
    expect(resumo).toContain("EM ABERTO");
  });

  it("coluna Desc. nao aparece quando nao ha desconto nenhum", async () => {
    const { imprimirVendasDoCliente } = await import("./documentos/relatorio-vendas-print");
    await imprimirVendasDoCliente({ tutor: "Tatyana", comandas: KATE });
    expect(corpo).not.toContain(">Desc.<");
  });

  it("mas aparece na comanda que TEM desconto", async () => {
    const { imprimirVendasDoCliente } = await import("./documentos/relatorio-vendas-print");
    const comDesc = { ...KATE[2], itens: [{ descricao: "AMILASE", quantidade: 1, valorUnitario: 50, desconto: 5 }] };
    await imprimirVendasDoCliente({ tutor: "Tatyana", comandas: [comDesc] });
    expect(corpo).toContain(">Desc.<");
    expect(corpo).toContain(`-${brl(5)}`);
  });

  it("Qtd e Valor unitario so na comanda que tem quantidade maior que 1", async () => {
    const { imprimirVendasDoCliente } = await import("./documentos/relatorio-vendas-print");
    // a #1104 e' toda de quantidade 1: unitario repetiria o total
    await imprimirVendasDoCliente({ tutor: "Tatyana", comandas: [KATE[2]] });
    expect(corpo).not.toContain(">Qtd<");
    // a #1048 tem CEFTRIAXONA 3x
    await imprimirVendasDoCliente({ tutor: "Tatyana", comandas: [KATE[1]] });
    expect(corpo).toContain(">Qtd<");
    expect(corpo).toContain(brl(308.91));   // 3 x 102,97
  });

  it("nada de dois rotulos de situacao sobrepostos", async () => {
    const { imprimirVendasDoCliente } = await import("./documentos/relatorio-vendas-print");
    await imprimirVendasDoCliente({ tutor: "Tatyana", comandas: KATE });
    // o selo flutuante era desenhado em cima do cabecalho, que ja diz a situacao
    expect(corpo).not.toContain("position:absolute");
  });

  it("uma venda so nao ganha resumo — seria a mesma conta duas vezes", async () => {
    const { imprimirVendasDoCliente } = await import("./documentos/relatorio-vendas-print");
    await imprimirVendasDoCliente({ tutor: "Tatyana", comandas: [KATE[3]] });
    expect(corpo).not.toContain("Total das vendas");
    expect(corpo).toContain("ONDANSETRONA");   // o descritivo continua
  });

  it("resumo e descritivo NAO se contradizem na mesma venda", async () => {
    // A #1016 da Kate e de R$ 0,00 (um RX que nao foi cobrado). O descritivo ja a chamava de
    // "Paga"; o resumo dizia "EM ABERTO" pela mesma venda — o documento se contradizendo em
    // duas folhas. Achado ao olhar o relatorio renderizado, 12/09/2026.
    const { imprimirVendasDoCliente } = await import("./documentos/relatorio-vendas-print");
    await imprimirVendasDoCliente({ tutor: "Tatyana", comandas: [KATE[0], KATE[1]] });
    const resumo = corpo.slice(corpo.indexOf("Total das vendas"), corpo.indexOf("Descritivo de cada venda"));
    const linha1016 = resumo.slice(resumo.indexOf("#1016"), resumo.indexOf("#1048"));
    expect(linha1016).toContain("PAGA");
    expect(linha1016).not.toContain("EM ABERTO");
    // e no descritivo ela continua "Paga", como sempre esteve
    const detalhe = corpo.slice(corpo.indexOf("Descritivo de cada venda"));
    expect(detalhe.slice(detalhe.indexOf("#1016"), detalhe.indexOf("#1048"))).toContain("Paga");
  });

  it("o total do resumo bate com a soma das vendas", async () => {
    const { imprimirVendasDoCliente } = await import("./documentos/relatorio-vendas-print");
    await imprimirVendasDoCliente({ tutor: "Tatyana", comandas: KATE });
    const soma = KATE.reduce((s, c) => s + c.valor, 0);
    const esperado = brl(soma);
    const resumo = corpo.slice(corpo.indexOf("Total das vendas"), corpo.indexOf("Já recebido"));
    expect(resumo).toContain(esperado);
  });
});
