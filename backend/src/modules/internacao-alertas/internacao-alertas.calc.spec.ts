import { horasDaFreq, horariosDe } from './internacao-alertas.service';

// 🛡️ Escudo 2 (regressão) — Fatia 1. Trava a lógica de frequência/horários dos alertas
// de internação (mexemos nela em 29/07 pra aceitar frequências customizadas). Se alguém
// quebrar esse cálculo num deploy futuro, o teste pega ANTES de ir pro ar.

describe('horasDaFreq — texto da frequência → intervalo em horas', () => {
  it('lê as frequências padrão', () => {
    expect(horasDaFreq('4/4h')).toBe(4);
    expect(horasDaFreq('6/6h')).toBe(6);
    expect(horasDaFreq('8/8h')).toBe(8);
    expect(horasDaFreq('12/12h')).toBe(12);
    expect(horasDaFreq('24h (1x ao dia)')).toBe(24);
  });

  it('lê frequências CUSTOMIZADAS (Config › Listas)', () => {
    expect(horasDaFreq('10/10h')).toBe(10);
    expect(horasDaFreq('48h')).toBe(48);
    expect(horasDaFreq('2/2h')).toBe(2);
  });

  it('sem horas no texto → 0 (contínua, sem horário fixo)', () => {
    expect(horasDaFreq('')).toBe(0);
    expect(horasDaFreq('quando necessário')).toBe(0);
    expect(horasDaFreq('contínua')).toBe(0);
  });
});

describe('horariosDe — 1ª aplicação + frequência → horários do dia', () => {
  it('8/8h a partir das 06:00', () => {
    expect(horariosDe('06:00', '8/8h')).toEqual(['06:00', '14:00', '22:00']);
  });

  it('12/12h a partir das 07:00', () => {
    expect(horariosDe('07:00', '12/12h')).toEqual(['07:00', '19:00']);
  });

  it('frequência customizada 10/10h a partir das 06:00', () => {
    expect(horariosDe('06:00', '10/10h')).toEqual(['06:00', '16:00', '02:00']);
  });

  it('contínua / sem horas → nenhum horário', () => {
    expect(horariosDe('06:00', '')).toEqual([]);
    expect(horariosDe('06:00', 'quando necessário')).toEqual([]);
  });

  it('hora inicial inválida → nenhum horário', () => {
    expect(horariosDe('', '8/8h')).toEqual([]);
    expect(horariosDe('25:00', '8/8h')).toEqual([]);
  });
});
