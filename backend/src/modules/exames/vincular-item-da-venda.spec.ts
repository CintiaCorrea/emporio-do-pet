import { ligarAoItemDaVenda } from './vincular-item-da-venda';

// O VÍNCULO EXAME ↔ ITEM DA VENDA.
//
// É dele que depende a conta a pagar do laboratório nascer na coluna de retirada (Cintia,
// 07/09/2026), em vez de esperar o cliente pagar. Em 12/09/2026, 43 dos 46 cards do Kanban
// estavam sem vínculo — todos os vindos de orçamento — e a conta do lab ficava presa.

describe('ligarAoItemDaVenda', () => {
  const itens = [
    { id: 'i1', descricao: 'HEMOGRAMA COMPLETO' },
    { id: 'i2', descricao: 'ULTRASSOM ABDOMINAL' },
  ];

  it('casa pelo nome, ignorando caixa e espaço em volta', () => {
    const r = ligarAoItemDaVenda([{ descricao: '  hemograma completo ' }], itens);
    expect(r[0].appointmentItemId).toBe('i1');
  });

  it('o MESMO exame pedido duas vezes casa com itens DIFERENTES', () => {
    // Dois olhos, dois períodos, duas coletas: se os dois casassem com o primeiro item, a conta
    // do laboratório nasceria uma vez só e a outra ficaria esperando o cliente pagar.
    const dois = [{ id: 'i1', descricao: 'CITOLOGIA' }, { id: 'i2', descricao: 'CITOLOGIA' }];
    const r = ligarAoItemDaVenda([{ descricao: 'CITOLOGIA' }, { descricao: 'CITOLOGIA' }], dois);
    expect(r.map((x) => x.appointmentItemId)).toEqual(['i1', 'i2']);
  });

  it('exame repetido sem item de sobra fica sem vínculo, não rouba o do outro', () => {
    const r = ligarAoItemDaVenda([{ descricao: 'HEMOGRAMA COMPLETO' }, { descricao: 'HEMOGRAMA COMPLETO' }], itens);
    expect(r.map((x) => x.appointmentItemId)).toEqual(['i1', null]);
  });

  it('sem correspondência, devolve null — não chuta', () => {
    // Chutar criaria conta a pagar do lab amarrada ao item errado, e o erro só apareceria no
    // fechamento do mês, sem ninguém saber de onde veio.
    const r = ligarAoItemDaVenda([{ descricao: 'EXAME QUE NAO FOI VENDIDO' }], itens);
    expect(r[0].appointmentItemId).toBeNull();
  });

  it('preserva todos os outros campos do exame', () => {
    const r = ligarAoItemDaVenda(
      [{ descricao: 'HEMOGRAMA COMPLETO', fornecedorId: 'f1', custoUnitario: 42, origem: 'ORCAMENTO' }],
      itens,
    );
    expect(r[0]).toMatchObject({ fornecedorId: 'f1', custoUnitario: 42, origem: 'ORCAMENTO', appointmentItemId: 'i1' });
  });

  it('entradas vazias ou inválidas não quebram a venda', () => {
    // Esta função roda DENTRO da conversão do orçamento e da venda do PDV: estourar aqui
    // derrubaria a venda inteira por causa do exame.
    expect(ligarAoItemDaVenda([], itens)).toEqual([]);
    expect(ligarAoItemDaVenda(null as any, itens)).toEqual([]);
    expect(ligarAoItemDaVenda([{ descricao: 'X' }], null as any)[0].appointmentItemId).toBeNull();
    expect(ligarAoItemDaVenda([{ descricao: null }], itens)[0].appointmentItemId).toBeNull();
    expect(ligarAoItemDaVenda([{} as any], itens)[0].appointmentItemId).toBeNull();
  });

  it('item da venda sem id é ignorado', () => {
    const r = ligarAoItemDaVenda([{ descricao: 'X' }], [{ id: '', descricao: 'X' } as any]);
    expect(r[0].appointmentItemId).toBeNull();
  });
});
