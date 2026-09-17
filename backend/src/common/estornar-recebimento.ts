// ESTORNAR UM RECEBIMENTO — o dinheiro sai do caixa, com tudo o que ele puxou junto.
//
// Um lugar só para desfazer um recebimento: o crédito do cliente que ele usou volta para o saldo,
// os lançamentos do financeiro que ele gerou (taxa do cartão, baixa de crédito) saem, e o DESCONTO
// que ele deu volta para a venda. Existia dentro do caixa (deleteRecebimento). Saiu de lá em
// 16/09/2026, quando APAGAR VENDA PAGA passou a tirar o dinheiro do caixa junto (Cintia: "ele sai
// do caixa") — até ali o recebimento ficava no caixa sem venda nenhuma, porque o banco solta a
// ligação (SET NULL) em vez de apagar.
//
// O DESCONTO VOLTA (Cintia, 17/09/2026: recomendação aceita). O desconto dado na gaveta é dividido
// nos itens da venda, e o recebimento guarda quanto foi para cada linha (`descontoItens`). Sem
// voltar, a venda que ganhou 5% porque seria paga no PIX continuaria com o desconto e poderia ser
// paga no cartão — onde esse desconto não é permitido.
//
// Recebe o `prisma` ou uma transação: quem apaga a venda estorna e apaga no mesmo passo.

type Cliente = {
  creditoMovimento: { deleteMany: (a: any) => Promise<any> };
  recebimento: { delete: (a: any) => Promise<any>; findUnique: (a: any) => Promise<any> };
  lancamento: { deleteMany: (a: any) => Promise<any> };
  appointmentItem: { findUnique: (a: any) => Promise<any>; update: (a: any) => Promise<any> };
  appointment: { findUnique: (a: any) => Promise<any>; update: (a: any) => Promise<any> };
};

const cent = (v: unknown) => Math.round((Number(v) || 0) * 100);

/** Devolve à venda o desconto que o recebimento tinha dividido nos itens. Retorna quanto voltou. */
export async function devolverDescontoDoRecebimento(db: Cliente, recebimentoId: string): Promise<number> {
  const rec = await db.recebimento.findUnique({ where: { id: recebimentoId }, select: { appointmentId: true, descontoItens: true } });
  const partes = Array.isArray(rec?.descontoItens) ? (rec.descontoItens as { itemId: string; valor: number }[]) : [];
  if (!rec?.appointmentId || !partes.length) return 0;
  let voltou = 0;
  for (const p of partes) {
    const it = await db.appointmentItem.findUnique({ where: { id: p.itemId }, select: { desconto: true, valorTotal: true } });
    if (!it) continue; // a linha saiu da venda depois: não há onde devolver
    const valor = Math.min(cent(p.valor), cent(it.desconto));
    if (valor <= 0) continue;
    await db.appointmentItem.update({ where: { id: p.itemId }, data: { desconto: (cent(it.desconto) - valor) / 100, valorTotal: (cent(it.valorTotal) + valor) / 100 } });
    voltou += valor;
  }
  if (voltou > 0) {
    const ap = await db.appointment.findUnique({ where: { id: rec.appointmentId }, select: { value: true } });
    await db.appointment.update({ where: { id: rec.appointmentId }, data: { value: (cent(ap?.value) + voltou) / 100 } });
  }
  return voltou / 100;
}

export async function estornarRecebimento(db: Cliente, recebimentoId: string): Promise<void> {
  await devolverDescontoDoRecebimento(db, recebimentoId);
  await db.creditoMovimento.deleteMany({ where: { recebimentoId } });
  await db.recebimento.delete({ where: { id: recebimentoId } });
  await db.lancamento.deleteMany({ where: { origem: 'CRM', externalId: { startsWith: `taxa:${recebimentoId}:` } } });
  await db.lancamento.deleteMany({ where: { origem: 'CRM', externalId: `credito-uso:${recebimentoId}` } });
}

/** A receita e o desconto que a VENDA lançou no financeiro — saem quando ela fica sem recebimento. */
export async function limparReceitaDaVenda(db: Pick<Cliente, 'lancamento'>, appointmentId: string): Promise<void> {
  await db.lancamento.deleteMany({ where: { origem: 'CRM', externalId: { startsWith: `venda:${appointmentId}:` } } });
  await db.lancamento.deleteMany({ where: { origem: 'CRM', externalId: `desconto:${appointmentId}` } });
}
