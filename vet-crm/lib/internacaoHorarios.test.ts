import { describe, it, expect } from "vitest";
import {
  minutosDaFrequencia, calcularHorarios, horariosDaPrescricao, prescricaoAtivaEm,
  rotuloDoPeriodo, minutosDoHorario, MAX_HORARIOS_DIA,
} from "./internacaoHorarios";

// BLINDAGEM DOS HORÁRIOS DA INTERNAÇÃO.
//
// Aqui mora alerta clínico. Alerta que não dispara na hora certa é pior do que alerta
// nenhum, porque a equipe confia nele e para de conferir por conta própria.
//
// O bug que motivou este arquivo (05/09/2026): a conta só entendia HORAS. "15 minutos" não
// casava com a expressão, virava 0, e o sistema não gerava horário nenhum — sem erro, sem
// aviso. Paciente grave que precisava de aferição de 15 em 15 minutos ficava sem lembrete.

describe("horários da internação", () => {
  describe("lendo a frequência", () => {
    it.each([
      ["4/4h", 240], ["6/6h", 360], ["8/8h", 480], ["12/12h", 720],
      ["24h (1x ao dia)", 1440], ["10/10h", 600], ["48h", 2880],
      ["1h", 60], ["1 hora", 60], ["12 h", 720], ["de 6 em 6 horas", 360],
    ])('"%s" = %s minutos', (txt, min) => expect(minutosDaFrequencia(txt)).toBe(min));

    it.each([
      ["15 min", 15], ["15min", 15], ["30 minutos", 30], ["20/20min", 20],
      ["de 20 em 20 minutos", 20], ["45 min", 45],
    ])('"%s" = %s minutos — era isto que faltava', (txt, min) =>
      expect(minutosDaFrequencia(txt)).toBe(min));

    it.each([["1x ao dia", 1440], ["2x ao dia", 720], ["3x ao dia", 480], ["4x por dia", 360]])(
      '"%s" = %s minutos', (txt, min) => expect(minutosDaFrequencia(txt)).toBe(min));

    it.each(["se necessário", "SOS", "quando necessário", "contínua", "livre demanda", ""])(
      '"%s" não tem hora marcada — e isso é de propósito', (txt) =>
        expect(minutosDaFrequencia(txt)).toBe(0));

    it("minuto ganha de hora quando o texto traz os dois — 'a cada 90 min' não é 90 horas", () => {
      expect(minutosDaFrequencia("a cada 90 min")).toBe(90);
    });
  });

  describe("montando os horários do dia", () => {
    it("06:00 de 8 em 8 horas — o caso de sempre, que não pode mudar", () => {
      expect(calcularHorarios("06:00", "8/8h")).toEqual(["06:00", "14:00", "22:00"]);
    });
    it("22:00 de 8 em 8 horas vira a madrugada do dia seguinte", () => {
      expect(calcularHorarios("22:00", "8/8h")).toEqual(["22:00", "06:00", "14:00"]);
    });
    it("de 15 em 15 minutos dá 96 horários no dia", () => {
      const h = calcularHorarios("06:00", "15 min");
      expect(h).toHaveLength(96);
      expect(h.slice(0, 5)).toEqual(["06:00", "06:15", "06:30", "06:45", "07:00"]);
    });
    it("de hora em hora dá 24", () => {
      expect(calcularHorarios("00:00", "1h")).toHaveLength(24);
    });
    it("sem primeira hora não inventa nada", () => {
      expect(calcularHorarios("", "8/8h")).toEqual([]);
      expect(calcularHorarios("banana", "8/8h")).toEqual([]);
    });
    it("hora impossível não passa", () => {
      expect(minutosDoHorario("25:00")).toBeNull();
      expect(minutosDoHorario("10:70")).toBeNull();
      expect(calcularHorarios("25:00", "8/8h")).toEqual([]);
    });
    it("engano de digitação não gera 1.440 alertas", () => {
      expect(calcularHorarios("06:00", "1 min")).toEqual([]);
      expect(calcularHorarios("06:00", "5 min")).toEqual([]);
      expect(calcularHorarios("06:00", "15 min").length).toBeLessThanOrEqual(MAX_HORARIOS_DIA);
    });
  });

  describe("prescrição pontual — a que não repete", () => {
    it("dose única acontece uma vez e pronto", () => {
      expect(horariosDaPrescricao({ primeira: "14:00", frequencia: "8/8h", periodoTipo: "UNICA" }))
        .toEqual(["14:00"]);
    });
    it("a frequência é ignorada na dose única — mesmo se alguém preencheu", () => {
      expect(horariosDaPrescricao({ primeira: "14:00", frequencia: "4/4h", periodoTipo: "UNICA" }))
        .toHaveLength(1);
    });
    it("sem período escolhido, repete como sempre repetiu", () => {
      expect(horariosDaPrescricao({ primeira: "06:00", frequencia: "8/8h" }))
        .toEqual(["06:00", "14:00", "22:00"]);
    });
  });

  describe("por quantos dias a prescrição vale", () => {
    const criadaEm = "2026-09-05T08:00:00-03:00";
    const dia = (n: number) => new Date(2026, 8, 5 + n, 10, 0, 0);

    it("dose única vale só no dia em que foi prescrita", () => {
      const p = { periodoTipo: "UNICA", criadaEm };
      expect(prescricaoAtivaEm(p, dia(0))).toBe(true);
      expect(prescricaoAtivaEm(p, dia(1))).toBe(false);
      expect(prescricaoAtivaEm(p, dia(7))).toBe(false);
    });
    it("por 3 dias vale hoje, amanhã e depois — e para no quarto", () => {
      const p = { periodoTipo: "DIAS", periodoDias: 3, criadaEm };
      expect([0, 1, 2].every((n) => prescricaoAtivaEm(p, dia(n)))).toBe(true);
      expect(prescricaoAtivaEm(p, dia(3))).toBe(false);
    });
    it("enquanto internado vale sempre — o comportamento de antes", () => {
      const p = { periodoTipo: "INTERNACAO", criadaEm };
      expect(prescricaoAtivaEm(p, dia(30))).toBe(true);
    });
    it("prescrição antiga, sem período gravado, continua valendo", () => {
      expect(prescricaoAtivaEm({ criadaEm }, dia(15))).toBe(true);
    });
    it("sem saber quando começou, NÃO esconde — sumir prescrição é pior que mostrar demais", () => {
      expect(prescricaoAtivaEm({ periodoTipo: "UNICA" }, dia(5))).toBe(true);
      expect(prescricaoAtivaEm({ periodoTipo: "UNICA", criadaEm: "data ruim" }, dia(5))).toBe(true);
    });
    it("dia anterior ao início não conta", () => {
      expect(prescricaoAtivaEm({ periodoTipo: "DIAS", periodoDias: 3, criadaEm }, dia(-1))).toBe(false);
    });
  });

  describe("como o período aparece escrito", () => {
    it.each([
      [{ periodoTipo: "UNICA" }, "dose única"],
      [{ periodoTipo: "DIAS", periodoDias: 1 }, "por 1 dia"],
      [{ periodoTipo: "DIAS", periodoDias: 5 }, "por 5 dias"],
      [{ periodoTipo: "INTERNACAO" }, "enquanto internado"],
      [{}, "enquanto internado"],
    ])("%o vira '%s'", (p, txt) => expect(rotuloDoPeriodo(p)).toBe(txt));
  });
});
