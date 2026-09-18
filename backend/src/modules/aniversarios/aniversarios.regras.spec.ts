import { diaDoMes, calcularIdade } from './aniversarios.regras';

// Fortaleza é UTC-3: é ali que o dia virava para trás.
process.env.TZ = 'America/Fortaleza';

describe('o dia do aniversário não anda para trás', () => {
  it('quem nasceu no dia 1 continua no dia 1 (o caso que cruzava o mês)', () => {
    // Gravado pela ficha do cliente: meia-noite UTC. Lido com getDate() local, isto dava 31.
    expect(diaDoMes('2026-08-01T00:00:00.000Z')).toBe(1);
  });

  it('um dia qualquer do meio do mês também', () => {
    expect(diaDoMes('1986-08-29T00:00:00.000Z')).toBe(29);
  });

  it('cadastro vindo do formulário público (meio-dia local) dá o mesmo dia', () => {
    // O formulário público grava T12:00:00 local = 15:00Z. Os dois caminhos têm de concordar.
    expect(diaDoMes('1986-08-29T15:00:00.000Z')).toBe(29);
  });

  it('sem data, sem dia', () => {
    expect(diaDoMes(null)).toBeNull();
    expect(diaDoMes('nao e data')).toBeNull();
  });
});

describe('a idade', () => {
  it('conta o ano só depois de o aniversário passar', () => {
    const nasc = '2000-08-01T00:00:00.000Z';
    expect(calcularIdade(nasc, new Date(2026, 6, 31))).toBe(25); // 31/07/2026, véspera
    expect(calcularIdade(nasc, new Date(2026, 7, 1))).toBe(26);  // 01/08/2026, no dia
  });

  it('sem data, sem idade', () => {
    expect(calcularIdade(null)).toBeNull();
  });
});
