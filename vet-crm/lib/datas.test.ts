import { describe, it, expect } from "vitest";
import { diaCalendario, fmtDataBR, hojeLocalISO, hojeNaClinicaISO, diaNaClinicaISO } from "@/lib/datas";
import * as fs from "fs";
import * as path from "path";
import { codigoDoProjeto } from "@/lib/testes/varreduraDoProjeto";

// BLINDAGEM do bug de FUSO em datas de calendário (vacina/boletim/follow-up/dose).
// O dia certo NÃO pode virar o dia anterior por causa do UTC−3.

describe("datas — fmtDataBR (data de calendário sem fuso)", () => {
  it("'AAAA-MM-DD' puro mostra o MESMO dia (não o anterior)", () => {
    expect(fmtDataBR("2026-08-23")).toBe("23/08/2026");
    expect(fmtDataBR("2026-01-01")).toBe("01/01/2026");
  });
  it("ISO à meia-noite UTC (campo DATE do banco) mostra o dia gravado, não o anterior", () => {
    expect(fmtDataBR("2026-08-23T00:00:00.000Z")).toBe("23/08/2026");
    expect(fmtDataBR("2026-08-23T00:00:00Z")).toBe("23/08/2026");
    expect(fmtDataBR("2026-08-23T00:00Z")).toBe("23/08/2026");
    expect(fmtDataBR("2026-08-23T00:00:00")).toBe("23/08/2026");
  });
  it("vazio/inválido → '—'", () => {
    expect(fmtDataBR(null)).toBe("—");
    expect(fmtDataBR("")).toBe("—");
    expect(fmtDataBR("xyz")).toBe("—");
  });
  it("diaCalendario devolve o dia local correto (getDate bate)", () => {
    expect(diaCalendario("2026-08-23")?.getDate()).toBe(23);
    expect(diaCalendario("2026-08-23T00:00:00.000Z")?.getDate()).toBe(23);
    expect(diaCalendario(null)).toBeNull();
  });
});

describe("datas — hojeLocalISO", () => {
  it("tem o formato AAAA-MM-DD", () => {
    expect(hojeLocalISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("bate com a data de hoje NA CLÍNICA (não a do UTC nem a do computador)", () => {
    // ESTE TESTE QUEBROU O DEPLOY DO FRONT EM 09/09/2026, e do jeito mais traiçoeiro: só entre
    // 21h e meia-noite de Fortaleza.
    //
    // Ele comparava com o relógio DA MÁQUINA (`new Date().getFullYear()` etc.). Na máquina da
    // clínica isso é Fortaleza e batia sempre; o CI do GitHub roda em UTC, onde depois das 21h
    // daqui já é o dia seguinte. Resultado: esperava 2026-09-10, recebia 2026-09-09, e todo
    // deploy publicado à noite falhava — enquanto os do mesmo dia, mais cedo, passavam.
    //
    // É a mesma armadilha que a função existe para impedir: usar o relógio de quem executa em
    // vez do fuso da casa. O teste caiu nela.
    const naClinica = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Fortaleza",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
    expect(hojeLocalISO()).toBe(naClinica);
  });
});

// BLINDAGEM do "virou o dia cedo demais" (Cintia, 08/09/2026: "para você já é meia noite,
// mas ainda são dez horas"). Depois das 21h em Fortaleza já é o dia seguinte em UTC — a venda
// das 22h caía no dia errado e sumia da lista do dia.
describe("o dia é o dia DA CLÍNICA, não o do UTC nem o do computador", () => {
  it("22h em Fortaleza ainda é o MESMO dia, embora em UTC já seja o seguinte", () => {
    // 2026-09-09T01:00Z = 2026-09-08 22:00 em Fortaleza (UTC−3, sem horário de verão).
    expect(diaNaClinicaISO("2026-09-09T01:00:00Z")).toBe("2026-09-08");
    expect(diaNaClinicaISO("2026-09-09T02:59:59Z")).toBe("2026-09-08");
  });

  it("passada a meia-noite de Fortaleza, aí sim o dia vira", () => {
    expect(diaNaClinicaISO("2026-09-09T03:00:00Z")).toBe("2026-09-09");
  });

  it("devolve sempre AAAA-MM-DD, que é o formato do <input type=\"date\"> e das APIs", () => {
    expect(hojeNaClinicaISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(hojeLocalISO()).toBe(hojeNaClinicaISO()); // o alias antigo segue o mesmo fuso
  });

  // 30s, e nao os 5s padrao: esta trava LE O DISCO (mil arquivos). O limite padrao e medida
  // de teste de unidade; sob execucao paralela com a trava dos centavos, a leitura passava de
  // 5s e o teste ficava vermelho sem nada de errado no codigo.
  it("nenhuma tela calcula 'hoje' em UTC", { timeout: 30000 }, () => {
    // toISOString() devolve o dia em UTC. Quem precisa do dia de hoje usa hojeNaClinicaISO().
    //
    // A VARREDURA MORA EM lib/testes/varreduraDoProjeto: em 09/09/2026 esta trava e a dos
    // centavos nasceram no mesmo dia, em abas diferentes, e as duas liam a arvore inteira. Cada
    // uma sozinha leva ~2s; juntas, disputavam o disco e uma estourava o tempo da outra — teste
    // vermelho sem nada de errado no codigo, que e o pior jeito de uma trava falhar.
    const proibido = "new Date().toISOString().slice(0, 10)";
    const achados = codigoDoProjeto(["datas.ts"])
      .filter((a) => a.src.includes(proibido))
      .map((a) => a.caminho);
    expect(achados).toEqual([]);
  });
});
