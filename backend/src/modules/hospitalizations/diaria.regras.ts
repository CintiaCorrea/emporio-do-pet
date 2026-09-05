// NUCLEO UNICO da DIARIA DE INTERNACAO — "quantas diarias este animal deve?"
//
// Uma linha de conta que decide dinheiro todo dia, e que estava escrita em DOIS lugares
// (hospitalizations.service e a ficha da internacao) com comportamentos diferentes. Agora
// mora aqui, com teste.
//
// AS DUAS REGRAS:
//
//   1. 1 diaria a cada 24 HORAS COMECADAS desde a entrada — nao "dias no calendario".
//      Confirmado pela Cintia em 04/09/2026: 25 horas = 2 diarias, 47 horas = 2.
//
//   2. A conta PARA NA ALTA. Ate 05/09/2026 contava sempre ate AGORA: um animal que saiu no
//      dia 1o e cuja ficha fosse aberta no dia 10 aparecia com nove diarias a mais, e quem
//      enviasse pro caixa naquele momento cobrava as nove. A conta mudava de valor sozinha,
//      com o passar dos dias, sem ninguem ter tocado nela.
//
// E a ENTRADA e a hora em que o animal chegou, nao a hora em que a ficha foi digitada — o
// sistema gravava `new Date()`, entao quem chegava as 8h e era cadastrado as 14h tinha a
// diaria virando 6 horas atrasada, todo dia da internacao.

const DIA_MS = 86_400_000;

/**
 * Quantas diarias esta internacao deve ate `agora` (ou ate a `alta`, quando ela existe).
 *
 * Devolve no minimo 1: internacao comecada e box ocupado, e o animal que entra e sai na
 * mesma hora ocupou o box do mesmo jeito.
 *
 * Datas invalidas caem no comportamento seguro (1 diaria / internacao aberta) em vez de
 * virarem conta astronomica.
 */
export function diariasDevidas(entradaMs: number, agoraMs: number, altaMs?: number | null): number {
  if (!Number.isFinite(entradaMs)) return 1;
  const fim = Number.isFinite(altaMs as number) && altaMs != null ? (altaMs as number) : agoraMs;
  if (!Number.isFinite(fim)) return 1;
  return Math.max(1, Math.ceil((fim - entradaMs) / DIA_MS));
}

/** Quantas ainda faltam faturar, descontando as que ja foram. Nunca negativa. */
export function diariasAFaturar(devidas: number, jaFaturadas: number): number {
  return Math.max(0, devidas - (Number(jaFaturadas) || 0));
}
