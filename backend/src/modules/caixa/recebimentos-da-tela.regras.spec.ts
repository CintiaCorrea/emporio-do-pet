import { condicaoDaForma, formasComCondicoes, rotuloDaForma } from './recebimentos-da-tela.regras';

// As baixas REAIS, como estão gravadas no banco (medido em 17/09/2026).
const B1141 = { valorTotal: 150, formas: [{ aut: 'EVQQEE', forma: 'InfinityPay', valor: 150, bandeira: 'Visa/Mastercard', parcelas: 2, adquirente: 'InfinityPay', modalidade: 'Crédito parcelado' }] };
const B1131 = { valorTotal: 150, formas: [{ aut: '022275', forma: 'InfinityPay', valor: 150, bandeira: 'Visa/Mastercard', adquirente: 'InfinityPay', modalidade: 'Crédito à vista' }] };
const B1130 = { valorTotal: 1052.1, formas: [{ forma: 'Infinity PIX', valor: 1052.1 }] };
const SEM_FORMA = { valorTotal: 80, formas: [] };

describe('recebimentos na tela', () => {
  it('a condição vem das parcelas; sem parcelas, da modalidade; sem nada, à vista', () => {
    expect(condicaoDaForma(B1141.formas[0])).toBe('Parcelado 2x');
    expect(condicaoDaForma(B1131.formas[0])).toBe('Crédito à vista');
    expect(condicaoDaForma(B1130.formas[0])).toBe('À vista');
    expect(rotuloDaForma(B1141.formas[0])).toBe('InfinityPay · Parcelado 2x');
  });

  it('o quadro de formas agrupa por forma, com as condições embaixo, e a baixa sem forma não some', () => {
    const q = formasComCondicoes([B1141, B1131, B1130, SEM_FORMA, { valorTotal: 0, formas: [[]] }]);
    expect(q).toEqual([
      { nome: 'Infinity PIX', valor: 1052.1, condicoes: [{ nome: 'À vista', valor: 1052.1 }] },
      { nome: 'InfinityPay', valor: 300, condicoes: [{ nome: 'Parcelado 2x', valor: 150 }, { nome: 'Crédito à vista', valor: 150 }] },
      { nome: 'Sem forma', valor: 80, condicoes: [{ nome: 'À vista', valor: 80 }] },
    ]);
  });
});
