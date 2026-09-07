import { describe, it, expect } from "vitest";
import { resumoDeVendas, VendaDoResumo } from "@/lib/resumoDeVendas";

const venda = (v: Partial<VendaDoResumo>): VendaDoResumo => ({ date: "2026-09-01T10:00:00", valor: 0, pago: 0, ...v });

describe("resumo de vendas: os números fecham entre si", () => {
  const vendas = [
    venda({
      id: "1", date: "2026-09-01T09:00:00", valor: 240, pago: 240, situacao: "PAGA", funcionario: "Vivian",
      itens: [{ descricao: "Consulta", quantidade: 1, valorUnitario: 150, desconto: 10, grupo: "Clínica", servicoId: "s1" },
              { descricao: "Vacina", quantidade: 1, valorUnitario: 100, desconto: 0, grupo: "Vacinas", servicoId: "s2" }],
      recebimentos: [{ valor: 240, data: "2026-09-01T18:00:00", formas: [{ forma: "Pix", valor: 240 }] }],
    }),
    venda({
      id: "2", date: "2026-09-02T09:00:00", valor: 500, pago: 200, situacao: "PARCIAL", funcionario: "Cintia",
      itens: [{ descricao: "Cirurgia", quantidade: 1, valorUnitario: 500, desconto: 0, grupo: "Cirurgias", servicoId: "s3" }],
      recebimentos: [{ valor: 200, data: "2026-09-03T10:00:00", formas: [{ forma: "Cartão", valor: 200, parcelas: 2 }] }],
    }),
    venda({
      id: "3", date: "2026-09-02T11:00:00", valor: 100, pago: 0, situacao: "ABERTA", funcionario: "Vivian",
      itens: [{ descricao: "Consulta", quantidade: 1, valorUnitario: 100, desconto: 0, grupo: "Clínica", servicoId: "s1" }],
    }),
  ];
  const r = resumoDeVendas(vendas);

  it("bruto menos desconto é exatamente o líquido", () => {
    // A conta que não fechava no sistema antigo. Aqui é por construção.
    expect(r.cards.bruto - r.cards.desconto).toBeCloseTo(r.cards.liquido, 2);
    expect(r.cards.liquido).toBe(840);
    expect(r.cards.desconto).toBe(10);
    expect(r.cards.bruto).toBe(850);
  });

  it("recebido mais a receber é o líquido", () => {
    expect(r.cards.recebido).toBe(440);
    expect(r.cards.aberto).toBe(400);
    expect(r.cards.recebido + r.cards.aberto).toBeCloseTo(r.cards.liquido, 2);
  });

  it("o quadro de situação fecha com o total — as três colunas juntas", () => {
    // No SimplesVet este quadro misturava "recebido" numas linhas e "falta" noutras, e o total
    // ficava R$ 70,26 fora de tudo. Aqui cada linha tem valor, recebido e aberto.
    const soma = (f: (l: any) => number) => r.porSituacao.reduce((s, l) => s + f(l), 0);
    expect(soma((l) => l.valor)).toBeCloseTo(r.cards.liquido, 2);
    expect(soma((l) => l.recebido)).toBeCloseTo(r.cards.recebido, 2);
    expect(soma((l) => l.aberto)).toBeCloseTo(r.cards.aberto, 2);
    expect(soma((l) => l.qtd)).toBe(3);
  });

  it("o percentual de desconto é a MESMA fórmula na linha e no total", () => {
    // Lá a coluna trocava de fórmula entre a linha e o rodapé (mostrava 5,0% onde a razão
    // era 0,22%).
    const dia1 = r.porDia.find((d) => d.dia === "2026-09-01")!;
    expect(dia1.percentual).toBeCloseTo((10 / 250) * 100, 4);
    expect(r.cards.percentualDesconto).toBeCloseTo((10 / 850) * 100, 4);
  });

  it("cada dia fecha o seu próprio saldo", () => {
    const dia2 = r.porDia.find((d) => d.dia === "2026-09-02")!;
    expect(dia2.qtd).toBe(2);
    expect(dia2.liquido).toBe(600);
    expect(dia2.recebido).toBe(200);
    expect(dia2.aberto).toBe(400);
  });

  it("os dias saem em ordem crescente", () => {
    expect(r.porDia.map((d) => d.dia)).toEqual(["2026-09-01", "2026-09-02"]);
  });

  it("a forma de recebimento guarda a parcela", () => {
    const cartao = r.porForma.find((f) => f.forma === "Cartão")!;
    expect(cartao.valor).toBe(200);
    expect(cartao.parcelas).toEqual([{ rotulo: "Parcelado 2x", valor: 200 }]);
    expect(r.porForma.reduce((s, f) => s + f.valor, 0)).toBeCloseTo(r.cards.recebido, 2);
  });

  it("a data da baixa é a do dinheiro, não a da venda", () => {
    // A venda 2 é do dia 02 e o dinheiro entrou no dia 03 — regime de caixa.
    expect(r.porDataDeBaixa).toEqual([
      { dia: "2026-09-01", valor: 240 },
      { dia: "2026-09-03", valor: 200 },
    ]);
  });

  it("agrupa por grupo e soma o item repetido entre vendas", () => {
    const clinica = r.porGrupo.find((g) => g.nome === "Clínica")!;
    expect(clinica.bruto).toBe(250);
    const consulta = r.porItem.find((i) => i.nome === "Consulta")!;
    expect(consulta.qtd).toBe(2);
    expect(consulta.bruto).toBe(250);
  });
});

describe("o cadastro sujo aparece em vez de sumir", () => {
  it("mesmo nome com códigos diferentes vira duas linhas, marcadas", () => {
    // "Sessão Pacote Fisioterapia (3701)" e "(3702)" existem de verdade no catálogo antigo.
    const r = resumoDeVendas([
      { date: "2026-09-01", valor: 100, itens: [{ descricao: "Fisioterapia", quantidade: 1, valorUnitario: 100, servicoId: "3701" }] },
      { date: "2026-09-01", valor: 100, itens: [{ descricao: "Fisioterapia", quantidade: 1, valorUnitario: 100, servicoId: "3702" }] },
    ]);
    const linhas = r.porItem.filter((i) => i.nome === "Fisioterapia");
    expect(linhas).toHaveLength(2);
    expect(linhas.every((l) => l.nomeRepetido)).toBe(true);
  });

  it("item sem id nenhum ainda é agrupado pelo nome", () => {
    const r = resumoDeVendas([
      { date: "2026-09-01", valor: 60, itens: [{ descricao: "Taxa", quantidade: 1, valorUnitario: 30 }, { descricao: "Taxa", quantidade: 1, valorUnitario: 30 }] },
    ]);
    const taxa = r.porItem.filter((i) => i.nome === "Taxa");
    expect(taxa).toHaveLength(1);
    expect(taxa[0].qtd).toBe(2);
    expect(taxa[0].nomeRepetido).toBe(false);
  });
});

describe("o desconto dado na venda inteira não some", () => {
  it("a diferença entre os itens e o cobrado aparece com nome", () => {
    // Item de R$ 200, venda cobrada por R$ 180: os R$ 20 são desconto no total da venda.
    const r = resumoDeVendas([
      { date: "2026-09-01", valor: 180, pago: 0, itens: [{ descricao: "Banho", quantidade: 1, valorUnitario: 200 }] },
    ]);
    expect(r.ajusteDeVenda).toBe(20);
    expect(r.cards.liquido).toBe(180);
  });

  it("sem desconto no total, não há ajuste nenhum", () => {
    const r = resumoDeVendas([
      { date: "2026-09-01", valor: 200, itens: [{ descricao: "Banho", quantidade: 1, valorUnitario: 200 }] },
    ]);
    expect(r.ajusteDeVenda).toBe(0);
  });
});

describe("nada de números inventados quando não há dados", () => {
  it("lista vazia dá tudo zero, sem NaN", () => {
    const r = resumoDeVendas([]);
    expect(r.cards).toMatchObject({ qtd: 0, bruto: 0, liquido: 0, recebido: 0, aberto: 0, ticket: 0, percentualDesconto: 0 });
    expect(r.porDia).toEqual([]);
    expect(r.porSituacao).toEqual([]);
  });

  it("null e lixo não quebram", () => {
    const r = resumoDeVendas(null);
    expect(r.cards.qtd).toBe(0);
    const sujo = resumoDeVendas([{ date: "2026-09-01", valor: "abc" as any, itens: [{ quantidade: "x" as any, valorUnitario: null }] }]);
    expect(sujo.cards.liquido).toBe(0);
    expect(Number.isNaN(sujo.cards.ticket)).toBe(false);
  });

  it("pagamento a maior não vira saldo negativo", () => {
    const r = resumoDeVendas([{ date: "2026-09-01", valor: 100, pago: 150 }]);
    expect(r.cards.recebido).toBe(100);
    expect(r.cards.aberto).toBe(0);
  });
});

describe("o grupo vem do NOSSO catálogo, não do campo da importação", () => {
  it("catálogo ganha do campo congelado", () => {
    // `grupo` só é preenchido pela importação do SimplesVet. Se ele mandasse, toda venda feita
    // aqui cairia em "Sem grupo" — o relatório acertaria no passado e mentiria no presente.
    const r = resumoDeVendas([
      { date: "2026-09-01", valor: 100, itens: [{ descricao: "X", quantidade: 1, valorUnitario: 100, grupo: "Importado", grupoNome: "Consultas", grupoPai: "Clínica Geral" }] },
    ]);
    expect(r.porGrupo).toHaveLength(1);
    expect(r.porGrupo[0]).toMatchObject({ nome: "Consultas", pai: "Clínica Geral" });
  });

  it("venda antiga, sem catálogo, ainda usa o campo da importação", () => {
    const r = resumoDeVendas([
      { date: "2026-09-01", valor: 100, itens: [{ descricao: "X", quantidade: 1, valorUnitario: 100, grupo: "Laboratorio" }] },
    ]);
    expect(r.porGrupo[0].nome).toBe("Laboratorio");
  });

  it("sem nenhum dos dois, cai em Sem grupo — e não some", () => {
    const r = resumoDeVendas([{ date: "2026-09-01", valor: 50, itens: [{ descricao: "X", quantidade: 1, valorUnitario: 50 }] }]);
    expect(r.porGrupo[0].nome).toBe("Sem grupo");
    expect(r.porGrupo[0].liquido).toBe(50);
  });
});

describe("tipo e convênio", () => {
  const r = resumoDeVendas([
    { date: "2026-09-01", valor: 430, itens: [
      { descricao: "Consulta", quantidade: 1, valorUnitario: 150, tipoItem: "SERVICO" },
      { descricao: "Ração", quantidade: 2, valorUnitario: 80, tipoItem: "PRODUTO" },
      { descricao: "Raio-X", quantidade: 1, valorUnitario: 120, tipoItem: "EXAME", convenio: "Petlife" },
    ] },
  ]);

  it("separa produto, serviço e exame pelo tipo do catálogo", () => {
    expect(r.porTipo.map((t) => t.nome).sort()).toEqual(["Exame", "Produto", "Serviço"]);
    expect(r.porTipo.find((t) => t.nome === "Produto")!.qtd).toBe(2);
  });

  it("item sem tipo não some: vira Não classificado", () => {
    const sem = resumoDeVendas([{ date: "2026-09-01", valor: 10, itens: [{ descricao: "?", quantidade: 1, valorUnitario: 10 }] }]);
    expect(sem.porTipo[0].nome).toBe("Não classificado");
  });

  it("o item do convênio aparece em quadro próprio", () => {
    // O convênio paga e vira a-receber mensal — não existe no SimplesVet.
    expect(r.porConvenio).toEqual([{ nome: "Petlife", itens: 1, valor: 120 }]);
  });
});
