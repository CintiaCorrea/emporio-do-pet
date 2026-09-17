import { abertoDaCobranca, CORTE_DA_COBRANCA, ehHistorico, entraNaCobranca, ondeEntraNaCobranca } from './cobranca.regras';

// Casos reais do banco (17/09/2026).
const V1061_LIA = { numeroVenda: 1061, type: 'Venda', notes: null, date: '2026-08-28T15:00:00.000Z', status: 'COMPLETED' };
const V1128_PIXIE = { numeroVenda: 1128, type: 'Venda', notes: null, date: '2026-09-03T15:00:00.000Z', status: 'COMPLETED' };
const REGISTRO_REGINALDO = { numeroVenda: null, type: 'CONSULTA', notes: '{"type":"HOSPITALIZATION","dailyRate":150}', date: '2026-09-05T15:00:00.000Z', status: 'DISCHARGED' };

describe('o que entra na cobrança', () => {
  it('o corte é 31/08 às 23:59 de Fortaleza', () => {
    expect(CORTE_DA_COBRANCA).toBe('2026-08-31T23:59:59-03:00');
    expect(ehHistorico('2026-09-01T02:59:59.000Z')).toBe(true);   // 31/08 23:59:59 em Fortaleza
    expect(ehHistorico('2026-09-01T03:00:00.000Z')).toBe(false);  // 01/09 00:00 em Fortaleza
  });

  it('venda de agosto é histórico; venda de setembro cobra', () => {
    expect(entraNaCobranca(V1061_LIA)).toBe(false);
    expect(entraNaCobranca(V1128_PIXIE)).toBe(true);
  });

  it('registro de internação não é cobrança (os R$ 150 do Reginaldo)', () => {
    expect(entraNaCobranca(REGISTRO_REGINALDO)).toBe(false);
  });

  it('venda cancelada não é cobrança', () => {
    expect(entraNaCobranca({ ...V1128_PIXIE, status: 'CANCELLED' })).toBe(false);
  });

  it('aberto é valor menos recebido, nunca negativo', () => {
    expect(abertoDaCobranca(373, [{ valorTotal: 4.75 }])).toBe(368.25);
    expect(abertoDaCobranca(856.85, [{ valorTotal: 1936.6 }])).toBe(0);
  });

  it('a consulta ao banco leva a regra de venda, o corte e o cancelamento', () => {
    const w = ondeEntraNaCobranca();
    expect(w.AND).toContainEqual({ numeroVenda: { not: null } });
    expect(w.AND).toContainEqual({ date: { gt: new Date(CORTE_DA_COBRANCA) } });
    expect(w.AND).toContainEqual({ status: { not: 'CANCELLED' } });
  });
});

// P1 (17/09/2026): a regra de venda chegou aos relatórios. Antes, gráficos, ranking e painel
// contavam "qualquer atendimento com valor" — os registros de internação (R$ 532,80) entravam.
describe('os relatórios usam a regra única', () => {
  const ler = (p: string[]) => require('fs').readFileSync(require('path').join(__dirname, '..', ...p), 'utf8');
  const caixa = ler(['modules', 'caixa', 'caixa.service.ts']);
  const dash = ler(['modules', 'dashboard', 'dashboard.service.ts']);

  it('gráficos de vendas e ranking de clientes só contam venda', () => {
    expect(caixa).toContain("status: { not: 'CANCELLED' }, AND: ondeEVenda().AND }");
    expect(caixa).toContain("date: { gte: d365 }, status: { not: 'CANCELLED' }, AND: ondeEVenda().AND }");
  });

  it('o a receber do painel usa a regra de cobrança', () => {
    expect(dash).toContain('ondeEntraNaCobranca().AND');
  });
});
