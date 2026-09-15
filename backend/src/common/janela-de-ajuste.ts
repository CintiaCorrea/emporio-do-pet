/**
 * A JANELA DE AJUSTE — uma data só, para todas as travas afrouxadas de propósito.
 *
 * Existe porque setembro é o mês em que a equipe está aprendendo o sistema e as contas antigas
 * estão sendo acertadas. Algumas travas de dinheiro, certas em regime normal, virariam gargalo
 * agora: obrigariam a chamar a Cintia a cada correção, no meio do plantão.
 *
 * O que ela afrouxa, hoje:
 *   · internação — qualquer perfil edita qualquer item, inclusive os já cobrados, e corrige a
 *     hora de entrada, que é o relógio das diárias (decidido em 06/09/2026);
 *   · caixa — o ADMINISTRATIVO lança em caixa de outra pessoa sem precisar abrir o dele
 *     (pedido da Cintia em 12/09/2026, para a conciliação bancária de setembro).
 *
 * DUAS COISAS QUE NÃO SÃO ACIDENTE:
 *
 * 1. A data mora NO CÓDIGO, não numa promessa de alguém lembrar. Passada ela, as travas voltam
 *    sozinhas. Afrouxar trava de dinheiro tem de ser decisão escrita; voltar atrás, não.
 *
 * 2. É UMA data, e não uma por módulo. Ela já esteve escrita em três lugares (a regra do
 *    backend e duas vezes na tela da internação) e prorrogar um e esquecer o outro deixaria o
 *    aviso mentindo para a equipe — ou pior, uma trava aberta que todo mundo pensa que fechou.
 *
 * PRORROGAÇÕES, cada uma um pedido escrito dela:
 *   12/09 → 13/09, em 12/09/2026: "vou conferir todos os caixas e lançamentos e fazer a
 *           conciliação bancária, para deixar o mês de setembro redondo".
 *   13/09 → 14/09, em 14/09/2026: "encerramos ontem a edição dos caixas antigos, pode deixar
 *           para até o fim do dia de hoje?" — a janela já havia vencido na véspera, e a
 *           conciliação de setembro ainda estava aberta.
 *   14/09 → 19/09, em 15/09/2026: "preciso que libere até o dia 19 a edição dos caixas pois
 *           ainda não conseguimos coisas básicas que já estamos trabalhando há muito tempo" —
 *           fechar caixa e transferir saldo entre caixas, e baixar várias comandas, ainda não
 *           funcionam. A janela não está aberta porque a equipe precisa de tempo: está aberta
 *           porque o SISTEMA ainda não faz o que deveria. Ela fecha quando isso for resolvido.
 */
export const AJUSTE_ATE = '2026-09-19T23:59:59-03:00';

/** Ainda estamos dentro da janela? Fora dela, cada trava volta a valer por si. */
export function dentroDaJanelaDeAjuste(agora?: Date | string): boolean {
  const t = agora ? new Date(agora as any).getTime() : Date.now();
  if (!Number.isFinite(t)) return false;
  return t <= new Date(AJUSTE_ATE).getTime();
}
