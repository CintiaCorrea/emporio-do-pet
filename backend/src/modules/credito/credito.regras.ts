// REGRAS PURAS do saldo consolidado do cliente (crédito de loja − contas a receber). Isoladas aqui
// pra serem TESTÁVEIS e blindar o comportamento da tela "Saldo dos clientes" (CREDOR × DEVEDOR).

/** Uma conta a receber conta como devida AGORA? Realizada = concluída OU já passou a data. */
export const realizadaAReceber = (status: string | null | undefined, date: Date, now: Date): boolean =>
  status === 'COMPLETED' || status === 'DONE' || date < now;

/** Saldo líquido do cliente e classificação. saldo = crédito − a receber (2 casas).
 *  saldo >= 0 → CREDOR (tem crédito) · saldo < 0 → DEVEDOR (deve, ex.: saldo migrado do SimplesVet). */
export function classificarSaldo(totalCredito: number, totalAReceber: number): { saldo: number; situacao: 'CREDOR' | 'DEVEDOR' } {
  const saldo = Number(((totalCredito || 0) - (totalAReceber || 0)).toFixed(2));
  return { saldo, situacao: saldo >= 0 ? 'CREDOR' : 'DEVEDOR' };
}
