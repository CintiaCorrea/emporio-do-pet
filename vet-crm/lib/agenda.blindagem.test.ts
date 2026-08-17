import { describe, it, expect } from "vitest";
import { corServico, corConfirmacao, estagioIdx, ESTAGIOS, PREV_STATUS, ehArtefato, layoutSobreposicao, posicaoCard, agendaDoDia } from "@/lib/agenda";

// BLINDAGEM da AGENDA (grade do dia). Trava o que foi corrigido/aprovado no redesenho:
// - encaixe no box (horário quebrado não vaza), sobreposição lado-a-lado, estágios,
//   cor por serviço, cor FIXA de confirmação (verde/vermelho) e o filtro do dia (sem lixo).

describe("agenda — estagioIdx (status → estágio do card)", () => {
  it("Agendado/Confirmado caem no estágio 0", () => {
    expect(estagioIdx("Agendado")).toBe(0);
    expect(estagioIdx("Confirmado")).toBe(0);
    expect(estagioIdx(undefined)).toBe(0);
  });
  it("Em espera/Aguardando = 1, Em atendimento = 2", () => {
    expect(estagioIdx("Em espera")).toBe(1);
    expect(estagioIdx("Aguardando")).toBe(1);
    expect(estagioIdx("Em atendimento")).toBe(2);
  });
  it("Atendido/Concluído/Realizado = 3 (último)", () => {
    expect(estagioIdx("Atendido")).toBe(3);
    expect(estagioIdx("Concluído")).toBe(3);
    expect(estagioIdx("Realizado")).toBe(3);
    expect(estagioIdx("Animal pronto")).toBe(3);
  });
  it("avançar/retroceder são coerentes com os índices", () => {
    // o próximo de cada estágio bate com o status do estágio seguinte no fluxo
    expect(ESTAGIOS[0].next).toBe("Em espera");
    expect(ESTAGIOS[2].next).toBe("Atendido");
    expect(ESTAGIOS[3].next).toBeNull(); // último não avança
    expect(PREV_STATUS[estagioIdx("Em espera")]).toBe("Agendado");
    expect(PREV_STATUS[0]).toBeNull(); // primeiro não retrocede
  });
});

describe("agenda — corConfirmacao (borda FIXA do card)", () => {
  it("confirmou = verde, remarcar = vermelho", () => {
    expect(corConfirmacao("CONFIRMADO")).toBe("#0F6E56");
    expect(corConfirmacao("REMARCAR")).toBe("#A32D2D");
  });
  it("sem confirmação (enviada/vazio) = sem cor fixa (usa cor do serviço)", () => {
    expect(corConfirmacao("ENVIADA")).toBeNull();
    expect(corConfirmacao(undefined)).toBeNull();
    expect(corConfirmacao("")).toBeNull();
  });
});

describe("agenda — corServico (fundo pastel por tipo)", () => {
  it("é estável (mesmo tipo → mesma cor) e ignora caixa/espaços", () => {
    expect(corServico("Consulta")).toBe(corServico("  consulta "));
    expect(corServico("Vacina")).toBe(corServico("vacina"));
  });
  it("sempre devolve uma cor da paleta", () => {
    for (const t of ["Consulta", "Vacina", "Fisioterapia", "", undefined as any]) {
      expect(corServico(t)).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });
});

describe("agenda — ehArtefato (não são agendamentos de verdade)", () => {
  it("documento/receita/peso/venda/observação são artefatos", () => {
    expect(ehArtefato("Documento")).toBe(true);
    expect(ehArtefato("Receita")).toBe(true);
    expect(ehArtefato("Receitas")).toBe(true);
    expect(ehArtefato("Peso")).toBe(true);
    expect(ehArtefato("Venda")).toBe(true);
    expect(ehArtefato("Observação")).toBe(true);
  });
  it("consulta/vacina/fisio NÃO são artefatos", () => {
    expect(ehArtefato("Consulta")).toBe(false);
    expect(ehArtefato("Vacina")).toBe(false);
    expect(ehArtefato("Fisioterapia")).toBe(false);
  });
});

describe("agenda — posicaoCard (encaixe no box)", () => {
  const hIni = 8, slot = 30, pxMin = 100 / 30;
  it("horário redondo encaixa exatamente na linha (09:00, hIni 08)", () => {
    const { top } = posicaoCard("2026-08-12T09:00:00", 30, hIni, slot, pxMin);
    expect(top).toBeCloseTo(60 * pxMin, 5); // 60 min depois do início
  });
  it("horário QUEBRADO (09:33) encaixa na linha mais próxima (09:30), não vaza", () => {
    const redondo = posicaoCard("2026-08-12T09:30:00", 30, hIni, slot, pxMin);
    const quebrado = posicaoCard("2026-08-12T09:33:00", 30, hIni, slot, pxMin);
    expect(quebrado.top).toBe(redondo.top); // 09:33 e 09:30 no MESMO box
  });
  it("duração vira múltiplo de slot e tem altura mínima legível", () => {
    const curto = posicaoCard("2026-08-12T09:00:00", 10, hIni, slot, pxMin); // 10min < 1 slot
    expect(curto.height).toBeGreaterThanOrEqual(34); // nunca some
    const uma = posicaoCard("2026-08-12T09:00:00", 60, hIni, slot, pxMin);
    expect(uma.height).toBeCloseTo(60 * pxMin - 3, 5); // 2 slots
  });
});

describe("agenda — layoutSobreposicao (colisão fica lado a lado)", () => {
  it("dois no mesmo horário → 2 faixas (cols=2), tracks diferentes", () => {
    const r = layoutSobreposicao([
      { id: "a", date: "2026-08-12T09:00:00", duration: 30 },
      { id: "b", date: "2026-08-12T09:00:00", duration: 30 },
    ]);
    expect(r.every((x) => x.cols === 2)).toBe(true);
    expect(new Set(r.map((x) => x.track)).size).toBe(2);
  });
  it("horários que NÃO colidem ficam na mesma faixa (cols=1)", () => {
    const r = layoutSobreposicao([
      { id: "a", date: "2026-08-12T09:00:00", duration: 30 },
      { id: "b", date: "2026-08-12T09:30:00", duration: 30 },
    ]);
    expect(r.every((x) => x.cols === 1 && x.track === 0)).toBe(true);
  });
  it("colisão parcial (09:00-10:00 e 09:30-10:00) divide em 2", () => {
    const r = layoutSobreposicao([
      { id: "a", date: "2026-08-12T09:00:00", duration: 60 },
      { id: "b", date: "2026-08-12T09:30:00", duration: 30 },
    ]);
    expect(Math.max(...r.map((x) => x.cols))).toBe(2);
  });
});

describe("agenda — agendaDoDia (mesma regra do Dia, sem lixo)", () => {
  const base = [
    { id: "1", date: "2026-08-12T10:00:00", status: "Agendado", type: "Consulta" },
    { id: "2", date: "2026-08-12T09:00:00", status: "Confirmado", type: "Vacina" },
    { id: "3", date: "2026-08-12T11:00:00", status: "Cancelado", type: "Consulta" },
    { id: "4", date: "2026-08-12T12:00:00", status: "Remarcado", type: "Consulta" },
    { id: "5", date: "2026-08-12T13:00:00", status: "Agendado", type: "Documento" }, // artefato
    { id: "1", date: "2026-08-12T10:00:00", status: "Agendado", type: "Consulta" }, // duplicado
    { id: "6", date: "2026-08-11T10:00:00", status: "Agendado", type: "Consulta" }, // outro dia
  ];
  it("tira cancelado, remarcado, artefato, duplicado e outros dias", () => {
    const r = agendaDoDia(base, "2026-08-12");
    expect(r.map((a) => a.id)).toEqual(["2", "1"]); // só válidos do dia, ordenados por hora
  });
  it("vem ordenado por horário (09h antes de 10h)", () => {
    const r = agendaDoDia(base, "2026-08-12");
    expect(new Date(r[0].date).getHours()).toBeLessThan(new Date(r[1].date).getHours());
  });
  it("dia sem nada devolve lista vazia (sem quebrar)", () => {
    expect(agendaDoDia(base, "2026-01-01")).toEqual([]);
    expect(agendaDoDia([], "2026-08-12")).toEqual([]);
  });
});
