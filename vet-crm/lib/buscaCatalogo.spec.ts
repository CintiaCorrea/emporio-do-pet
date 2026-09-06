import { describe, it, expect } from "vitest";
import { normalizar, termosDaBusca, nota, buscarItens, avisoDeCorte } from "./buscaCatalogo";

// Cada teste aqui é uma digitada real da recepção que ANTES não achava nada.
// Se algum voltar a falhar, é o item sumindo da venda de novo.

const nomeDe = (s: { nome: string }) => s.nome;
const cat = (...nomes: string[]) => nomes.map((nome, id) => ({ id: String(id), nome }));

describe("normalizar", () => {
  it("tira acento", () => {
    expect(normalizar("Antirrábica")).toBe("antirrabica");
    expect(normalizar("Solução Fisiológica")).toBe("solucao fisiologica");
    expect(normalizar("Medicação")).toBe("medicacao");
    expect(normalizar("Ácido Úrico")).toBe("acido urico");
    expect(normalizar("Cães e Gatos")).toBe("caes e gatos");
  });
  it("tira caixa e espaço sobrando", () => {
    expect(normalizar("  ACEPRAN   2mg ")).toBe("acepran 2mg");
  });
  it("aguenta vazio, nulo e número", () => {
    expect(normalizar(null)).toBe("");
    expect(normalizar(undefined)).toBe("");
    expect(normalizar(10)).toBe("10");
  });
});

describe("termosDaBusca", () => {
  it("quebra em pedaços", () => {
    expect(termosDaBusca("amox 500")).toEqual(["amox", "500"]);
    expect(termosDaBusca("  fisio   pl  ")).toEqual(["fisio", "pl"]);
    expect(termosDaBusca("")).toEqual([]);
  });
});

describe("nota", () => {
  it("dá 100 quando o nome começa com o que foi digitado", () => {
    expect(nota("Acepran 2mg", ["acepran"])).toBe(100);
  });
  it("dá 80 quando começa uma palavra do meio", () => {
    expect(nota("06 - PL Fisio", ["fisio"])).toBe(80);
  });
  it("dá 60 quando está no meio de uma palavra", () => {
    expect(nota("Acepran", ["epran"])).toBe(60);
  });
  it("dá 0 quando falta um dos pedaços", () => {
    expect(nota("Acepran 2mg", ["acepran", "vacina"])).toBe(0);
  });
  it("ignora acento dos dois lados", () => {
    // Os pedaços sempre vêm de termosDaBusca, que já normaliza o que a pessoa digitou.
    expect(nota("Vacina Antirrábica", termosDaBusca("antirrabica"))).toBeGreaterThan(0);
    expect(nota("Vacina Antirrabica", termosDaBusca("antirrábica"))).toBeGreaterThan(0);
  });
});

describe("as digitadas que antes não achavam nada", () => {
  it("sem acento acha o item acentuado", () => {
    const r = buscarItens(cat("Vacina Antirrábica", "Consulta"), "antirrabica", nomeDe);
    expect(r.itens.map((i) => i.nome)).toEqual(["Vacina Antirrábica"]);
  });

  it("palavra fora de ordem acha o item", () => {
    // Este é o caso do catálogo dela: o nome começa por número, então quem procura por
    // "fisio" nunca chegava no começo do texto.
    const r = buscarItens(cat("06 - PL Fisio", "08 - PL Fisio", "Consulta"), "fisio pl", nomeDe);
    expect(r.itens.map((i) => i.nome)).toEqual(["06 - PL Fisio", "08 - PL Fisio"]);
  });

  it("pedaços soltos acham o nome comprido", () => {
    const r = buscarItens(cat("Amoxicilina + Clavulanato de Potássio 500mg"), "amox clav", nomeDe);
    expect(r.total).toBe(1);
  });

  it("o número do item também é um pedaço", () => {
    const r = buscarItens(cat("06 - PL Fisio", "10 - PL Fisio", "12 - PL Fisio"), "10 fisio", nomeDe);
    expect(r.itens.map((i) => i.nome)).toEqual(["10 - PL Fisio"]);
  });

  it("com o nome inteiro digitado, ele vem em primeiro", () => {
    const r = buscarItens(cat("Consulta de Retorno", "Consulta", "Reconsulta"), "consulta", nomeDe);
    expect(r.itens[0].nome).toBe("Consulta");
  });
});

describe("o corte da lista", () => {
  it("mostra 40 por padrão e diz quantos ficaram de fora", () => {
    const muitos = cat(...Array.from({ length: 55 }, (_, i) => `Vacina ${i}`));
    const r = buscarItens(muitos, "vacina", nomeDe);
    expect(r.itens).toHaveLength(40);
    expect(r.total).toBe(55);
    expect(r.escondidos).toBe(15);
    expect(avisoDeCorte(r)).toContain("+15");
  });

  it("não avisa nada quando coube tudo", () => {
    const r = buscarItens(cat("Consulta", "Consulta de Retorno"), "consulta", nomeDe);
    expect(r.escondidos).toBe(0);
    expect(avisoDeCorte(r)).toBe("");
  });

  it("busca vazia não devolve nada — a lista fecha", () => {
    const r = buscarItens(cat("Consulta"), "   ", nomeDe);
    expect(r).toEqual({ itens: [], total: 0, escondidos: 0 });
  });
});

describe("o campo do nome muda de tela pra tela", () => {
  it("produto do catálogo antigo usa 'name'", () => {
    const produtos = [{ id: "1", name: "Ração Premium" }];
    const r = buscarItens(produtos, "racao", (p) => p.name);
    expect(r.total).toBe(1);
  });
  it("item sem nome não quebra a busca", () => {
    const r = buscarItens([{ id: "1" }, { id: "2", nome: "Consulta" }] as any[], "consulta", (s: any) => s.nome);
    expect(r.total).toBe(1);
  });
});
