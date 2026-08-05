// Ajudantes de formatação (R$ e data) — FONTE ÚNICA.
// Criado na faxina de 27/07 para substituir gradualmente os formatadores copiados
// em dezenas de arquivos. Espelha o comportamento que já existia (pt-BR, BRL), só que
// mais seguro (trata número/string/nulo e data inválida sem quebrar a tela).

/** Converte qualquer coisa num número seguro (0 se vazio/inválido). */
function toNum(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Formata valor em Reais.
 *   formatBRL(1234.5)                 => "R$ 1.234,50"
 *   formatBRL("12,5")  // vírgula     => "R$ 12,50"  (aceita string com vírgula)
 *   formatBRL(1234, { semCentavos })  => "R$ 1.234"
 *   formatBRL(null)                   => "R$ 0,00"
 */
export function formatBRL(value: unknown, opts?: { semCentavos?: boolean }): string {
  // aceita "1.234,56" (formato pt) além de número/está string com ponto
  const num =
    typeof value === 'string' && value.includes(',')
      ? toNum(value.replace(/\./g, '').replace(',', '.'))
      : toNum(value);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    ...(opts?.semCentavos ? { maximumFractionDigits: 0 } : {}),
  }).format(num);
}

/** Converte string/Date/number numa Date válida, ou null se inválida/vazia. */
function toDate(input: unknown): Date | null {
  if (input == null || input === '') return null;
  const d = input instanceof Date ? input : new Date(input as string | number);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formata data em pt-BR. Aceita as MESMAS opções do toLocaleDateString.
 *   formatDate("2026-07-27")                               => "27/07/2026"
 *   formatDate(d, { day: "2-digit", month: "long" })       => "27 de julho"
 *   formatDate(null)                                       => "—"  (nunca "Invalid Date")
 */
export function formatDate(input: unknown, opts?: Intl.DateTimeFormatOptions): string {
  const d = toDate(input);
  if (!d) return '—';
  return d.toLocaleDateString('pt-BR', opts);
}

/**
 * Data + hora curtas.
 *   formatDateTime("2026-07-27T21:00") => "27/07/2026 21:00"
 *   formatDateTime(null)               => "—"
 */
export function formatDateTime(input: unknown): string {
  const d = toDate(input);
  if (!d) return '—';
  const data = d.toLocaleDateString('pt-BR');
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${data} ${hora}`;
}
