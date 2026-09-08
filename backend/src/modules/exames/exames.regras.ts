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

// ── LEMBRETE DA SOLICITAÇÃO AO LABORATÓRIO ───────────────────────────────────────────────
//
// A Cintia, em 07/09/2026: "todo exame lançado na comanda deve abrir em solicitar (...) devemos
// ter lembretes para a recepção fazer a solicitação ao laboratório" — "para a recepção às 11:00,
// 15:00 e 17:00".
//
// O que o lembrete cobra é exame que ficou parado na PRIMEIRA fase: ele foi vendido, o
// laboratório não sabe, e o resultado não vai chegar. O que já andou de fase não é lembrado —
// alerta que grita pelo que já foi feito é alerta que a equipe aprende a ignorar.

export type ExameParaLembrete = {
  nome?: string | null;
  status?: string | null;
  petNome?: string | null;
  fornecedorNome?: string | null;
  /** Quando o exame entrou no ciclo. */
  date?: string | null;
};

/** Precisa de lembrete? Só o que ainda está na fase de solicitação. */
export function precisaLembrarSolicitacao(e: ExameParaLembrete, faseInicial: string): boolean {
  if (!e) return false;
  return ehFaseSolicitacao(String(e.status || ''), faseInicial);
}

/**
 * O texto do lembrete — curto, com o número e os nomes, para a pessoa saber o tamanho do
 * trabalho antes de abrir a tela.
 */
export function textoDoLembrete(exames: ExameParaLembrete[]): { titulo: string; mensagem: string } | null {
  const lista = (Array.isArray(exames) ? exames : []).filter(Boolean);
  if (!lista.length) return null;

  const nomes = lista.slice(0, 4).map((e) => {
    const pet = String(e.petNome || '').trim();
    const nome = String(e.nome || 'Exame').trim();
    return pet ? `${pet} — ${nome}` : nome;
  });
  const resto = lista.length - nomes.length;

  return {
    titulo: lista.length === 1 ? '1 exame esperando solicitação' : `${lista.length} exames esperando solicitação`,
    mensagem: `Ainda não foram pedidos ao laboratório: ${nomes.join('; ')}${resto > 0 ? ` e mais ${resto}` : ''}.`,
  };
}
