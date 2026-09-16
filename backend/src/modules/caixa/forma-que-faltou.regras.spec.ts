import { readFileSync } from 'fs';
import { join } from 'path';
import { ehCreditoDoCliente, erroNasFormasPreenchidas, estaSemForma } from './forma-que-faltou.regras';

/**
 * PREENCHER A FORMA QUE O SISTEMA PERDEU — E SÓ ISSO.
 *
 * Cintia, 16/09/2026, sobre os recebimentos que apareciam como "Outros". 34 dos 59 de setembro
 * ficaram sem forma por um defeito do servidor, e só quem recebeu sabe como o cliente pagou.
 */
describe('o que conta como "sem forma"', () => {
  it('os formatos que o defeito deixou no banco', () => {
    expect(estaSemForma([])).toBe(true);
    expect(estaSemForma([[]])).toBe(true);
    expect(estaSemForma(null)).toBe(true);
  });

  it('linha sem nome também — no resumo ela cai em "Outros" do mesmo jeito', () => {
    expect(estaSemForma([{ forma: '', valor: 70 }])).toBe(true);
  });

  it('recebimento com forma NÃO é candidato', () => {
    expect(estaSemForma([{ forma: 'Nubank PIX', valor: 70 }])).toBe(false);
  });
});

describe('o que pode ser gravado', () => {
  it('uma forma com o valor inteiro', () => {
    expect(erroNasFormasPreenchidas([{ forma: 'Nubank PIX', valor: 70 }], 70, 0)).toBeNull();
  });

  it('dividido entre formas, fechando a soma', () => {
    expect(erroNasFormasPreenchidas([{ forma: 'Dinheiro', valor: 50 }, { forma: 'Infinity PIX', valor: 20 }], 70, 0)).toBeNull();
  });

  it('com troco: a soma é o que o cliente ENTREGOU', () => {
    expect(erroNasFormasPreenchidas([{ forma: 'Dinheiro', valor: 100 }], 90, 10)).toBeNull();
  });

  it('soma que não fecha: recusa e diz os dois números', () => {
    const e = erroNasFormasPreenchidas([{ forma: 'Nubank PIX', valor: 60 }], 70, 0);
    expect(e).toContain('R$ 60,00');
    expect(e).toContain('R$ 70,00');
  });

  it('linha sem forma ou sem valor: recusa', () => {
    expect(erroNasFormasPreenchidas([{ forma: '', valor: 70 }], 70, 0)).toMatch(/forma/);
    expect(erroNasFormasPreenchidas([{ forma: 'Dinheiro', valor: 0 }], 70, 0)).toMatch(/valor/);
  });

  it('um centavo de arredondamento passa', () => {
    expect(erroNasFormasPreenchidas([{ forma: 'Dinheiro', valor: 33.33 }, { forma: 'Nubank PIX', valor: 33.33 }, { forma: 'Infinity PIX', valor: 33.33 }], 100, 0)).toBeNull();
  });
});

describe('crédito do cliente', () => {
  it('só "Crédito do cliente" debita saldo — cartão de crédito não', () => {
    expect(ehCreditoDoCliente('Crédito do cliente')).toBe(true);
    expect(ehCreditoDoCliente('Cartão crédito')).toBe(false);
  });
});

describe('o serviço só PREENCHE', () => {
  const svc = readFileSync(join(__dirname, 'caixa.service.ts'), 'utf8');
  const i = svc.indexOf('async definirFormaDoRecebimento(');
  const corpo = svc.slice(i, svc.indexOf('\n  }\n', i));

  it('existe', () => {
    expect(i).toBeGreaterThan(0);
  });

  it('é do administrativo', () => {
    expect(corpo).toContain("!== 'ADMIN'");
  });

  it('recusa recebimento que já tem forma', () => {
    expect(corpo).toContain('if (!estaSemForma(rec.formas))');
  });

  it('o único campo do recebimento que muda é a forma', () => {
    expect(corpo).toContain('data: { formas: lista }');
    expect(corpo).not.toMatch(/recebimento\.update\(\{[^}]*data:\s*\{[^}]*valorTotal/);
  });

  it('crédito do cliente debita o saldo, como no recebimento normal', () => {
    expect(corpo).toContain("tipo: 'USO'");
  });

  it('e o financeiro da venda é refeito com a forma nova', () => {
    expect(corpo).toContain('this.recebimentos.processar(rec.appointmentId)');
  });
});
