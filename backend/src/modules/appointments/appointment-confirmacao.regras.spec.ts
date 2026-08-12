import { podeConfirmar, STATUS_NAO_CONFIRMAVEL } from './appointment-confirmacao.regras';

// BLINDAGEM: agendamento MORTO nunca pode ser confirmado (senão vira duplicado ao "ressuscitar").
describe('podeConfirmar — trava anti-duplicado (Margarida 12/08)', () => {
  it('REMARCADO não pode confirmar (a raiz do bug)', () => {
    expect(podeConfirmar('Remarcado')).toBe(false);
    expect(podeConfirmar('REMARCADO')).toBe(false);
  });
  it('cancelado / concluído / realizado / bloqueada não confirmam', () => {
    for (const s of ['Cancelado', 'CANCELLED', 'Concluído', 'CONCLUIDO', 'Realizado', 'NO_SHOW', 'Bloqueada']) {
      expect(podeConfirmar(s)).toBe(false);
    }
  });
  it('agendamento vivo (Agendado/Confirmado/Em espera/vazio) PODE confirmar', () => {
    for (const s of ['Agendado', 'Confirmado', 'Em espera', 'Atrasado', '', null, undefined]) {
      expect(podeConfirmar(s as any)).toBe(true);
    }
  });
  it('a lista inclui explicitamente Remarcado (não pode sumir num refactor)', () => {
    expect(STATUS_NAO_CONFIRMAVEL).toContain('Remarcado');
    expect(STATUS_NAO_CONFIRMAVEL).toContain('Cancelado');
  });
});
