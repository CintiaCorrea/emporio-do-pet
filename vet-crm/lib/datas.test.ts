import { describe, it, expect } from "vitest";
import { diaCalendario, fmtDataBR, hojeLocalISO, hojeNaClinicaISO, diaNaClinicaISO } from "@/lib/datas";
import * as fs from "fs";
import * as path from "path";

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

  it("nenhuma tela calcula 'hoje' em UTC", () => {
    // toISOString() devolve o dia em UTC. Quem precisa do dia de hoje usa hojeNaClinicaISO().
    const proibido = 'new Date().toISOString().slice(0, 10)';
    const achados: string[] = [];
    const varrer = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== "node_modules" && e.name !== ".next") varrer(p); }
        else if (/\.tsx?$/.test(e.name) && !p.includes("datas.ts") && !p.includes("datas.test.ts")) {
          if (fs.readFileSync(p, "utf8").includes(proibido)) achados.push(p);
        }
      }
    };
    for (const d of ["app", "lib", "components"]) if (fs.existsSync(d)) varrer(d);
    expect(achados).toEqual([]);
  });
});
