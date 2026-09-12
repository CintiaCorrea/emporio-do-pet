/* ─────────────────────────────────────────────────────────────────────────────────────────
   LIGAR CADA EXAME AO ITEM DA VENDA QUE O GEROU.

   É esse vínculo que permite a conta a pagar do laboratório nascer quando o exame chega na
   coluna de retirada — a regra que a Cintia fixou em 07/09/2026: "o pagamento do laboratório
   tem que ser criado quando for para aba retirar, pois alguns clientes só pagam quando o
   animal é retirado da internação, então ele está na comanda, mas não está pago".

   Sem o vínculo, o exame cai na regra antiga e a conta do laboratório só nasce quando o
   CLIENTE paga — exatamente o que ela mandou parar de acontecer. Em 12/09/2026, 43 dos 46
   cards do Kanban estavam sem vínculo: todos os vindos de orçamento e os anteriores a esta
   regra. A conta do laboratório ficava presa esperando a alta do animal.

   O PDV já fazia isso, inline. Esta função existe para que a conversão de orçamento faça a
   MESMA coisa, e não uma parecida: o casamento por nome tem uma sutileza que se perde numa
   segunda escrita — o mesmo exame pedido DUAS vezes no mesmo atendimento (dois olhos, dois
   períodos) precisa casar com dois itens diferentes, e não duas vezes com o primeiro.
   ───────────────────────────────────────────────────────────────────────────────────────── */

/** Só o que importa para casar: o id e o texto que o cliente vê. */
export type ItemDaVenda = { id: string; descricao?: string | null };

const chave = (s: unknown) => String(s ?? '').trim().toLowerCase();

/**
 * Devolve os exames com `appointmentItemId` preenchido — null quando não houve par.
 *
 * Casa por descrição porque é o único texto que as duas pontas compartilham: o exame do
 * companheiro (`orcexa_`/catálogo) e o item gravado no atendimento. Cada item da venda é
 * consumido UMA vez, na ordem em que chegou, então exame repetido casa com itens diferentes.
 *
 * Não inventa par: sem correspondência exata, `appointmentItemId` fica null e o exame segue a
 * regra antiga. Chutar aqui seria pior — criaria conta a pagar do laboratório amarrada ao item
 * errado, e o erro só apareceria no fechamento do mês, sem ninguém saber de onde veio.
 */
export function ligarAoItemDaVenda<T extends { descricao?: string | null }>(
  exames: T[],
  itensDaVenda: ItemDaVenda[],
): (T & { appointmentItemId: string | null })[] {
  const disponiveis = (Array.isArray(itensDaVenda) ? itensDaVenda : []).filter((i) => i && i.id);
  const usados = new Set<string>();

  return (Array.isArray(exames) ? exames : []).map((e) => {
    const alvo = chave((e as any)?.descricao);
    const achado = alvo
      ? disponiveis.find((i) => !usados.has(i.id) && chave(i.descricao) === alvo)
      : undefined;
    if (achado) usados.add(achado.id);
    return { ...e, appointmentItemId: achado?.id || null };
  });
}
