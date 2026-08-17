// REGRAS PURAS do aviso ao laboratório — isoladas aqui pra serem TESTÁVEIS e blindarem a regressão
// histórica (o envio estava preso em status.includes("coleta"), fase que NÃO existe — nunca disparava).
// Qualquer mudança que quebre essas regras faz o teste (exames.regras.spec.ts) falhar. NÃO acoplar a
// nomes mágicos de fase: a elegibilidade é "tem laboratório + não avisado + fase de solicitação".

// Fases finais (exame concluído) — espelha o front (lib/exameFases.ts). Inclui vocabulário antigo.
export const FASES_CONCLUIDAS = ['Entregue', 'Resultado entregue ao tutor', 'Pago ao laboratório'];

/** Exame já concluído (fase final)? Comparação exata, sem caixa. */
export const ehFaseConcluida = (status?: string | null): boolean =>
  FASES_CONCLUIDAS.some((f) => f.toLowerCase() === String(status || '').toLowerCase());

/** Fase de "solicitação" (exame recém-vendido, ainda não retirado). Aceita a 1ª fase configurada
 *  (default "Solicitar") e o vocabulário antigo "Solicitado" — posicional, NÃO depende de "coleta". */
export const ehFaseSolicitacao = (status: string | undefined | null, inicial: string): boolean => {
  const s = String(status || '').toLowerCase().trim();
  return s === String(inicial || '').toLowerCase().trim() || s.startsWith('solicit');
};

/** REGRA ÚNICA de elegibilidade do LOTE ao laboratório: tem fornecedor (lab) vinculado, ainda não
 *  foi avisado, e está na fase de solicitação. Espelha o `podeAvisarLab` do front. */
export function exameElegivelLote(
  d: { status?: string | null; fornecedorId?: string | null; labAvisadoAt?: string | null } | null | undefined,
  inicial: string,
): boolean {
  if (!d) return false;
  return !!d.fornecedorId && !d.labAvisadoAt && ehFaseSolicitacao(d.status, inicial);
}
