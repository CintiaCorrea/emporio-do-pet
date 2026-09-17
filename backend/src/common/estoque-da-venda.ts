// DEVOLVER AO ESTOQUE O QUE UMA VENDA BAIXOU.
//
// Cintia, 17/09/2026: "As vacinas têm estoque, então o item deve voltar ao estoque." Até ali apagar
// venda paga, estornar recebimento e reabrir venda tiravam o dinheiro do caixa, mas o estoque que
// a venda tinha baixado ficava baixado.
//
// A baixa de estoque de uma venda mora em cat_estoque_movimentos (SAIDA, origem VENDA), com refId
// igual ao id da venda (baixa na hora em que a venda fica paga) ou ao id da linha (rotina de
// segurança). Devolver é lançar uma ENTRADA para cada saída, com origem ESTORNO_VENDA e refId =
// id da saída — é isso que impede devolver a mesma saída duas vezes. Quando a venda for paga de
// novo, a baixa acontece de novo.
//
// Recebe o `prisma` ou uma transação.

type Db = {
  appointmentItem: { findMany: (a: any) => Promise<{ id: string }[]> };
  catEstoqueMovimento: {
    findMany: (a: any) => Promise<any[]>;
    create: (a: any) => Promise<any>;
  };
  itemCatalogo: {
    findUnique: (a: any) => Promise<{ estoqueAtual: number | null } | null>;
    update: (a: any) => Promise<any>;
  };
};

export const ORIGEM_ESTORNO = 'ESTORNO_VENDA';

/** Devolve ao estoque tudo o que a venda baixou e ainda não foi devolvido. Retorna quantas saídas voltaram. */
export async function devolverEstoqueDaVenda(db: Db, appointmentId: string): Promise<number> {
  const linhas = await db.appointmentItem.findMany({ where: { appointmentId }, select: { id: true } });
  const refs = [appointmentId, ...linhas.map((l) => l.id)];
  const saidas = await db.catEstoqueMovimento.findMany({ where: { origem: 'VENDA', tipo: 'SAIDA', refId: { in: refs } } });
  if (!saidas.length) return 0;
  const devolvidas = new Set(
    (await db.catEstoqueMovimento.findMany({ where: { origem: ORIGEM_ESTORNO, refId: { in: saidas.map((s) => s.id) } }, select: { refId: true } }))
      .map((m) => m.refId),
  );
  let n = 0;
  for (const s of saidas) {
    if (devolvidas.has(s.id)) continue;
    const item = await db.itemCatalogo.findUnique({ where: { id: s.itemId }, select: { estoqueAtual: true } });
    if (!item) continue;
    const qtd = Number(s.quantidade) || 0;
    const saldoAntes = Number(item.estoqueAtual) || 0;
    const saldoDepois = saldoAntes + qtd;
    await db.catEstoqueMovimento.create({
      data: { itemId: s.itemId, tipo: 'ENTRADA', quantidade: qtd, saldoAntes, saldoDepois, origem: ORIGEM_ESTORNO, refId: s.id, obs: `Estorno de venda (${appointmentId})` },
    });
    await db.itemCatalogo.update({ where: { id: s.itemId }, data: { estoqueAtual: saldoDepois } });
    n++;
  }
  return n;
}
