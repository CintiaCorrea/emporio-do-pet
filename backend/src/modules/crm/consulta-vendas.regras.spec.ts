import { pagoDaVenda, abertoDaVenda, situacaoDaVenda } from './consulta-vendas.regras';

describe('Consulta de vendas — as contas de dinheiro fecham', () => {
  it('soma os recebimentos da venda', () => {
    expect(pagoDaVenda(500, [{ valorTotal: 200 }, { valorTotal: 150 }])).toBe(350);
    expect(abertoDaVenda(500, [{ valorTotal: 200 }, { valorTotal: 150 }])).toBe(150);
  });

  it('pagamento a maior NAO vira saldo negativo', () => {
    // Troco e assunto do caixa. Se entrasse aqui, esta venda tiraria R$ 50 do "a receber" do
    // periodo e o total da tela nao fecharia com mais nada.
    expect(pagoDaVenda(100, [{ valorTotal: 150 }])).toBe(100);
    expect(abertoDaVenda(100, [{ valorTotal: 150 }])).toBe(0);
  });

  it('venda sem recebimento esta inteira em aberto', () => {
    expect(pagoDaVenda(300, [])).toBe(0);
    expect(abertoDaVenda(300, null)).toBe(300);
    expect(situacaoDaVenda(300, [])).toBe('ABERTA');
  });

  it('reconhece a baixa parcial', () => {
    expect(situacaoDaVenda(500, [{ valorTotal: 200 }])).toBe('PARCIAL');
  });

  it('um centavo de arredondamento nao deixa a venda eternamente parcial', () => {
    expect(situacaoDaVenda(100, [{ valorTotal: 99.995 }])).toBe('PAGA');
  });

  it('venda paga por inteiro', () => {
    expect(situacaoDaVenda(250, [{ valorTotal: 100 }, { valorTotal: 150 }])).toBe('PAGA');
  });

  it('valor zerado nao vira venda paga', () => {
    // Venda de R$ 0 sem recebimento e cadastro pela metade, nao dinheiro que entrou.
    expect(situacaoDaVenda(0, [])).toBe('ABERTA');
  });

  it('lixo no valor ou no recebimento nao contamina a conta', () => {
    expect(pagoDaVenda('abc' as any, [{ valorTotal: null }, {} as any])).toBe(0);
    expect(abertoDaVenda(null, undefined)).toBe(0);
  });
});
