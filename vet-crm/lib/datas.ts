// Datas de CALENDÁRIO (vacina, boletim, follow-up, dose de protocolo) — representam um DIA, sem hora.
// Elas chegam como "AAAA-MM-DD" OU como ISO à meia-noite UTC ("...T00:00:00.000Z", campo DATE do banco).
// Se jogarmos direto no new Date(), o fuso do Brasil (−3h) mostra o DIA ANTERIOR (bug recorrente:
// boletim/vacina do dia 23 aparecia 22). Aqui tratamos como dia LOCAL. Timestamps REAIS (hora ≠ meia-
// noite UTC, ex.: horário de um atendimento) NÃO casam o regex e seguem com o comportamento normal.

const RE_DIA = /^(\d{4}-\d{2}-\d{2})(?:T00:00(?::00)?(?:\.\d{3})?Z?)?$/;

/** Converte uma data de calendário para um Date no fuso LOCAL (ou null se inválida). */
export function diaCalendario(v?: string | null): Date | null {
  if (!v) return null;
  const s = String(v);
  const m = s.match(RE_DIA);
  const d = new Date(m ? m[1] + "T00:00:00" : s);
  return isNaN(d.getTime()) ? null : d;
}

/** Formata uma data de calendário como DD/MM/AAAA (pt-BR); "—" se vazia/inválida. */
export function fmtDataBR(v?: string | null): string {
  const d = diaCalendario(v);
  return d ? d.toLocaleDateString("pt-BR") : "—";
}

/** Fuso da clínica. O dia do caixa, da venda e do relatório é o dia em FORTALEZA — não o
 *  do relógio de quem abriu a tela, nem o do servidor (que roda em UTC). */
export const FUSO_CLINICA = "America/Fortaleza";

/** HOJE na clínica, em AAAA-MM-DD.
 *
 *  Dois erros que esta função existe para impedir:
 *  1. `new Date().toISOString().slice(0,10)` devolve o dia em UTC. Depois das 21h em Fortaleza
 *     já é o dia seguinte em UTC, então a venda das 22h caía no dia errado e sumia da lista
 *     do dia (Cintia, 08/09/2026: "para você já é meia noite, mas ainda são dez horas").
 *  2. Usar as partes locais do Date (getFullYear/getMonth/getDate) amarra o dia ao relógio do
 *     COMPUTADOR. Um notebook com fuso errado, ou alguém acessando de fora, veria outro dia.
 *
 *  'en-CA' foi escolhido porque formata como AAAA-MM-DD, que é exatamente o formato aceito
 *  por <input type="date"> e pelas nossas APIs. */
export function hojeNaClinicaISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_CLINICA,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

/** Mesma coisa para uma data qualquer: qual o dia dela NA CLÍNICA. */
export function diaNaClinicaISO(v: Date | string | number): string {
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_CLINICA,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
}

/** @deprecated Use hojeNaClinicaISO(). Mantido porque já havia chamadas; o comportamento
 *  agora é o do fuso da clínica, e não mais o do relógio da máquina. */
export function hojeLocalISO(): string {
  return hojeNaClinicaISO();
}
