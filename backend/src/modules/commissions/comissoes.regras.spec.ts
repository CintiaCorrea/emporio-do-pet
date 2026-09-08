import { ehDiaDeFecharComissao, diasDoMes, avisoDeFechamento } from './comissoes.regras';

const dia = (iso: string) => new Date(iso + 'T09:00:00');

describe('Quando a comissao fecha', () => {
  it('fecha no dia 30 dos meses de 30 e 31 dias', () => {
    expect(ehDiaDeFecharComissao(dia('2026-09-30'))).toBe(true); // setembro, 30 dias
    expect(ehDiaDeFecharComissao(dia('2026-10-30'))).toBe(true); // outubro, 31 dias
  });

  it('NAO fecha nos outros dias', () => {
    expect(ehDiaDeFecharComissao(dia('2026-09-29'))).toBe(false);
    expect(ehDiaDeFecharComissao(dia('2026-10-31'))).toBe(false);
  });

  it('FEVEREIRO fecha no ultimo dia — senao pularia o mes inteiro', () => {
    // Um cron escrito como "todo dia 30" nunca dispara em fevereiro, e ninguem descobre em
    // fevereiro: descobre em marco, com um mes de comissao sem fechar.
    expect(diasDoMes(dia('2026-02-10'))).toBe(28);
    expect(ehDiaDeFecharComissao(dia('2026-02-28'))).toBe(true);
    expect(ehDiaDeFecharComissao(dia('2026-02-27'))).toBe(false);
  });

  it('ano bissexto fecha no dia 29', () => {
    expect(diasDoMes(dia('2028-02-10'))).toBe(29);
    expect(ehDiaDeFecharComissao(dia('2028-02-29'))).toBe(true);
    expect(ehDiaDeFecharComissao(dia('2028-02-28'))).toBe(false);
  });

  it('data invalida nao dispara nada', () => {
    expect(ehDiaDeFecharComissao(new Date('nao e data'))).toBe(false);
    expect(ehDiaDeFecharComissao(null as any)).toBe(false);
  });
});

describe('O aviso do fechamento', () => {
  it('diz quantas pessoas, quantos itens e quanto', () => {
    const a = avisoDeFechamento({ pessoas: 3, itens: 42, comissao: 1875.5 })!;
    expect(a.mensagem).toContain('42 itens');
    expect(a.mensagem).toContain('3 pessoas');
    expect(a.mensagem).toContain('1.875,50');
  });

  it('sem nada a fechar, nao avisa', () => {
    // Aviso vazio todo mes ensina a ignorar o cheio.
    expect(avisoDeFechamento({ pessoas: 0, itens: 0, comissao: 0 })).toBeNull();
    expect(avisoDeFechamento({ pessoas: 2, itens: 0, comissao: 0 })).toBeNull();
  });

  it('uma pessoa so, no singular', () => {
    const a = avisoDeFechamento({ pessoas: 1, itens: 1, comissao: 30 })!;
    expect(a.mensagem).toContain('1 item de 1 pessoa');
  });
});
