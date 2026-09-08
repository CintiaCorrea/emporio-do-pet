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

// ── A COLUNA "RETIRAR" É O MARCO ─────────────────────────────────────────────────────────
//
// A Cintia, em 07/09/2026, corrigindo o gatilho que eu tinha usado: "o aviso para recepção e o
// a pagar só aparece depois que forem para a coluna do retirar. O pagamento do laboratório tem
// que ser criado quando for para aba retirar, pois alguns clientes só pagam quando o animal é
// retirado da internação, então ele está na comanda, mas não está pago."
//
// Duas coisas nascem nesse momento: o lembrete da recepção (11h, 15h e 17h) e a conta a pagar do
// laboratório. E é por isso que a conta do laboratório NÃO pode depender de a venda ter sido
// recebida: o serviço do laboratório já foi feito, mesmo que o cliente só pague na alta.

/** Ordem das fases configuradas. A comparação é POSICIONAL — nome de fase muda, ordem não. */
export function indiceDaFase(status: string | null | undefined, fases: string[]): number {
  const s = String(status || '').toLowerCase().trim();
  const lista = (Array.isArray(fases) ? fases : []).map((f) => String(f || '').toLowerCase().trim());
  return lista.indexOf(s);
}

/**
 * O exame já chegou na coluna alvo (ou passou dela)?
 *
 * Posicional de propósito: "Retirado" já foi "Retirar" e pode virar outra palavra amanhã. O que
 * não muda é que ela vem depois da solicitação. Fase desconhecida devolve false — na dúvida, não
 * cria conta a pagar sozinho.
 */
export function atingiuFase(status: string | null | undefined, alvo: string, fases: string[]): boolean {
  const iStatus = indiceDaFase(status, fases);
  const iAlvo = indiceDaFase(alvo, fases);
  if (iStatus < 0 || iAlvo < 0) return false;
  return iStatus >= iAlvo;
}

/** A coluna de retirada, dentro das fases configuradas. Sem ela, nada dispara. */
export function faseDeRetirada(fases: string[]): string | null {
  const achada = (Array.isArray(fases) ? fases : []).find((f) => /retir/i.test(String(f || '')));
  return achada || null;
}

export type ExameParaLembrete = {
  nome?: string | null;
  status?: string | null;
  petNome?: string | null;
  fornecedorNome?: string | null;
  /** Quando o exame entrou no ciclo. */
  date?: string | null;
};

/**
 * Precisa de lembrete? Só o que JÁ CHEGOU na coluna de retirada e ainda não terminou.
 *
 * Era a primeira fase até 07/09/2026 — a Cintia corrigiu: o que interessa lembrar é o exame que
 * está pronto para ser retirado, não o que acabou de ser vendido.
 */
export function precisaLembrarRetirada(e: ExameParaLembrete, fases: string[]): boolean {
  if (!e) return false;
  const retirar = faseDeRetirada(fases);
  if (!retirar) return false;
  if (ehFaseConcluida(e.status)) return false;
  return atingiuFase(e.status, retirar, fases);
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
    titulo: lista.length === 1 ? '1 exame para retirar' : `${lista.length} exames para retirar`,
    mensagem: `Na coluna de retirada: ${nomes.join('; ')}${resto > 0 ? ` e mais ${resto}` : ''}.`,
  };
}
