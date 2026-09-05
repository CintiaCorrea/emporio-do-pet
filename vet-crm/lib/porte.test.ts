import { describe, it, expect } from "vitest";
import {
  FAIXAS_PADRAO, faixaDoPeso, precoPorPorte, lerFaixas, ordenarFaixas, erroDasFaixas, rotuloDaFaixa,
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
      [0.5, "Pequeno"], [9.9, "Pequeno"], [10, "Pequeno"],
      [10.1, "Médio"], [15, "Médio"], [20, "Médio"],
      [20.1, "Grande"], [30, "Grande"],
      [30.1, "GG"], [40, "GG"],
      [40.1, "Extra GG"], [75, "Extra GG"],
    ])("%s kg é %s", (kg, rotulo) => {
      expect(faixaDoPeso(kg, f)?.rotulo).toBe(rotulo);
    });

    it("10,0 é Pequeno e 10,1 é Médio — as faixas encostam, sem buraco no meio", () => {
      expect(faixaDoPeso(10.0, f)?.rotulo).toBe("Pequeno");
      expect(faixaDoPeso(10.05, f)?.rotulo).toBe("Médio");
    });

    it("gato de 4 kg entra em Pequeno — gato não tem preço próprio", () => {
      expect(faixaDoPeso(4, f)?.rotulo).toBe("Pequeno");
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
      expect(r.aviso).toMatch(/Extra GG/);
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

  describe("faixas fora do padrão — o catálogo real não cabe nas cinco", () => {
    // A Cerenia tem SETE faixas na produção. Forçar as cinco obrigaria a re-precificar.
    const cerenia: FaixaPorte[] = [
      { ate: 10, rotulo: "até 10 kg", preco: 77.92 },
      { ate: 15, rotulo: "11 a 15 kg", preco: 91.84 },
      { ate: 20, rotulo: "16 a 20 kg", preco: 109.93 },
      { ate: 25, rotulo: "21 a 25 kg", preco: 132.19 },
      { ate: 30, rotulo: "26 a 30 kg", preco: 154.46 },
      { ate: 40, rotulo: "31 a 40 kg", preco: 262.99 },
      { ate: null, rotulo: "acima de 40 kg", preco: 385.99 },
    ];
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
    it("a primeira diz 'até'", () => expect(rotuloDaFaixa(f[0])).toBe("Pequeno · até 10 kg"));
    it("as do meio dizem 'de X a Y'", () => expect(rotuloDaFaixa(f[1], f[0])).toBe("Médio · 10 a 20 kg"));
    it("a última diz 'acima de'", () => expect(rotuloDaFaixa(f[4], f[3])).toBe("Extra GG · acima de 40 kg"));
    it("usa vírgula, como se escreve peso no Brasil", () => {
      expect(rotuloDaFaixa({ ate: 7.5, rotulo: "Mini", preco: 1 })).toBe("Mini · até 7,5 kg");
    });
  });
});
