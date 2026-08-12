import { describe, it, expect } from "vitest";
import { diaCalendario, fmtDataBR, hojeLocalISO } from "@/lib/datas";

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
  it("bate com a data LOCAL de hoje (não a UTC)", () => {
    const n = new Date();
    const p = (x: number) => String(x).padStart(2, "0");
    expect(hojeLocalISO()).toBe(`${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`);
  });
});
