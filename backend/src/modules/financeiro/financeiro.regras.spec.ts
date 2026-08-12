import { ratearCentavos, competenciaMes, dataExpiracao, reconhecimentoPacote, calcDevolucao } from './financeiro.regras';

// BLINDAGEM das fórmulas financeiras (pacotes/DRE F2 + devolução). Tudo em centavos.
describe('financeiro.regras', () => {
  describe('ratearCentavos — soma sempre exata', () => {
    it('divide igual quando dá', () => {
      expect(ratearCentavos(1000, 4)).toEqual([250, 250, 250, 250]);
    });
    it('a última parcela absorve o resíduo', () => {
      expect(ratearCentavos(100, 3)).toEqual([33, 33, 34]);
      expect(ratearCentavos(7, 2)).toEqual([3, 4]);
    });
    it('a soma das parcelas é sempre o total (sem perder centavos)', () => {
      for (const [t, n] of [[10000, 3], [999, 7], [12345, 12], [1, 4]] as [number, number][]) {
        const p = ratearCentavos(t, n);
        expect(p.reduce((s, v) => s + v, 0)).toBe(t);
        expect(p.length).toBe(n);
      }
    });
    it('N inválido vira 1 parcela', () => {
      expect(ratearCentavos(500, 0)).toEqual([500]);
    });
  });

  describe('reconhecimentoPacote — diferimento + breakage', () => {
    const base = { valorCent: 10000, nSessoes: 4 };
    it('1 sessão usada, não expirado → reconhece 1/N, resto diferido, sem quebra', () => {
      expect(reconhecimentoPacote({ ...base, sessoesUsadas: 1, expirado: false }))
        .toEqual({ reconhecidoAgora: 2500, diferido: 7500, breakage: 0 });
    });
    it('expirado com sessões não usadas → resto vira breakage, nada diferido', () => {
      expect(reconhecimentoPacote({ ...base, sessoesUsadas: 1, expirado: true }))
        .toEqual({ reconhecidoAgora: 2500, diferido: 0, breakage: 7500 });
    });
    it('todas usadas → tudo reconhecido, sem diferido nem quebra', () => {
      expect(reconhecimentoPacote({ ...base, sessoesUsadas: 4, expirado: false }))
        .toEqual({ reconhecidoAgora: 10000, diferido: 0, breakage: 0 });
    });
    it('reconhecido + diferido + breakage = valor total (invariante)', () => {
      const r = reconhecimentoPacote({ valorCent: 9999, nSessoes: 7, sessoesUsadas: 3, expirado: false });
      expect(r.reconhecidoAgora + r.diferido + r.breakage).toBe(9999);
    });
  });

  describe('calcDevolucao — devolve o líquido (bruto − taxa)', () => {
    it('à vista com taxa de cartão', () => {
      const r = calcDevolucao({ itensValor: [80], taxaPct: 3, parcelas: 1 });
      expect(r.brutoCent).toBe(8000);
      expect(r.taxaCent).toBe(240);
      expect(r.liquidoCent).toBe(7760);
      expect(r.parcelasCent).toEqual([7760]);
    });
    it('sem taxa → líquido = bruto', () => {
      const r = calcDevolucao({ itensValor: [50, 30], taxaPct: 0, parcelas: 1 });
      expect(r.brutoCent).toBe(8000);
      expect(r.taxaCent).toBe(0);
      expect(r.liquidoCent).toBe(8000);
    });
    it('parcelado espelha em N e soma = líquido', () => {
      const r = calcDevolucao({ itensValor: [100], taxaPct: 0, parcelas: 3 });
      expect(r.parcelasCent.reduce((s, v) => s + v, 0)).toBe(r.liquidoCent);
      expect(r.parcelasCent.length).toBe(3);
    });
  });

  describe('competência e expiração', () => {
    it('competenciaMes = 1º dia do mês (UTC)', () => {
      expect(competenciaMes(new Date('2026-08-11T23:00:00Z')).toISOString()).toBe('2026-08-01T00:00:00.000Z');
    });
    it('dataExpiracao soma meses ou dias conforme a unidade', () => {
      const inicio = new Date('2026-01-15T00:00:00Z');
      expect(dataExpiracao(inicio, 3, 'meses').getUTCMonth()).toBe(3); // jan(0)+3 = abr(3)
      const emDias = dataExpiracao(inicio, 10, 'Dias');
      expect(Math.round((emDias.getTime() - inicio.getTime()) / 86400000)).toBe(10);
    });
  });
});
