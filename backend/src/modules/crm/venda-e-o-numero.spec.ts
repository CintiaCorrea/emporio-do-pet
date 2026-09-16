import * as fs from 'fs';
import * as path from 'path';
import { ehVenda, ehRegistroDeInternacao, ondeEVenda } from './consulta-vendas.regras';

// A Cintia, 16/09/2026: "consulta também é uma venda, não estou entendendo porque do nome
// consulta ou resultado de exames, venda é venda."
//
// Casos reais medidos no banco nesse dia.

describe('venda é quem tem número de venda, não o nome do atendimento', () => {
  it('a castração da Cueia (#1130) lançada dentro de "Resultado de exames" é venda', () => {
    expect(ehVenda({ numeroVenda: 1130, type: 'Resultado de exames', notes: '' })).toBe(true);
  });

  it('a venda lançada dentro de uma CONSULTA na ficha do pet é venda', () => {
    expect(ehVenda({ numeroVenda: 1241, type: 'CONSULTA', notes: null })).toBe(true);
    expect(ehVenda({ numeroVenda: 1188, type: 'Retorno' })).toBe(true);
  });

  it('a venda do ponto de venda e a importada continuam sendo venda', () => {
    expect(ehVenda({ numeroVenda: 1177, type: 'Venda' })).toBe(true);
    expect(ehVenda({ numeroVenda: 12, type: 'VENDA' })).toBe(true);
  });

  it('receita, documento e consulta sem cobrança não têm número — não são venda', () => {
    expect(ehVenda({ numeroVenda: null, type: 'Receitas' })).toBe(false);
    expect(ehVenda({ numeroVenda: null, type: 'CONSULTA' })).toBe(false);
    expect(ehVenda({ type: 'Venda' } as any)).toBe(false);
  });

  it('orçamento não é venda, mesmo se um dia ganhar número', () => {
    expect(ehVenda({ numeroVenda: 900, type: 'Orçamento' })).toBe(false);
  });

  it('O REGISTRO DE INTERNAÇÃO não é venda — a conta sai em vendas próprias (#1174)', () => {
    // O valor dele é a diária combinada; nunca tem item nem recebimento.
    expect(ehVenda({ numeroVenda: 1174, type: 'Internação', notes: '{"type":"HOSPITALIZATION","dailyRate":150}' })).toBe(false);
    expect(ehRegistroDeInternacao({ type: 'internacao' })).toBe(true);
    expect(ehRegistroDeInternacao({ type: 'Venda', notes: '{"type":"HOSPITALIZATION"}' })).toBe(true);
    // a conta da internação é venda comum
    expect(ehVenda({ numeroVenda: 1158, type: 'Venda', notes: null })).toBe(true);
  });

  it('nada não quebra', () => {
    expect(ehVenda(null)).toBe(false);
    expect(ehVenda(undefined)).toBe(false);
  });
});

describe('a consulta ao banco usa a mesma regra', () => {
  it('exige número, tira orçamento e internação, e não perde as vendas sem notes', () => {
    const w = ondeEVenda();
    const txt = JSON.stringify(w);
    expect(txt).toContain('"numeroVenda":{"not":null}');
    expect(txt).toContain('Orçamento');
    expect(txt).toContain('Internação');
    // sem `notes: null` no OR, o SQL descartaria justamente as vendas comuns
    expect(txt).toContain('{"notes":null}');
  });

  it('vem inteira dentro de AND, para a busca poder acrescentar sem apagar', () => {
    expect(Object.keys(ondeEVenda())).toEqual(['AND']);
  });

  // 🛡️ A trava: o nome do atendimento não volta a decidir o que é venda numa consulta.
  it('nenhuma consulta de vendas volta a filtrar pelo nome "Venda"', () => {
    const src = fs.readFileSync(path.resolve(__dirname, 'crm-integration.service.ts'), 'utf8')
      .split(/\r?\n/).filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(src).not.toMatch(/type:\s*\{\s*in:\s*\[\s*\.\.\.TIPOS_DE_VENDA/);
    expect((src.match(/ondeEVenda\(\)/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});
