import { planejarDevolucao } from './devolucao-efeitos.regras';

const item = (p: any) => ({ id: 'i1', quantidade: 1, valorUnitario: 100, desconto: 0, ...p });

describe('Devolucao — as tres consequencias', () => {
  it('devolve o liquido da linha, nao o cheio', () => {
    // Item de R$ 100 com R$ 20 de desconto entrou por R$ 80. Estornar 100 devolveria dinheiro
    // que nunca entrou no caixa.
    const p = planejarDevolucao([item({ desconto: 20 })], [{ itemId: 'i1' }]);
    expect(p.total).toBe(80);
  });

  it('devolucao parcial estorna a parte proporcional', () => {
    const p = planejarDevolucao([item({ quantidade: 4, valorUnitario: 50, desconto: 40 })], [{ itemId: 'i1', quantidade: 1 }]);
    // Linha: 4 x 50 - 40 = 160 liquido; devolvendo 1 de 4 -> 40.
    expect(p.total).toBe(40);
    expect(p.linhas[0].quantidade).toBe(1);
  });

  it('nao devolve mais do que foi vendido', () => {
    const p = planejarDevolucao([item({ quantidade: 2 })], [{ itemId: 'i1', quantidade: 9 }]);
    expect(p.linhas[0].quantidade).toBe(2);
    expect(p.total).toBe(200);
  });

  it('so volta pro estoque o que controla estoque', () => {
    const p = planejarDevolucao([
      item({ id: 'produto', catalogoItemId: 'c1', controlaEstoque: true }),
      item({ id: 'servico', catalogoItemId: 'c2', controlaEstoque: false }),
      item({ id: 'solto' }),
    ], [{ itemId: 'produto' }, { itemId: 'servico' }, { itemId: 'solto' }]);
    expect(p.linhas.find((l) => l.itemId === 'produto')!.devolveAoEstoque).toBe(true);
    expect(p.linhas.find((l) => l.itemId === 'servico')!.devolveAoEstoque).toBe(false);
    expect(p.linhas.find((l) => l.itemId === 'solto')!.devolveAoEstoque).toBe(false);
  });

  it('retira a comissao que ainda nao foi fechada', () => {
    const p = planejarDevolucao([item({ comissaoCalculada: 15 })], [{ itemId: 'i1' }]);
    expect(p.linhas[0].retiraComissao).toBe(true);
    expect(p.comissoesTravadas).toBe(0);
  });

  it('comissao JA FECHADA em extrato nao e mexida — e a tela avisa', () => {
    // O fechamento do dia 30 e um acerto com pessoas. Desfazer por dentro, depois de pago, e
    // pior do que deixar e resolver na mao.
    const p = planejarDevolucao([item({ comissaoCalculada: 15, comissaoExtratoId: 'ext1' })], [{ itemId: 'i1' }]);
    expect(p.linhas[0].retiraComissao).toBe(false);
    expect(p.linhas[0].comissaoTravada).toBe(true);
    expect(p.comissoesTravadas).toBe(1);
  });

  it('item que nao esta na venda e ignorado', () => {
    const p = planejarDevolucao([item({})], [{ itemId: 'outro' }]);
    expect(p.linhas).toEqual([]);
    expect(p.total).toBe(0);
  });

  it('quantidade zero ou negativa nao devolve nada', () => {
    expect(planejarDevolucao([item({})], [{ itemId: 'i1', quantidade: 0 }]).linhas).toEqual([]);
    expect(planejarDevolucao([item({})], [{ itemId: 'i1', quantidade: -3 }]).linhas).toEqual([]);
  });

  it('sem pedido nenhum, plano vazio', () => {
    expect(planejarDevolucao([item({})], [])).toMatchObject({ linhas: [], total: 0 });
    expect(planejarDevolucao(null, null)).toMatchObject({ linhas: [], total: 0 });
  });

  it('lixo nos numeros nao vira estorno errado', () => {
    const p = planejarDevolucao([item({ valorUnitario: 'abc' as any, quantidade: null })], [{ itemId: 'i1' }]);
    expect(p.total).toBe(0);
  });
});
