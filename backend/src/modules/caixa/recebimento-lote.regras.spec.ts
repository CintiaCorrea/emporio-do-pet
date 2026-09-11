import { distribuirPagamento, totalEmAberto, repartirFormas } from './recebimento-lote.regras';

// 🛡️ UM PAGAMENTO SÓ, VÁRIAS COMANDAS (Cintia, 11/09/2026).
// A regra que ela escolheu: quita da MAIS ANTIGA para a mais nova.

const comandas = [
  { id: 'c3', aberto: 300, data: '2026-09-05' },
  { id: 'c1', aberto: 200, data: '2026-09-01' },   // fora de ordem de propósito
  { id: 'c2', aberto: 500, data: '2026-09-03' },
];

describe('distribuição de um pagamento entre comandas', () => {
  it('paga tudo: todas quitam', () => {
    const { partes, sobra } = distribuirPagamento(comandas, 1000);
    expect(partes.map((p) => p.appointmentId)).toEqual(['c1', 'c2', 'c3']);
    expect(partes.every((p) => p.quita)).toBe(true);
    expect(sobra).toBe(0);
  });

  it('paga parte: fecha as antigas e deixa UMA parcial', () => {
    // R$ 600 de R$ 1.000 → c1 (200) e c2 (500) precisariam de 700; então c1 fecha e c2 fica em 400.
    const { partes } = distribuirPagamento(comandas, 600);
    expect(partes).toEqual([
      { appointmentId: 'c1', valor: 200, quita: true },
      { appointmentId: 'c2', valor: 400, quita: false },
    ]);
    // c3 nem aparece: comanda não tocada não vira recebimento de R$ 0,00 no extrato.
    expect(partes.find((p) => p.appointmentId === 'c3')).toBeUndefined();
  });

  it('a soma distribuída bate EXATAMENTE com o que entrou', () => {
    for (const pago of [1, 199.99, 200, 333.33, 700.01, 999.99, 1000]) {
      const { partes, sobra } = distribuirPagamento(comandas, pago);
      const soma = partes.reduce((s, p) => s + p.valor, 0);
      expect(+(soma + sobra).toFixed(2)).toBe(+pago.toFixed(2));
    }
  });

  it('centavos não somem: 0,01 vai para a comanda mais antiga', () => {
    const { partes } = distribuirPagamento(comandas, 0.01);
    expect(partes).toEqual([{ appointmentId: 'c1', valor: 0.01, quita: false }]);
  });

  it('pagou MAIS que a conta: o excedente volta como sobra, para virar troco ou crédito', () => {
    const { partes, sobra } = distribuirPagamento(comandas, 1200);
    expect(partes.every((p) => p.quita)).toBe(true);
    expect(sobra).toBe(200);
  });

  it('valor zero ou lista vazia não gera recebimento nenhum', () => {
    expect(distribuirPagamento(comandas, 0).partes).toEqual([]);
    expect(distribuirPagamento([], 500).partes).toEqual([]);
  });

  it('comanda já quitada é ignorada', () => {
    const { partes } = distribuirPagamento([{ id: 'x', aberto: 0, data: '2026-09-01' }, ...comandas], 250);
    expect(partes[0].appointmentId).toBe('c1');
  });

  it('totalEmAberto soma o que falta receber', () => {
    expect(totalEmAberto(comandas)).toBe(1000);
  });
});

describe('as formas de pagamento seguem para a venda certa', () => {
  it('reparte na ordem em que foram lancadas', () => {
    // R$ 600 como Pix 400 + Dinheiro 200, distribuidos em c1=200 e c2=400.
    const { partes } = distribuirPagamento(comandas, 600);
    const r = repartirFormas([{ forma: 'Pix', valor: 400 }, { forma: 'Dinheiro', valor: 200 }], partes);
    expect(r[0].formas).toEqual([{ forma: 'Pix', valor: 200 }]);
    expect(r[1].formas).toEqual([{ forma: 'Pix', valor: 200 }, { forma: 'Dinheiro', valor: 200 }]);
  });

  it('cada parte recebe exatamente o seu valor em formas', () => {
    const { partes } = distribuirPagamento(comandas, 850);
    const r = repartirFormas([{ forma: 'Cartao', valor: 500 }, { forma: 'Pix', valor: 350 }], partes);
    for (const p of r) {
      const soma = p.formas.reduce((s, f) => s + Number(f.valor || 0), 0);
      expect(+soma.toFixed(2)).toBe(p.valor);
    }
  });

  it('leva junto NSU, AUT e operadora do cartao — e o que liga a taxa a venda no DRE', () => {
    const { partes } = distribuirPagamento(comandas, 700);
    const r = repartirFormas([{ forma: 'Cartao de credito', valor: 700, nsu: '123456', aut: 'A9', operadora: 'Cielo', parcelas: 3 }], partes);
    for (const p of r) {
      expect(p.formas[0]).toMatchObject({ forma: 'Cartao de credito', nsu: '123456', aut: 'A9', operadora: 'Cielo', parcelas: 3 });
    }
  });

  it('nenhum centavo se perde na reparticao', () => {
    const { partes } = distribuirPagamento(comandas, 333.33);
    const r = repartirFormas([{ forma: 'Pix', valor: 333.33 }], partes);
    const total = r.reduce((s, p) => s + p.formas.reduce((x, f) => x + Number(f.valor || 0), 0), 0);
    expect(+total.toFixed(2)).toBe(333.33);
  });
});
