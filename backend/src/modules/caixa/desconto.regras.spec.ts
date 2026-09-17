import { avaliarDesconto, percentualDaForma, percentualDoPagamento, ratearDesconto } from './desconto.regras';

/**
 * DESCONTO PERMITIDO POR FORMA DE PAGAMENTO.
 *
 * Cintia, 16/09/2026: "adm não tem limite e todos os outros são livres até 5% no PIX e em
 * dinheiro. São essas as regras, qualquer outra coisa não." As formas abaixo são as da casa
 * naquele dia: Dinheiro e PIX 5%, cartões 0%.
 */
const CASA = [
  { nome: 'Dinheiro', descontoMax: '5' },
  { nome: 'Infinity PIX', descontoMax: '5' },
  { nome: 'Nubank PIX', descontoMax: '5' },
  { nome: 'InfinityPay', descontoMax: '0' },
  { nome: 'Nubank', descontoMax: '0' },
  { nome: 'Crédito do cliente', descontoMax: '' },
];

describe('o % de cada forma', () => {
  it('usa o da própria forma', () => {
    expect(percentualDaForma('Nubank PIX', CASA)).toBe(5);
    expect(percentualDaForma('Dinheiro', CASA)).toBe(5);
  });

  it('cartão: zero', () => {
    expect(percentualDaForma('InfinityPay', CASA)).toBe(0);
  });

  it('forma sem % próprio NÃO tem desconto — o "limite geral" saiu', () => {
    expect(percentualDaForma('Crédito do cliente', CASA)).toBe(0);
    expect(percentualDaForma('Forma que ninguém cadastrou', CASA)).toBe(0);
  });

  it('não liga para acento nem maiúscula no nome', () => {
    expect(percentualDaForma('nubank pix', CASA)).toBe(5);
  });
});

describe('pagamento dividido entre formas', () => {
  it('é a média PESADA pelo valor', () => {
    expect(percentualDoPagamento([{ forma: 'Nubank PIX', valor: 100 }, { forma: 'InfinityPay', valor: 100 }], CASA)).toBeCloseTo(2.5);
  });

  it('R$ 1 no PIX não dá o desconto do PIX para a venda inteira', () => {
    expect(percentualDoPagamento([{ forma: 'Nubank PIX', valor: 1 }, { forma: 'InfinityPay', valor: 999 }], CASA)).toBeLessThan(0.01);
  });

  it('sem forma ainda (venda salva a receber): vale o maior % cadastrado; confere de novo ao receber', () => {
    expect(percentualDoPagamento([], CASA)).toBe(5);
  });
});

describe('o desconto cabe?', () => {
  it('5% no PIX: passa', () => {
    expect(avaliarDesconto({ bruto: 200, desconto: 10, formas: [{ forma: 'Nubank PIX', valor: 190 }], formasCadastradas: CASA }).ok).toBe(true);
  });

  it('5% no cartão: recusa, diz a forma e o permitido, e não fala em gerente', () => {
    const r = avaliarDesconto({ bruto: 200, desconto: 10, formas: [{ forma: 'InfinityPay', valor: 190 }], formasCadastradas: CASA });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.mensagem).toContain('InfinityPay');
      expect(r.mensagem).toContain('(0%)');
      expect(r.mensagem).toContain('só pelo administrativo');
      expect(r.mensagem).not.toMatch(/gerente/i);
    }
  });

  it('6% no dinheiro: recusa', () => {
    expect(avaliarDesconto({ bruto: 100, desconto: 6, formas: [{ forma: 'Dinheiro', valor: 94 }], formasCadastradas: CASA }).ok).toBe(false);
  });

  it('crédito do cliente não tem desconto', () => {
    expect(avaliarDesconto({ bruto: 100, desconto: 1, formas: [{ forma: 'Crédito do cliente', valor: 99 }], formasCadastradas: CASA }).ok).toBe(false);
  });

  it('arredondamento de centavo não recusa quem digitou o valor certo', () => {
    // 5% de R$ 33,33 = R$ 1,6665; a pessoa digita R$ 1,67.
    expect(avaliarDesconto({ bruto: 33.33, desconto: 1.67, formas: [{ forma: 'Dinheiro', valor: 31.66 }], formasCadastradas: CASA }).ok).toBe(true);
  });

  it('sem desconto nenhum, qualquer forma passa', () => {
    expect(avaliarDesconto({ bruto: 200, desconto: 0, formas: [{ forma: 'InfinityPay', valor: 200 }], formasCadastradas: CASA }).ok).toBe(true);
  });
});

describe('o desconto geral dividido entre os itens', () => {
  // A #1229 (15/09/2026): itens somando R$ 1.563,00 e R$ 78,15 de desconto no total — a venda
  // ficou em R$ 1.484,85 e não batia com os itens. Os itens abaixo têm a mesma soma.
  const ITENS = [
    { descricao: 'Consulta', valorTotal: 170, desconto: 0 },
    { descricao: 'Exame', valorTotal: 1263, desconto: 0 },
    { descricao: 'Medicação', valorTotal: 130, desconto: 0 },
  ];

  it('a soma dos itens bate com a venda, ao centavo', () => {
    const r = ratearDesconto(ITENS, 78.15);
    const soma = Math.round(r.reduce((s, it) => s + it.valorTotal, 0) * 100) / 100;
    expect(soma).toBe(1484.85);
    const desc = Math.round(r.reduce((s, it) => s + Number(it.desconto), 0) * 100) / 100;
    expect(desc).toBe(78.15);
  });

  it('cada linha leva a sua parte, proporcional ao valor', () => {
    const r = ratearDesconto(ITENS, 78.15);
    expect(r[1].desconto).toBeGreaterThan(r[0].desconto!);
    expect(r[0].desconto).toBeCloseTo(8.5, 1);   // 170 de 1563 → ~5% de 170
  });

  it('soma ao desconto que o item já tinha', () => {
    const r = ratearDesconto([{ valorTotal: 90, desconto: 10 }, { valorTotal: 10, desconto: 0 }], 5);
    expect(r[0].desconto).toBe(14.5);
    expect(r[0].valorTotal).toBe(85.5);
    expect(r[1].valorTotal).toBe(9.5);
  });

  it('item de convênio não entra — não é o cliente que paga', () => {
    const r = ratearDesconto([{ valorTotal: 100, desconto: 0, convenioId: 'conv' }, { valorTotal: 100, desconto: 0 }], 5);
    expect(r[0].valorTotal).toBe(100);
    expect(r[1].valorTotal).toBe(95);
  });

  it('centavos que não dividem certinho não somem nem sobram', () => {
    const r = ratearDesconto([{ valorTotal: 10 }, { valorTotal: 10 }, { valorTotal: 10 }], 1);
    expect(Math.round(r.reduce((s, it) => s + Number((it as any).desconto), 0) * 100)).toBe(100);
  });

  it('nenhuma linha fica negativa', () => {
    const r = ratearDesconto([{ valorTotal: 0.01 }, { valorTotal: 50 }], 60);
    expect(r.every((it) => it.valorTotal >= 0)).toBe(true);
  });

  it('sem desconto, nada muda', () => {
    expect(ratearDesconto(ITENS, 0)).toEqual(ITENS);
  });
});
