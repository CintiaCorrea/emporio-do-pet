// NUCLEO UNICO — "este atendimento entra na linha do tempo clinica da ficha?"
//
// A linha do tempo mostra o que ACONTECEU com o animal. O que e so agenda (marcado,
// confirmado, cancelado) vive na aba Agenda; venda vive na aba Compras.
//
// O BUG que motivou este arquivo (04/09/2026): o filtro antigo era uma expressao unica
//
//     /agendad|scheduled|confirmad|remarcad|cancelad|bloquead|programad|missed|compareceu|faltou/i
//
// e ela escondia "Compareceu" — que e justamente o status de quem VEIO e FOI ATENDIDO.
// Quem escreveu queria pegar "Nao compareceu", e o pedaco "compareceu" pega os dois.
// Resultado: a avaliacao de fisioterapia da Dra. Nayanna sumiu da ficha do Snoopy (#7974),
// embora estivesse inteira no banco. Nada foi apagado — foi escondido.
//
// Alem de consertar isso, aqui vale uma regra mais forte: **conteudo clinico manda mais
// que status**. Se o atendimento tem queixa, prescricao ou diagnostico escrito, alguem
// atendeu aquele animal — e ele aparece, mesmo que ninguem tenha atualizado o status.

/** Tira acento e caixa, pra comparar status escrito de qualquer jeito. */
const normalizar = (s?: string | null): string =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

/** Status que dizem "o atendimento ACONTECEU". */
const ACONTECEU = /compareceu|atendid|realizad|finalizad|em atendimento|concluid/;

/** Status que dizem "nao aconteceu" — checado ANTES, porque "nao compareceu" contem "compareceu". */
const NAO_ACONTECEU = /nao\s*compareceu|faltou|missed|no.?show/;

/** Status que sao so agenda (ainda vai acontecer, ou foi desmarcado). */
const SO_AGENDA = /agendad|scheduled|confirmad|remarcad|cancelad|bloquead|programad|aguardando/;

export type AtendimentoParaLinhaDoTempo = {
  status?: string | null;
  /** Qualquer texto clinico: queixa, prescricao, diagnostico, evolucao. */
  chiefComplaint?: string | null;
  prescription?: string | null;
  diagnosis?: string | null;
  notes?: string | null;
};

/** Tem alguma coisa escrita que so existe se alguem atendeu o animal? */
export function temConteudoClinico(a: AtendimentoParaLinhaDoTempo): boolean {
  const campos = [a?.chiefComplaint, a?.prescription, a?.diagnosis];
  return campos.some((c) => String(c || '').replace(/<[^>]*>/g, '').trim().length > 0);
}

/**
 * O atendimento entra na linha do tempo clinica?
 *
 * Ordem das decisoes (importa):
 *   1. Tem conteudo clinico escrito -> ENTRA, sempre. Conteudo manda mais que status.
 *   2. Status diz que NAO aconteceu (faltou, nao compareceu) -> fica fora.
 *   3. Status diz que ACONTECEU (compareceu, atendido, realizado...) -> ENTRA.
 *   4. Status e so de agenda (agendado, confirmado, cancelado...) -> fica fora.
 *   5. Sem status reconhecido -> ENTRA. Na duvida, mostrar: sumir informacao clinica
 *      da ficha e pior do que mostrar uma linha a mais.
 */
export function entraNaLinhaDoTempo(a: AtendimentoParaLinhaDoTempo): boolean {
  if (temConteudoClinico(a)) return true;
  const s = normalizar(a?.status);
  if (!s) return true;
  if (NAO_ACONTECEU.test(s)) return false;
  if (ACONTECEU.test(s)) return true;
  if (SO_AGENDA.test(s)) return false;
  return true;
}
