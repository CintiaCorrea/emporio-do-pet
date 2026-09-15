// A JANELA DE AJUSTE, do lado da tela.
//
// Espelha `backend/src/common/janela-de-ajuste.ts`, que é a fonte. Existe aqui porque a tela
// precisa decidir o que MOSTRAR, e perguntar ao servidor a cada render seria caro para uma
// resposta que muda uma vez por semana.
//
// A data já esteve escrita em três lugares e uma prorrogação esqueceu um deles — por isso ela
// mora neste arquivo, e não solta dentro de cada tela.
//
// PRORROGAÇÕES, cada uma um pedido escrito da Cintia:
//   12/09 → 13/09 · 13/09 → 14/09 · 14/09 → 19/09 ("preciso que libere até o dia 19 a edição
//   dos caixas pois ainda não conseguimos coisas básicas que já estamos trabalhando há muito
//   tempo"). A janela não está aberta porque a equipe precisa de tempo: está aberta porque o
//   SISTEMA ainda não faz o que deveria.
export const AJUSTE_ATE = "2026-09-19T23:59:59-03:00";

/** Ainda estamos dentro da janela? Fora dela, cada trava volta a valer por si. */
export function dentroDaJanelaDeAjuste(agora?: Date | string): boolean {
  const t = agora ? new Date(agora as any).getTime() : Date.now();
  if (!Number.isFinite(t)) return false;
  return t <= new Date(AJUSTE_ATE).getTime();
}

/** "19/09" — para escrever na tela sem repetir a data à mão em cada aviso. */
export const AJUSTE_ATE_CURTO = new Date(AJUSTE_ATE).toLocaleDateString("pt-BR", {
  day: "2-digit", month: "2-digit", timeZone: "America/Fortaleza",
});
