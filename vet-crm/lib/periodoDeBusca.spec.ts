import { describe, it, expect } from "vitest";
import { faixaDoPreset, presetDaFaixa, rotuloDoPeriodo, ehDiaUnico, somarDias, ultimoDiaDoMes, ordenar, hojeNaCasa } from "@/lib/periodoDeBusca";
import { hojeNaClinicaISO } from "@/lib/datas";

const HOJE = "2026-09-08";

describe("os atalhos de período", () => {
  it("hoje e ontem são um dia só", () => {
    expect(faixaDoPreset("HOJE", HOJE)).toEqual({ de: "2026-09-08", ate: "2026-09-08" });
    expect(faixaDoPreset("ONTEM", HOJE)).toEqual({ de: "2026-09-07", ate: "2026-09-07" });
  });

  it("últimos 7 dias contam HOJE — sete dias, não oito", () => {
    expect(faixaDoPreset("D7", HOJE)).toEqual({ de: "2026-09-02", ate: "2026-09-08" });
  });

  it("este mês vai do dia 1 ao último dia do mês", () => {
    expect(faixaDoPreset("MES", HOJE)).toEqual({ de: "2026-09-01", ate: "2026-09-30" });
  });

  it("mês anterior fecha certo em março, que aponta para fevereiro", () => {
    // 2026 não é bissexto: fevereiro tem 28. É o caso que uma tabela decorada erra.
    expect(faixaDoPreset("MES_ANTERIOR", "2026-03-15")).toEqual({ de: "2026-02-01", ate: "2026-02-28" });
    expect(faixaDoPreset("MES_ANTERIOR", "2024-03-15")).toEqual({ de: "2024-02-01", ate: "2024-02-29" });
  });

  it("mês anterior vira o ano quando estamos em janeiro", () => {
    expect(faixaDoPreset("MES_ANTERIOR", "2026-01-10")).toEqual({ de: "2025-12-01", ate: "2025-12-31" });
  });

  it("este mês no dia 1º ainda começa no dia 1º", () => {
    expect(faixaDoPreset("MES", "2026-09-01").de).toBe("2026-09-01");
  });

  it("escolher período mantém o que a pessoa já tinha", () => {
    const atual = { de: "2026-08-01", ate: "2026-08-31" };
    expect(faixaDoPreset("PERSONALIZADO", HOJE, atual)).toEqual(atual);
  });
});

describe("somar dias não escorrega no fuso nem no fim do mês", () => {
  it("atravessa mês e ano", () => {
    expect(somarDias("2026-08-31", 1)).toBe("2026-09-01");
    expect(somarDias("2026-01-01", -1)).toBe("2025-12-31");
    expect(somarDias("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("o último dia do mês é calculado, não decorado", () => {
    expect(ultimoDiaDoMes(2026, 2)).toBe(28);
    expect(ultimoDiaDoMes(2024, 2)).toBe(29);
    expect(ultimoDiaDoMes(2026, 4)).toBe(30);
    expect(ultimoDiaDoMes(2026, 12)).toBe(31);
  });
});

describe("o botão do período se explica", () => {
  it("mostra o atalho quando a faixa é exatamente a dele", () => {
    expect(rotuloDoPeriodo({ de: HOJE, ate: HOJE }, HOJE)).toBe("Hoje");
    expect(rotuloDoPeriodo({ de: "2026-09-02", ate: HOJE }, HOJE)).toBe("Últimos 7 dias");
  });
  it("um dia solto mostra a data em português", () => {
    expect(rotuloDoPeriodo({ de: "2026-07-23", ate: "2026-07-23" }, HOJE)).toBe("23/07/2026");
  });
  it("um período solto mostra as duas pontas", () => {
    expect(rotuloDoPeriodo({ de: "2026-07-01", ate: "2026-07-23" }, HOJE)).toBe("01/07/2026 até 23/07/2026");
  });
  it("presetDaFaixa reconhece o que é atalho e o que não é", () => {
    expect(presetDaFaixa({ de: "2026-09-07", ate: "2026-09-07" }, HOJE)).toBe("ONTEM");
    expect(presetDaFaixa({ de: "2026-07-01", ate: "2026-07-23" }, HOJE)).toBe("PERSONALIZADO");
  });
});

describe("o navegador de dia", () => {
  it("só existe quando o período é um dia — ela descreveu assim", () => {
    expect(ehDiaUnico({ de: HOJE, ate: HOJE })).toBe(true);
    expect(ehDiaUnico({ de: "2026-09-01", ate: HOJE })).toBe(false);
    expect(ehDiaUnico({ de: "", ate: "" })).toBe(false);
  });
});

describe("datas trocadas não devolvem lista vazia", () => {
  it("quem põe 'de' depois de 'até' recebe o período certo mesmo assim", () => {
    expect(ordenar({ de: "2026-09-30", ate: "2026-09-01" })).toEqual({ de: "2026-09-01", ate: "2026-09-30" });
    expect(ordenar({ de: "2026-09-01", ate: "2026-09-30" })).toEqual({ de: "2026-09-01", ate: "2026-09-30" });
  });
});

describe("o dia da casa é UM só", () => {
  it("este arquivo não tem mais o seu próprio 'hoje' — ele usa o de lib/datas", () => {
    // Em 09/09/2026 as duas frentes criaram, no mesmo dia, dois núcleos para a mesma ideia.
    // Não chegaram a discordar, mas é o padrão que a Cintia vinha apontando: a mesma pergunta
    // com duas respostas na mesma casa. Ela decidiu: "pode deixar um só". Ficou o de lá, que
    // tinha 23 telas usando contra 3 daqui.
    expect(hojeNaCasa).toBe(hojeNaClinicaISO);
  });

  it("e continua devolvendo o dia no formato que os campos de data aceitam", () => {
    expect(hojeNaCasa()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
