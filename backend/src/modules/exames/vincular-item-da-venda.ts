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

/* ─────────────────────────────────────────────────────────────────────────────────────────
   LIGAR OS CARDS QUE JA EXISTEM, DEPOIS QUE A VENDA APARECE.

   O PDV e a conversao de orcamento ligam na hora: o card e o item nascem juntos. A INTERNACAO
   nao pode — la o exame entra na conta do dia, e a conta do dia so vira venda depois. Quando o
   card e criado, o item da venda ainda nao existe.

   Por isso a ligacao acontece do outro lado: assim que a venda do dia e criada ou atualizada,
   procuram-se os cards daquele pet que ainda estao soltos e casa-se pelo nome.

   Serve tambem para o retroativo — card antigo cuja venda ja existe ha dias.

   Recebe o prisma de quem chama de proposito: o modulo de internacao nao importa o de exames, e
   fazer essa importacao so por isto arriscaria dependencia circular entre dois modulos grandes.
   ───────────────────────────────────────────────────────────────────────────────────────── */

type PrismaMinimo = {
  listaItem: {
    findMany: (args: any) => Promise<{ id: string; valor: string }[]>;
    update: (args: any) => Promise<unknown>;
  };
  appointmentItem: { findMany: (args: any) => Promise<{ id: string; descricao: string | null }[]> };
};

/**
 * Liga os cards de exame SOLTOS deste pet aos itens desta venda. Devolve quantos ligou.
 *
 * So toca em card sem vinculo: quem ja tem o seu nao e' mexido, nem que o nome bata de novo.
 * E so casa com item que tem fornecedor — sem fornecedor nao ha conta a pagar para nascer, e o
 * vinculo nao serviria para nada.
 *
 * Nunca estoura: roda dentro do fechamento do dia da internacao, e derrubar o faturamento por
 * causa do exame seria trocar um problema pequeno por um grande.
 */
export async function ligarCardsSoltosDoPet(
  prisma: PrismaMinimo,
  petId: string,
  appointmentId: string,
): Promise<number> {
  if (!petId || !appointmentId) return 0;
  try {
    // UMA DE CADA VEZ, e cada uma com a sua rede. Com Promise.all, se a segunda chamada
    // estourar ANTES de a primeira ser aguardada (prisma incompleto, por exemplo), a rejeicao
    // da primeira fica orfa e derruba o processo inteiro — o teste pegou isso.
    const cards = await prisma?.listaItem?.findMany?.({
      where: { lista: `petexa_${petId}` }, select: { id: true, valor: true },
    }).catch(() => []) ?? [];
    if (!cards.length) return 0;
    const itens = await prisma?.appointmentItem?.findMany?.({
      where: { appointmentId, fornecedorId: { not: null } },
      select: { id: true, descricao: true },
      orderBy: { createdAt: 'asc' },
    }).catch(() => []) ?? [];
    if (!itens.length) return 0;

    const soltos = cards
      .map((c) => { try { return { id: c.id, d: JSON.parse(c.valor) }; } catch { return null; } })
      .filter((c): c is { id: string; d: any } => !!c && !!c.d?.nome && !c.d.itemVendaId);
    if (!soltos.length) return 0;

    const ligados = ligarAoItemDaVenda(soltos.map((c) => ({ descricao: c.d.nome })), itens);

    let n = 0;
    for (let i = 0; i < soltos.length; i++) {
      const itemId = ligados[i]?.appointmentItemId;
      if (!itemId) continue;
      const novo = { ...soltos[i].d, itemVendaId: itemId };
      await prisma.listaItem.update({ where: { id: soltos[i].id }, data: { valor: JSON.stringify(novo) } })
        .then(() => { n++; })
        .catch(() => undefined);
    }
    return n;
  } catch {
    return 0;
  }
}
