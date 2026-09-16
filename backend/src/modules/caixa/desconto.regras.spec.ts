import { avaliarDesconto, percentualDaForma, percentualDoPagamento } from './desconto.regras';

/**
 * DESCONTO PERMITIDO POR FORMA DE PAGAMENTO.
 *
 * Cintia, 16/09/2026: "o caixa tem autorização de dar 5% de desconto nas vendas à vista e no PIX".
 * Os valores abaixo são os da casa: dinheiro e PIX 5%, cartão e link 0%, limite geral 5%.
 */
const CASA = [
  { nome: 'Dinheiro', descontoMax: 5 },
  { nome: 'Infinity PIX', descontoMax: 5 },
  { nome: 'Nubank PIX', descontoMax: 5 },
  { nome: 'InfinityPay', descontoMax: 0 },
  { nome: 'Nubank', descontoMax: 0 },
  { nome: 'Crédito do cliente', descontoMax: '' },
];

describe('o % de cada forma', () => {
  it('usa o da própria forma', () => {
    expect(percentualDaForma('Nubank PIX', CASA, 5)).toBe(5);
  });

  it('ZERO na forma é "nenhum desconto" — é assim que o cartão fica sem desconto', () => {
    expect(percentualDaForma('InfinityPay', CASA, 5)).toBe(0);
  });

  it('forma sem valor próprio segue o limite geral', () => {
    expect(percentualDaForma('Crédito do cliente', CASA, 5)).toBe(5);
    expect(percentualDaForma('Forma que ninguém cadastrou', CASA, 5)).toBe(5);
  });

  it('no limite GERAL, zero continua sendo "sem limite", como a Configuração de vendas explica', () => {
    expect(percentualDaForma('Crédito do cliente', CASA, 0)).toBeNull();
  });

  it('não liga para acento nem maiúscula no nome', () => {
    expect(percentualDaForma('nubank pix', CASA, 5)).toBe(5);
  });
});

describe('pagamento dividido entre formas', () => {
  it('é a média PESADA pelo valor', () => {
    const pct = percentualDoPagamento([{ forma: 'Nubank PIX', valor: 100 }, { forma: 'InfinityPay', valor: 100 }], CASA, 5);
    expect(pct).toBeCloseTo(2.5);
  });

  it('R$ 1 no PIX não dá o desconto do PIX para a venda inteira', () => {
    const pct = percentualDoPagamento([{ forma: 'Nubank PIX', valor: 1 }, { forma: 'InfinityPay', valor: 999 }], CASA, 5)!;
    expect(pct).toBeLessThan(0.01);
  });

  it('sem forma ainda (venda salva a receber): vale o limite geral', () => {
    expect(percentualDoPagamento([], CASA, 5)).toBe(5);
  });
});

describe('o desconto cabe?', () => {
  it('5% no PIX: passa', () => {
    expect(avaliarDesconto({ bruto: 200, desconto: 10, formas: [{ forma: 'Nubank PIX', valor: 190 }], formasCadastradas: CASA, limiteGeral: 5 }).ok).toBe(true);
  });

  it('5% no cartão: recusa, e diz a forma e o permitido', () => {
    const r = avaliarDesconto({ bruto: 200, desconto: 10, formas: [{ forma: 'InfinityPay', valor: 190 }], formasCadastradas: CASA, limiteGeral: 5 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.mensagem).toContain('InfinityPay');
      expect(r.mensagem).toContain('(0%)');
      expect(r.mensagem).toMatch(/liberação de um gerente/);
    }
  });

  it('arredondamento de centavo não recusa quem digitou o valor certo', () => {
    // 5% de R$ 33,33 = R$ 1,6665; a pessoa digita R$ 1,67.
    expect(avaliarDesconto({ bruto: 33.33, desconto: 1.67, formas: [{ forma: 'Dinheiro', valor: 31.66 }], formasCadastradas: CASA, limiteGeral: 5 }).ok).toBe(true);
  });

  it('sem desconto nenhum, qualquer forma passa', () => {
    expect(avaliarDesconto({ bruto: 200, desconto: 0, formas: [{ forma: 'InfinityPay', valor: 200 }], formasCadastradas: CASA, limiteGeral: 5 }).ok).toBe(true);
  });

  it('a mensagem casa com o que a tela já reconhece para pedir a liberação', () => {
    // O ponto de venda pede e-mail e senha do gerente quando a mensagem diz isto.
    const r = avaliarDesconto({ bruto: 100, desconto: 6, formas: [{ forma: 'Dinheiro', valor: 94 }], formasCadastradas: CASA, limiteGeral: 5 });
    expect(!r.ok && /liberação de um gerente|passa do limite/i.test(r.mensagem)).toBe(true);
  });
});
