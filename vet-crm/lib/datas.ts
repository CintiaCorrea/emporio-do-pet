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

/** HOJE em data LOCAL no formato AAAA-MM-DD. Não usar toISOString (UTC): à noite no Brasil gravaria
 *  o dia seguinte. Usado como valor padrão de campos de data (aplicação de dose, etc.). */
export function hojeLocalISO(): string {
  const n = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
}
