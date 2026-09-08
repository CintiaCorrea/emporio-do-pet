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
// CORRECAO DA MESMA CINTIA, no mesmo dia: "nao e para sumir. E so para nao ser lancado quando
// inicia o atendimento clinico." Ou seja: o conserto e NAO CRIAR a venda no comeco do
// atendimento — nao esconder a que existe. Consulta que ja foi lancada continua na lista, como
// qualquer registro; o que se cobra dela entra pela comanda ou pelo balcao.
//
// O que esta regra ainda faz, e por outro motivo: tirar a INTERNACAO da lista. Desde 07/09/2026
// a conta de cada dia da internacao e uma venda propria, com os itens daquele dia. A internacao
// em si e um atendimento com o valor da diaria — se ela tambem entrasse, o mesmo dinheiro
// apareceria duas vezes, uma das vezes numa linha sem item nenhum.

export type LinhaDeVenda = {
  origem?: string | null;      // VENDA | ATENDIMENTO | INTERNACAO
  itens?: number | null;       // quantos itens a venda tem
  pago?: number | null;        // quanto ja entrou
};

/** A linha e uma venda de verdade, que a recepcao precisa ver e cobrar? */
export function ehVendaDeVerdade(r: LinhaDeVenda | null | undefined): boolean {
  if (!r) return false;
  // Atendimento clinico NAO some da lista: ele so nao deve nascer como venda (ver
  // appointments.service — nasceComoVenda).
  if (r.origem !== 'INTERNACAO') return true;
  const itens = Number(r.itens) || 0;
  const pago = Number(r.pago) || 0;
  return itens > 0 || pago > 0;
}
