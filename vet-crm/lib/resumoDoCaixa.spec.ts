import { describe, it, expect } from "vitest";
import { montarResumoDoCaixa, avisoDoUsoDeCredito, avisoDoAdiantamento } from "@/lib/resumoDoCaixa";

const rec = (formas: any, valorTotal?: number) => ({ valorTotal: valorTotal ?? (Array.isArray(formas) ? formas.reduce((s: number, f: any) => s + (f?.valor || 0), 0) : 0), formas });
const mov = (tipo: string, valor: number, forma = "Dinheiro") => ({ tipo, valor, forma });

describe("o resumo do caixa conta o que está na gaveta", () => {
  it("separa as vendas por forma de recebimento", () => {
    const r = montarResumoDoCaixa({ recebimentos: [rec([{ forma: "Pix", valor: 100 }, { forma: "Dinheiro", valor: 50 }]), rec([{ forma: "Pix", valor: 30 }])] });
    expect(r.linhas.find((l) => l.forma === "Pix")?.vendas).toBe(130);
    expect(r.linhas.find((l) => l.forma === "Dinheiro")?.vendas).toBe(50);
    expect(r.total.vendas).toBe(180);
  });

  it("SANGRIA, DESPESA e TRANSFERÊNCIA saem do total — não ficam escondidas na outra aba", () => {
    // Era o buraco do nosso resumo: ele somava Vendas + Suprimentos e chamava de "Resultado".
    // O caixa anunciava mais dinheiro do que tinha, e a conferência saía errada.
    const r = montarResumoDoCaixa({
      suprimento: 100,
      recebimentos: [rec([{ forma: "Dinheiro", valor: 1000 }])],
      movimentos: [mov("SANGRIA", 300), mov("DESPESA", 50), mov("TRANSFERENCIA", 200)],
    });
    expect(r.total.vendas).toBe(1000);
    expect(r.total.suprimentos).toBe(100);
    expect(r.total.sangrias).toBe(300);
    expect(r.total.despesas).toBe(50);
    expect(r.total.transferencias).toBe(200);
    expect(r.total.total).toBe(550); // 1000 + 100 − 550
  });

  it("o suprimento de abertura conta como dinheiro desde o minuto zero", () => {
    const r = montarResumoDoCaixa({ suprimento: 82 });
    expect(r.linhas).toHaveLength(1);
    expect(r.linhas[0].forma).toBe("Dinheiro");
    expect(r.total.total).toBe(82);
  });

  it("recebimento antigo com formas malformadas não some — cai em Outros", () => {
    // [[]] é o que sobrou de baixas sem forma. Se o núcleo ignorasse, o caixa perderia dinheiro.
    const r = montarResumoDoCaixa({ recebimentos: [{ valorTotal: 240, formas: [[]] as any }] });
    expect(r.linhas.find((l) => l.forma === "Outros")?.vendas).toBe(240);
    expect(r.total.vendas).toBe(240);
  });

  it("forma que só explica parte do recebimento: o resto vira Outros", () => {
    const r = montarResumoDoCaixa({ recebimentos: [rec([{ forma: "Pix", valor: 40 }], 100)] });
    expect(r.linhas.find((l) => l.forma === "Pix")?.vendas).toBe(40);
    expect(r.linhas.find((l) => l.forma === "Outros")?.vendas).toBe(60);
  });
});

describe("o que NÃO é dinheiro da gaveta aparece, mas fora do total", () => {
  it("uso de crédito não soma no caixa — e é por isso que precisa estar escrito", () => {
    // A Cintia, lendo o SimplesVet: "um caixa pode exibir 'Caixa sem movimento' e ainda assim
    // ter tido quase mil reais de serviço prestado". Nós tínhamos o mesmo buraco.
    const r = montarResumoDoCaixa({ creditosUtilizados: [{ valor: 612.15 }, { valor: 325.69 }] });
    expect(r.usoDeCredito).toBeCloseTo(937.84, 2);
    expect(r.total.total).toBe(0);
    expect(avisoDoUsoDeCredito(r.usoDeCredito)).toMatch(/dinheiro entrou antes/i);
  });

  it("adiantamento aparece à parte para não ser contado duas vezes", () => {
    // O adiantamento JÁ entra como suprimento (credito.service cria o CaixaMovimento).
    // Somar de novo aqui inventaria dinheiro que não existe.
    const r = montarResumoDoCaixa({
      movimentos: [mov("SUPRIMENTO", 200)],
      creditosGerados: [{ valor: 200 }],
    });
    expect(r.total.suprimentos).toBe(200);
    expect(r.total.total).toBe(200);
    expect(r.adiantamentos).toBe(200);
    expect(avisoDoAdiantamento(200)).toMatch(/já está somado em Suprimentos/i);
  });

  it("sem crédito nenhum, nenhum aviso aparece", () => {
    expect(avisoDoUsoDeCredito(0)).toBeNull();
    expect(avisoDoAdiantamento(0)).toBeNull();
  });
});

describe("o núcleo nunca soma calado", () => {
  it("tipo de movimento desconhecido é contado como saída E denunciado", () => {
    // Se amanhã alguém criar um tipo novo e esquecer daqui, o dinheiro não some sem aviso: sai
    // do total (o comportamento seguro) e a tela recebe o nome do tipo para mostrar.
    const r = montarResumoDoCaixa({ suprimento: 500, movimentos: [mov("DEVOLUCAO", 120)] });
    expect(r.total.outras).toBe(120);
    expect(r.total.total).toBe(380);
    expect(r.tiposDesconhecidos).toEqual(["DEVOLUCAO"]);
  });

  it("caixa vazio não quebra e não inventa linha", () => {
    const r = montarResumoDoCaixa(null);
    expect(r.linhas).toEqual([]);
    expect(r.total.total).toBe(0);
    expect(r.tiposDesconhecidos).toEqual([]);
  });

  it("valor sujo (null, texto) vale zero em vez de virar NaN", () => {
    // NaN numa tela de dinheiro vira "R$ NaN" e ninguém sabe de onde veio.
    const r = montarResumoDoCaixa({ suprimento: "abc" as any, movimentos: [mov("SANGRIA", null as any)] });
    expect(r.total.total).toBe(0);
    expect(Number.isNaN(r.total.total)).toBe(false);
  });
});

// 🛡️ A TELA DO CAIXA USA ESTE NÚCLEO — e mostra o que não é dinheiro da gaveta.
describe("o resumo da tela não volta a esconder saída nem crédito", () => {
  const ler = () => require("fs").readFileSync(
    require("path").resolve(__dirname, "..", "app/(user)/dashboard/erp/caixa/page.tsx"), "utf8");

  it("a conta vem do núcleo, não é refeita na tela", () => {
    const src = ler();
    expect(src).toContain("montarResumoDoCaixa");
    // A soma antiga ("Resultado" = vendas + suprimentos) não pode voltar a viver no JSX.
    expect(src).not.toContain("v.vendas + v.sup");
  });

  it("as colunas de saída existem na tabela", () => {
    const src = ler();
    for (const col of ["Sangrias", "Despesas", "Transferências"]) expect(src).toContain(`>${col}<`);
  });

  it("uso de crédito e adiantamento aparecem, fora do total", () => {
    const src = ler();
    expect(src).toContain("Fora do total do caixa");
    expect(src).toContain("avisoDoUsoDeCredito");
    expect(src).toContain("avisoDoAdiantamento");
  });

  it("o backend manda os créditos gerados — senão a linha nasce sempre vazia", () => {
    const api = require("fs").readFileSync(
      require("path").resolve(__dirname, "../..", "backend/src/modules/caixa/caixa.service.ts"), "utf8");
    expect(api).toContain("creditosGerados");
  });
});
