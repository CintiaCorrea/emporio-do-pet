// Regras de DATA dos lembretes — PURAS e testáveis (recebem "agora" por parâmetro,
// não leem o relógio nem o banco). É a ÚNICA fonte da verdade de fuso pros lembretes.
//
// A armadilha que já mordeu 2x (aniversário e vacina saírem 1 dia antes):
//   • "hoje" é um INSTANTE real → precisa converter pro fuso de Fortaleza (UTC-3).
//   • data de NASCIMENTO / VENCIMENTO é uma DATA PURA, salva à meia-noite UTC →
//     NÃO pode levar o -3h (senão vira o dia anterior). Lê os componentes UTC direto.
// Os testes em reminders-datas.spec.ts CONGELAM esse comportamento.

export type YMD = { y: number; m: number; d: number }; // m: 0-11 (padrão JS)

/** Calendário de Fortaleza (UTC-3) de um INSTANTE real. Use para o "hoje". */
export function fortalezaYMD(now: Date): YMD {
  const f = new Date(now.getTime() - 3 * 3600 * 1000);
  return { y: f.getUTCFullYear(), m: f.getUTCMonth(), d: f.getUTCDate() };
}

/** Dia/mês de uma DATA PURA (nascimento/vencimento), lidos em UTC — SEM o -3h. */
export function dataPuraMD(d: Date): { m: number; d: number } {
  return { m: d.getUTCMonth(), d: d.getUTCDate() };
}

/** É aniversário HOJE? Compara o dia/mês da data pura com o calendário de Fortaleza. */
export function ehAniversarioHoje(birthDate: Date, now: Date): boolean {
  const b = dataPuraMD(birthDate);
  const h = fortalezaYMD(now);
  return b.m === h.m && b.d === h.d;
}

/** Dias até uma data pura de vencimento: >0 futuro, 0 hoje, <0 passado. */
export function diasAteDataPura(prevista: Date, now: Date): number {
  const h = fortalezaYMD(now);
  const py = prevista.getUTCFullYear();
  const pm = prevista.getUTCMonth();
  const pd = prevista.getUTCDate();
  return Math.round((Date.UTC(py, pm, pd) - Date.UTC(h.y, h.m, h.d)) / 86400000);
}

/** dd/mm de uma DATA PURA (em UTC). */
export function ddmmDataPura(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
