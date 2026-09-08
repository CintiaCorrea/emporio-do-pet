// O QUE ENTRA NA LISTA DE VENDAS DO CAIXA.
//
// A Cintia, em 07/09/2026, olhando uma linha de R$ 150 que abria sem item nenhum:
//   "Como sem itens detalhados? Para que eu preciso de registro de vendas se nao for para
//    listar o que esta sendo vendido?"
// e, na decisao seguinte: "atendimento clinico nao precisa abrir venda".
//
// Por que a consulta aparecia: o numero de venda e atribuido a QUALQUER atendimento com valor
// maior que zero — inclusive a consulta clinica, que tem preco e nenhum item lancado. Ela
// entrava na lista, ocupava o lugar da venda de verdade, e abria vazia.
//
// A regra abaixo tira a consulta da lista sem nunca esconder dinheiro:
//   · atendimento clinico COM item lancado continua na lista — alguem cobrou algo ali, e isso
//     e venda de verdade;
//   · atendimento clinico que JA RECEBEU dinheiro continua na lista — sumir com recebimento
//     seria bem pior que mostrar uma linha a mais;
//   · a internacao tem tratamento proprio (a conta e faturada dia a dia).

export type LinhaDeVenda = {
  origem?: string | null;      // VENDA | ATENDIMENTO | INTERNACAO
  itens?: number | null;       // quantos itens a venda tem
  pago?: number | null;        // quanto ja entrou
};

/** A linha e uma venda de verdade, que a recepcao precisa ver e cobrar? */
export function ehVendaDeVerdade(r: LinhaDeVenda | null | undefined): boolean {
  if (!r) return false;
  if (r.origem !== 'ATENDIMENTO') return true;
  const itens = Number(r.itens) || 0;
  const pago = Number(r.pago) || 0;
  return itens > 0 || pago > 0;
}
