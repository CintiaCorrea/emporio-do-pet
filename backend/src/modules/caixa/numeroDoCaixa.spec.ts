import { numeroDoProximoCaixa } from './caixa.regras';

describe('numeroDoProximoCaixa', () => {
  it('do zero, comeca no 1', () => {
    expect(numeroDoProximoCaixa([])).toBe(1);
  });

  it('segue o maior, nao a quantidade', () => {
    expect(numeroDoProximoCaixa([1, 2, 3])).toBe(4);
  });

  it('O CASO REAL: nove caixas apagados nao devolvem numero ao estoque', () => {
    // Em 09/09 sobraram 12 caixas, mas o maior numero entregue era 20. Com `count + 1` o
    // proximo saía 13 — um numero que ja existia. Foi assim que nasceram dois caixas nº 11.
    const sobraram = [1, 2, 4, 8, 11, 12, 13, 14, 15, 17, 18, 20];
    expect(numeroDoProximoCaixa(sobraram)).toBe(21);
    expect(sobraram.length + 1).toBe(13); // o que a regra antiga teria devolvido
  });

  it('ignora nulo e lixo', () => {
    expect(numeroDoProximoCaixa([3, null, undefined, NaN as any, 7])).toBe(8);
  });
});
