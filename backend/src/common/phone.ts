/**
 * Helper de normalizacao de telefone brasileiro.
 *
 * Formato canonico no banco: 55 + DDD (2 digitos) + 9 + 8 digitos = 13 digitos
 * Exemplo: 5585986018111
 *
 * Toda comparacao entre telefones usa os ULTIMOS 9 DIGITOS (986018111)
 * pra evitar duplicata por formato diferente (com/sem 55, com/sem 9).
 */

/** Remove tudo que nao for digito. */
export function onlyDigits(raw?: string | null): string {
  return (raw || '').replace(/\D/g, '');
}

/**
 * Retorna os ULTIMOS 9 DIGITOS — usado pra comparar/buscar telefones
 * em formatos diferentes. Ex: 5585986018111, 85986018111, 986018111
 * todos retornam '986018111'.
 */
export function last9(raw?: string | null): string {
  const d = onlyDigits(raw);
  return d.length > 9 ? d.slice(-9) : d;
}

/**
 * Normaliza pra 13 digitos no formato canonico 55 + DDD + 9 + 8.
 * - 13 digitos comecando com 55 -> retorna como esta
 * - 12 digitos comecando com 55 -> insere o 9 depois do DDD
 * - 11 digitos (DDD + 9 + 8) -> adiciona 55
 * - 10 digitos (DDD + 8 sem 9) -> adiciona 55 + 9
 * - 9 ou menos -> retorna sem mexer (fallback)
 */
export function normalizePhone(raw?: string | null): string {
  const d = onlyDigits(raw);
  if (!d) return '';
  if (d.length === 13 && d.startsWith('55')) return d;
  if (d.length === 12 && d.startsWith('55')) return d.slice(0, 4) + '9' + d.slice(4);
  if (d.length === 11) return '55' + d;
  if (d.length === 10) return '55' + d.slice(0, 2) + '9' + d.slice(2);
  return d;
}

/**
 * Retorna os ULTIMOS 8 DIGITOS — base do casamento de cliente (ignora o 9o
 * digito que varia entre cadastros). Ex: 5585986018111 -> '86018111'.
 */
export function last8(raw?: string | null): string {
  const d = onlyDigits(raw);
  return d.length > 8 ? d.slice(-8) : d;
}

/** Exibe 55 (85) 98601-8111. Se nao for 13 digitos, retorna a string original. */
export function formatPhone(raw?: string | null): string {
  const d = normalizePhone(raw);
  if (d.length !== 13) return raw || '';
  return `55 (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
}

/** True se 2 telefones sao do mesmo dono (compara pelos ultimos 9 digitos). */
export function samePhone(a?: string | null, b?: string | null): boolean {
  const la = last9(a);
  const lb = last9(b);
  if (!la || !lb) return false;
  if (la.length >= 8 && la === lb) return true;
  const la8 = la.slice(-8);
  const lb8 = lb.slice(-8);
  return la8.length === 8 && la8 === lb8;
}
