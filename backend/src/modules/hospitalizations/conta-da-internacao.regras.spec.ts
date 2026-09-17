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

// Cintia, 16/09/2026: "item lançado depois de fechar ou pagar o dia vai para venda complementar".
import { novosDepoisDaCobranca } from './conta-da-internacao.regras';

describe('o que chegou depois de o dia ser cobrado', () => {
  const COBRADO_EM = '2026-09-16T18:00:00.000Z';
  const ITENS = [
    { descricao: 'Diária', _criadoEm: '2026-09-16T12:00:00.000Z' },
    { descricao: 'DIPIRONA', _criadoEm: '2026-09-16T20:30:00.000Z' },
    { descricao: 'CERENIA (já cobrada)', baixado: true, _criadoEm: '2026-09-16T21:00:00.000Z' },
  ];

  it('só entra na complementar o que foi lançado depois da cobrança', () => {
    expect(novosDepoisDaCobranca(ITENS, COBRADO_EM).map((i) => i.descricao)).toEqual(['DIPIRONA']);
  });

  it('sem hora de cobrança, ninguém é complementar (evita cobrar de novo o que já entrou)', () => {
    expect(novosDepoisDaCobranca(ITENS, null)).toEqual([]);
  });
});

// B5: a diária sai do cadastro, pela faixa de peso do animal (Cintia, 16/09/2026).
import { resolverDiaria } from './conta-da-internacao.regras';
import { precoPorPorte } from '../../common/porte';

const DIARIA = {
  nome: 'Diária de internação',
  preco: 0,
  faixas: [
    { ate: 10, rotulo: '0 a 10 kg', preco: 150 },
    { ate: 20, rotulo: '11 a 20 kg', preco: 175 },
    { ate: null, rotulo: 'acima de 20 kg', preco: 210 },
  ],
};

describe('a diária da internação', () => {
  it('sai do cadastro pela faixa do peso — a Luna, com 9 kg, paga 150', () => {
    const r = resolverDiaria(DIARIA, 9, 'Luna', precoPorPorte as any);
    expect(r).toEqual({ ok: true, valor: 150, custo: null, rotuloDaFaixa: '0 a 10 kg' });
  });

  it('pet de 15 kg cai na faixa de 175', () => {
    const r = resolverDiaria(DIARIA, 15, 'Chico', precoPorPorte as any) as any;
    expect(r.valor).toBe(175);
  });

  it('sem o peso, não interna: pede o peso', () => {
    const r = resolverDiaria(DIARIA, null, 'Luna', precoPorPorte as any) as any;
    expect(r.ok).toBe(false);
    expect(r.motivo).toBe('sem_peso');
    expect(r.mensagem).toContain('Registre o peso de Luna');
  });

  it('item de diária sem preço no cadastro não interna', () => {
    const r = resolverDiaria({ nome: 'Diária', preco: 0, faixas: [] }, 9, 'Luna', precoPorPorte as any) as any;
    expect(r.ok).toBe(false);
    expect(r.motivo).toBe('sem_preco');
  });
});
