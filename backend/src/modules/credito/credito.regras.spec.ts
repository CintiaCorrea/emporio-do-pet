import { classificarSaldo, realizadaAReceber } from './credito.regras';

// BLINDAGEM do saldo do cliente (tela "Saldo dos clientes").
describe('credito.regras', () => {
  describe('classificarSaldo (crédito − a receber)', () => {
    it('credor quando tem mais crédito que dívida', () => {
      expect(classificarSaldo(100, 30)).toEqual({ saldo: 70, situacao: 'CREDOR' });
    });
    it('devedor quando deve mais do que tem de crédito', () => {
      expect(classificarSaldo(10, 50)).toEqual({ saldo: -40, situacao: 'DEVEDOR' });
    });
    it('saldo zero conta como CREDOR', () => {
      expect(classificarSaldo(50, 50)).toEqual({ saldo: 0, situacao: 'CREDOR' });
    });
    it('arredonda para 2 casas (sem lixo de ponto flutuante)', () => {
      expect(classificarSaldo(0.3, 0.1).saldo).toBe(0.2); // 0.3-0.1 = 0.2, não 0.199999
    });
    it('só crédito / só dívida', () => {
      expect(classificarSaldo(80, 0)).toEqual({ saldo: 80, situacao: 'CREDOR' });
      expect(classificarSaldo(0, 25.5)).toEqual({ saldo: -25.5, situacao: 'DEVEDOR' });
    });
  });

  describe('realizadaAReceber (a conta já é devida?)', () => {
    const now = new Date('2026-08-11T12:00:00Z');
    it('conta como realizada se concluída (COMPLETED/DONE)', () => {
      expect(realizadaAReceber('COMPLETED', new Date('2027-01-01'), now)).toBe(true);
      expect(realizadaAReceber('DONE', new Date('2027-01-01'), now)).toBe(true);
    });
    it('conta como realizada se a data já passou', () => {
      expect(realizadaAReceber('SCHEDULED', new Date('2026-08-01'), now)).toBe(true);
    });
    it('NÃO conta se é futura e não concluída', () => {
      expect(realizadaAReceber('SCHEDULED', new Date('2026-12-01'), now)).toBe(false);
    });
  });
});
