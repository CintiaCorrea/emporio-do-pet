import { comData, jaEstaNaConta } from './conta-da-internacao.regras';

// Os casos reais da internação da Luna (medidos em 17/09/2026).
const CONTA = [
  { descricao: 'CERENIA — aplicação 06:15', at: '2026-09-16T09:15:00.000Z', medLogId: 'log-1' },
  { descricao: 'DIPIRONA — aplicação 06:40', at: '2026-09-16T09:40:00.000Z' },
  { descricao: 'DIPIRONA — aplicação 14:40', at: '2026-09-16T17:40:00.000Z' },
];

describe('a conta da internação', () => {
  it('todo item nasce com data e hora', () => {
    const agora = new Date('2026-09-17T12:00:00.000Z');
    expect(comData({ descricao: 'Fluidoterapia' }, agora).at).toBe('2026-09-17T12:00:00.000Z');
    expect(comData({ descricao: 'X', at: 'banana' }, agora).at).toBe('2026-09-17T12:00:00.000Z');
    expect(comData({ descricao: 'X', at: '2026-09-16T09:15:00.000Z' }, agora).at).toBe('2026-09-16T09:15:00.000Z');
  });

  it('a mesma aplicação da prescrição não cobra duas vezes', () => {
    expect(jaEstaNaConta(CONTA, { descricao: 'CERENIA — aplicação 06:15', at: '2026-09-16T09:15:00.000Z', medLogId: 'log-1' })).toBe(true);
  });

  it('o mesmo item no mesmo minuto é clique repetido', () => {
    expect(jaEstaNaConta(CONTA, { descricao: 'cerenia — aplicação 06:15', at: '2026-09-16T09:15:30.000Z' })).toBe(true);
  });

  it('duas doses em horários diferentes continuam entrando', () => {
    expect(jaEstaNaConta(CONTA, { descricao: 'DIPIRONA — aplicação 22:40', at: '2026-09-16T01:40:00.000Z' })).toBe(false);
  });

  it('item novo, sem parecido na conta, entra', () => {
    expect(jaEstaNaConta(CONTA, { descricao: 'Transfusão de sangue', at: '2026-09-16T15:35:00.000Z' })).toBe(false);
  });
});
