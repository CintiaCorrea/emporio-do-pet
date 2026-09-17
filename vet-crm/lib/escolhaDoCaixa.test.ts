import { describe, it, expect } from "vitest";
import { escolhaDoCaixa } from "./escolhaDoCaixa";

// O CASO REAL, com os números do banco (10/09/2026). A Maria Gabriela estava com cinco caixas
// abertos porque os dias 01 a 04 tinham sido reabertos para lançar as baixas atrasadas. A venda
// #1177 (Josiane · Cueia) é do dia 03 e foi parar no caixa do dia 10.
//
// Meia-noite de Fortaleza é 03:00 UTC: um caixa aberto às 09:00 de Fortaleza no dia 3 está
// gravado como 12:00Z do dia 3. Os testes usam esse formato de propósito — é o que vem do banco.
const CAIXAS_DA_GABRIELA = [
  { id: "c2", numero: 2, abertura: "2026-09-01T12:00:00.000Z" },
  { id: "c4", numero: 4, abertura: "2026-09-02T12:00:00.000Z" },
  { id: "c8", numero: 8, abertura: "2026-09-03T12:00:00.000Z" },
  { id: "c11a", numero: 11, abertura: "2026-09-04T12:00:00.000Z" },
  { id: "c11b", numero: 11, abertura: "2026-09-10T15:00:00.000Z" },
];
const HOJE = "2026-09-10";

describe("escolhaDoCaixa", () => {
  it("com um caixa só, não pergunta nada", () => {
    const e = escolhaDoCaixa([{ id: "c11b", numero: 11, abertura: "2026-09-10T15:00:00.000Z" }], "2026-09-10T14:00:00.000Z", HOJE);
    expect(e.precisaEscolher).toBe(false);
    expect(e.sugeridoId).toBe("c11b");
    expect(e.aviso).toBeNull();
  });

  it("sem caixa aberto, não há escolha nem sugestão", () => {
    const e = escolhaDoCaixa([], "2026-09-10T14:00:00.000Z", HOJE);
    expect(e.opcoes).toEqual([]);
    expect(e.sugeridoId).toBeNull();
    expect(e.precisaEscolher).toBe(false);
  });

  it("com vários, sugere o de HOJE — o dinheiro que entra agora é de hoje", () => {
    const e = escolhaDoCaixa(CAIXAS_DA_GABRIELA, "2026-09-10T14:00:00.000Z", HOJE);
    expect(e.precisaEscolher).toBe(true);
    expect(e.sugeridoId).toBe("c11b");
    // Venda de hoje, caixa de hoje: não há nada de estranho para avisar.
    expect(e.aviso).toBeNull();
  });

  it("lista o mais recente primeiro, e marca qual é o de hoje", () => {
    const e = escolhaDoCaixa(CAIXAS_DA_GABRIELA, null, HOJE);
    expect(e.opcoes.map((o) => o.id)).toEqual(["c11b", "c11a", "c8", "c4", "c2"]);
    expect(e.opcoes[0].ehDeHoje).toBe(true);
    expect(e.opcoes[0].rotulo).toBe("nº 11 · hoje");
    expect(e.opcoes[2].rotulo).toBe("nº 8 · 03/09");
  });

  it("A VENDA DE OUTRO DIA AVISA — este é o caso da #1177", () => {
    const e = escolhaDoCaixa(CAIXAS_DA_GABRIELA, "2026-09-03T17:00:00.000Z", HOJE);
    // O sugerido continua sendo o de hoje: quem decide se o dinheiro entrou no dia 3
    // ou está entrando agora é a recepção, não o sistema.
    expect(e.sugeridoId).toBe("c11b");
    expect(e.aviso).toBe("Esta venda é de 03/09 e você tem o caixa nº 8 aberto naquele dia.");
    expect(e.opcoes.find((o) => o.id === "c8")!.ehDoDiaDaVenda).toBe(true);
  });

  it("venda de outro dia SEM caixa daquele dia: não inventa aviso", () => {
    const e = escolhaDoCaixa(CAIXAS_DA_GABRIELA, "2026-08-20T17:00:00.000Z", HOJE);
    expect(e.sugeridoId).toBe("c11b");
    expect(e.aviso).toBeNull();
  });

  it("sem caixa de hoje, sugere o mais recente que existe", () => {
    const semHoje = CAIXAS_DA_GABRIELA.filter((c) => c.id !== "c11b");
    const e = escolhaDoCaixa(semHoje, "2026-09-10T14:00:00.000Z", HOJE);
    expect(e.sugeridoId).toBe("c11a");
    expect(e.opcoes[0].ehDeHoje).toBe(false);
  });

  it("a borda da meia-noite de Fortaleza: 02:00Z ainda é o dia anterior na clínica", () => {
    // 10/09 02:00Z = 09/09 23:00 em Fortaleza. Esse caixa é do dia 9, não do dia 10.
    const e = escolhaDoCaixa([{ id: "x", numero: 30, abertura: "2026-09-10T02:00:00.000Z" }], null, HOJE);
    expect(e.opcoes[0].dia).toBe("2026-09-09");
    expect(e.opcoes[0].ehDeHoje).toBe(false);
  });
});

// O CASO DE 17/09/2026: a Cintia (administrativo, sem caixa próprio) quer lançar a #1177, do dia
// 03/09, num dos caixas que já estão abertos. Os números e donos são os do banco.
import { escolhaDeQualquerCaixa } from "./escolhaDoCaixa";

const ABERTOS_EM_SETEMBRO = [
  { id: "v31", numero: 31, abertura: "2026-09-17T15:00:00.000Z", operadorNome: "Victoria Sharon" },
  { id: "g8", numero: 8, abertura: "2026-09-03T12:00:00.000Z", operadorNome: "Maria Gabriela da Cruz Araujo" },
  { id: "g2", numero: 2, abertura: "2026-09-01T12:00:00.000Z", operadorNome: "Maria Gabriela da Cruz Araujo" },
  { id: "v1", numero: 1, abertura: "2026-09-01T12:00:00.000Z", operadorNome: "Victoria Sharon" },
];

describe("escolhaDeQualquerCaixa (administrativo)", () => {
  const e = escolhaDeQualquerCaixa(ABERTOS_EM_SETEMBRO, "2026-09-03T13:00:00.000Z", "2026-09-17");

  it("mostra os caixas de todas as pessoas, agrupados por dia, do mais antigo ao mais novo", () => {
    expect(e.dias.map((d) => d.rotulo)).toEqual(["01/09", "03/09", "hoje (17/09)"]);
    expect(e.dias[0].opcoes.map((o) => o.rotulo)).toEqual(["nº 1 · Victoria Sharon", "nº 2 · Maria Gabriela"]);
  });

  it("destaca o caixa do dia da venda, sem escolher por ela", () => {
    expect(e.doDiaDaVenda.map((o) => o.id)).toEqual(["g8"]);
    expect(e).not.toHaveProperty("sugeridoId");
  });

  it("sem caixa aberto, não há o que mostrar", () => {
    expect(escolhaDeQualquerCaixa([], null, "2026-09-17")).toEqual({ dias: [], doDiaDaVenda: [] });
  });
});
