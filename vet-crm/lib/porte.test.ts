import { describe, it, expect } from "vitest";
import {
  FAIXAS_PADRAO, FAIXAS_DETALHADAS, ESCADAS, escadaDasFaixas,
  faixaDoPeso, precoPorPorte, lerFaixas, ordenarFaixas, erroDasFaixas, rotuloDaFaixa,
  type FaixaPorte,
} from "./porte";

// BLINDAGEM do preço por porte.
//
// Aqui mora dinheiro: se a faixa errada for escolhida, cobra-se o valor errado e ninguém
// percebe — o sistema não erra alto, erra baixo. Estes testes travam as bordas, que é onde
// esse tipo de erro mora.
//
// As faixas da Cintia (04/09/2026) foram escritas por ela como "0 a 10 / 11 a 20 / ...". Os
// limites foram ENCOSTADOS porque o peso tem decimal: 10,0 é Pequeno; 10,1 já é Médio. Sem
// isso um cão de 10,5 kg não cairia em faixa nenhuma.

const comPreco = (precos: (number | null)[]): FaixaPorte[] =>
  FAIXAS_PADRAO.map((f, i) => ({ ...f, preco: precos[i] ?? null }));

describe("preço por porte", () => {
  describe("as bordas das faixas — onde o dinheiro se perde", () => {
    const f = FAIXAS_PADRAO;
    it.each([
      [0.5, "0 a 10 kg"], [9.9, "0 a 10 kg"], [10, "0 a 10 kg"],
      [10.1, "11 a 20 kg"], [15, "11 a 20 kg"], [20, "11 a 20 kg"],
      [20.1, "21 a 30 kg"], [30, "21 a 30 kg"],
      [30.1, "31 a 40 kg"], [40, "31 a 40 kg"],
      [40.1, "41 a 50+ kg"], [75, "41 a 50+ kg"],
    ])("%s kg cai na faixa %s", (kg, rotulo) => {
      expect(faixaDoPeso(kg, f)?.rotulo).toBe(rotulo);
    });

    // O RÓTULO diz "11 a 20", mas o que vale é o limite: a faixa pega de 10,1 em diante.
    // As faixas ENCOSTAM de propósito — senão um cão de 10,5 kg não cairia em nenhuma.
    it("10,0 fica na primeira e 10,05 já vai pra segunda — sem buraco no meio", () => {
      expect(faixaDoPeso(10.0, f)?.rotulo).toBe("0 a 10 kg");
      expect(faixaDoPeso(10.05, f)?.rotulo).toBe("11 a 20 kg");
    });

    it("cão de 55 kg tem preço — a última faixa não tem teto, apesar do rótulo dizer 50", () => {
      expect(faixaDoPeso(55, f)?.rotulo).toBe("41 a 50+ kg");
      expect(faixaDoPeso(120, f)?.rotulo).toBe("41 a 50+ kg");
    });

    it("gato de 4 kg entra na primeira faixa — gato não tem preço próprio", () => {
      expect(faixaDoPeso(4, f)?.rotulo).toBe("0 a 10 kg");
    });
  });

  describe("peso que não serve", () => {
    it.each([null, undefined, 0, -3, NaN])("%s não cai em faixa nenhuma", (kg) => {
      expect(faixaDoPeso(kg as any, FAIXAS_PADRAO)).toBeNull();
    });
  });

  describe("o item sem preço por porte continua como sempre foi", () => {
    it("devolve o preço único, sem aviso", () => {
      const r = precoPorPorte({ preco: 120, custo: 40, faixas: [] }, 18);
      expect(r.preco).toBe(120);
      expect(r.custo).toBe(40);
      expect(r.aviso).toBeNull();
      expect(r.precisaEscolher).toBe(false);
    });
    it("nem precisa do peso do animal", () => {
      expect(precoPorPorte({ preco: 120, faixas: null }, null).preco).toBe(120);
    });
  });

  describe("o Acepran de verdade — 4 preços por peso", () => {
    // Os valores são os que estão na produção hoje (itens #7, #1, #3, #5).
    const acepran = comPreco([37.57, 44.91, 51.49, 58.44, null]);
    it.each([
      [8, 37.57], [14.2, 44.91], [25, 51.49], [36, 58.44],
    ])("cão de %s kg paga %s", (kg, preco) => {
      expect(precoPorPorte({ faixas: acepran }, kg).preco).toBe(preco);
    });
    it("cão de 45 kg NÃO recebe preço inventado — o Acepran não tem Extra GG cadastrado", () => {
      const r = precoPorPorte({ faixas: acepran }, 45);
      expect(r.preco).toBeNull();
      expect(r.precisaEscolher).toBe(true);
      expect(r.aviso).toMatch(/41 a 50\+ kg/);
    });
  });

  describe("pet sem peso NÃO trava a venda", () => {
    it("pede pra escolher a faixa em vez de recusar", () => {
      const r = precoPorPorte({ faixas: comPreco([10, 20, 30, 40, 50]) }, null);
      expect(r.preco).toBeNull();
      expect(r.precisaEscolher).toBe(true);
      expect(r.aviso).toMatch(/peso do animal não está no cadastro/i);
    });
  });

  describe("a escada DETALHADA — medicação cara, de 5 em 5", () => {
    // A Cintia em 05/09: "de 5 em 5 kg pois é uma medicação muito cara". Os preços são os
    // que estão na produção hoje (Cerenia — itens #91, #79, #81, #83, #85, #87, #89).
    const cerenia: FaixaPorte[] = FAIXAS_DETALHADAS.map((f, i) =>
      ({ ...f, preco: [77.92, 91.84, 109.93, 132.19, 154.46, 262.99, 385.99][i] }));
    it.each([
      [9, 77.92], [13, 91.84], [18, 109.93], [23, 132.19], [28, 154.46], [35, 262.99], [50, 385.99],
    ])("Cerenia para %s kg custa %s", (kg, preco) => {
      expect(precoPorPorte({ faixas: cerenia }, kg).preco).toBe(preco);
    });

    it("a Fluidoterapia começa em 10 kg — animal menor não tem preço", () => {
      const fluido: FaixaPorte[] = [
        { ate: 10, rotulo: "abaixo de 10 kg", preco: null },
        { ate: 20, rotulo: "10 a 20 kg", preco: 45 },
        { ate: 30, rotulo: "20 a 30 kg", preco: 50 },
        { ate: null, rotulo: "acima de 30 kg", preco: 55 },
      ];
      expect(precoPorPorte({ faixas: fluido }, 6).preco).toBeNull();
      expect(precoPorPorte({ faixas: fluido }, 15).preco).toBe(45);
    });
  });

  describe("o custo acompanha a faixa", () => {
    it("cão maior gasta mais — sem isso a margem sai errada nos extremos", () => {
      const f: FaixaPorte[] = [
        { ate: 10, rotulo: "Pequeno", preco: 40, custo: 8 },
        { ate: null, rotulo: "Grandão", preco: 90, custo: 31 },
      ];
      expect(precoPorPorte({ faixas: f }, 7)).toMatchObject({ preco: 40, custo: 8 });
      expect(precoPorPorte({ faixas: f }, 44)).toMatchObject({ preco: 90, custo: 31 });
    });
  });

  describe("ler o que está gravado sem nunca quebrar", () => {
    it.each(["", null, undefined, "isto não é json", "{}", "[]", '"texto"', "123"])(
      "%s vira lista vazia",
      (v) => expect(lerFaixas(v as any)).toEqual([]),
    );
    it("aceita número escrito como texto (é o que o formulário manda)", () => {
      const f = lerFaixas('[{"ate":"10","rotulo":"Pequeno","preco":"37.57"}]');
      expect(f[0]).toMatchObject({ ate: 10, preco: 37.57 });
    });
    it("campo vazio no formulário vira 'sem preço', não zero — zero seria de graça", () => {
      const f = lerFaixas('[{"ate":null,"rotulo":"Extra GG","preco":"","custo":""}]');
      expect(f[0].preco).toBeNull();
      expect(f[0].custo).toBeNull();
    });
    it("a faixa sem teto vai pro fim, mesmo gravada fora de ordem", () => {
      const f = lerFaixas('[{"ate":null,"rotulo":"Extra GG","preco":9},{"ate":10,"rotulo":"Pequeno","preco":1}]');
      expect(f.map((x) => x.rotulo)).toEqual(["Pequeno", "Extra GG"]);
    });
  });

  describe("não deixa gravar faixa que deixa animal de fora", () => {
    it("sem a faixa aberta no fim, um animal muito pesado fica sem preço", () => {
      expect(erroDasFaixas([{ ate: 10, rotulo: "Pequeno", preco: 1 }])).toMatch(/última faixa/i);
    });
    it("duas faixas abertas não fazem sentido", () => {
      expect(erroDasFaixas([
        { ate: null, rotulo: "A", preco: 1 }, { ate: null, rotulo: "B", preco: 2 },
      ])).toMatch(/só a última/i);
    });
    it("dois limites iguais deixam a escolha ambígua", () => {
      expect(erroDasFaixas([
        { ate: 10, rotulo: "A", preco: 1 }, { ate: 10, rotulo: "B", preco: 2 }, { ate: null, rotulo: "C", preco: 3 },
      ])).toMatch(/20 kg|10 kg|limite diferente/i);
    });
    it("nenhum preço preenchido não serve", () => {
      expect(erroDasFaixas(comPreco([null, null, null, null, null]))).toMatch(/ao menos um preço/i);
    });
    it("as cinco faixas da Cintia, com preço, passam", () => {
      expect(erroDasFaixas(comPreco([37.57, 44.91, 51.49, 58.44, 87.66]))).toBeNull();
    });
  });

  describe("como a faixa aparece escrita", () => {
    const f = ordenarFaixas(FAIXAS_PADRAO);
    it("rótulo que já fala de peso aparece como está — sem repetir o intervalo", () => {
      expect(rotuloDaFaixa(f[0])).toBe("0 a 10 kg");
      expect(rotuloDaFaixa(f[1], f[0])).toBe("11 a 20 kg");
      expect(rotuloDaFaixa(f[4], f[3])).toBe("41 a 50+ kg");
    });
    it("rótulo por NOME ganha o intervalo junto — senão ninguém sabe onde ele começa", () => {
      expect(rotuloDaFaixa({ ate: 7.5, rotulo: "Mini", preco: 1 })).toBe("Mini · até 7,5 kg");
      expect(rotuloDaFaixa({ ate: null, rotulo: "Gigante", preco: 1 }, { ate: 40, rotulo: "x", preco: 1 }))
        .toBe("Gigante · acima de 40 kg");
    });
  });

  describe("as escadas com nome", () => {
    it("a padrão tem 5 faixas e a detalhada tem 7", () => {
      expect(FAIXAS_PADRAO).toHaveLength(5);
      expect(FAIXAS_DETALHADAS).toHaveLength(7);
    });
    it("as duas terminam sem teto — nenhum animal fica sem faixa", () => {
      for (const e of ESCADAS) expect(e.faixas[e.faixas.length - 1].ate).toBeNull();
    });
    it("as duas concordam nos limites que compartilham (10, 20, 30, 40)", () => {
      const daPadrao = FAIXAS_PADRAO.map((f) => f.ate).filter((x) => x != null);
      const daDetalhada = FAIXAS_DETALHADAS.map((f) => f.ate);
      for (const l of daPadrao) expect(daDetalhada).toContain(l);
    });
    it("reconhece qual escada um item está usando", () => {
      expect(escadaDasFaixas(FAIXAS_PADRAO)).toBe("padrao");
      expect(escadaDasFaixas(FAIXAS_DETALHADAS)).toBe("detalhada");
    });
    it("faixa montada na mão não é escada nenhuma — a Tartarectomia tem 'até 5 kg'", () => {
      expect(escadaDasFaixas([
        { ate: 5, rotulo: "até 5 kg", preco: 360 },
        { ate: null, rotulo: "acima de 5 kg", preco: 620 },
      ])).toBeNull();
    });
  });
});
