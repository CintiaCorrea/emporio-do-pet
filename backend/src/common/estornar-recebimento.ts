// ESTORNAR UM RECEBIMENTO — o dinheiro sai do caixa, com tudo o que ele puxou junto.
//
// Um lugar só para desfazer um recebimento: o crédito do cliente que ele usou volta para o saldo,
// e os lançamentos do financeiro que ele gerou (taxa do cartão, baixa de crédito) saem. Existia
// dentro do caixa (deleteRecebimento). Saiu de lá em 16/09/2026, quando APAGAR VENDA PAGA passou
// a tirar o dinheiro do caixa junto (Cintia: "ele sai do caixa") — até ali o recebimento ficava
// no caixa sem venda nenhuma, porque o banco solta a ligação (SET NULL) em vez de apagar.
//
// Recebe o `prisma` ou uma transação: quem apaga a venda estorna e apaga no mesmo passo.

type Cliente = {
  creditoMovimento: { deleteMany: (a: any) => Promise<any> };
  recebimento: { delete: (a: any) => Promise<any> };
  lancamento: { deleteMany: (a: any) => Promise<any> };
};

export async function estornarRecebimento(db: Cliente, recebimentoId: string): Promise<void> {
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
