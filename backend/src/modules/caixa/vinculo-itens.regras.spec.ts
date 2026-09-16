import { readFileSync } from 'fs';
import { join } from 'path';
import { nomeNormalizado, percentualClassificado, sugerirVinculo, CAMPOS_QUE_LIGAR_PODE_ESCREVER } from './vinculo-itens.regras';

/**
 * ARRUMAR SEM BAGUNÇAR.
 *
 * Cintia, 15/09/2026: "organize tudo de uma forma que eu possa arrumar sem perder tudo, e sem
 * bagunçar o caixa, as vendas, orçamentos e os recebimentos. Isso depois dos pets e dos clientes
 * é a base de tudo, se não estiver construído direito só pode dar merda."
 *
 * A promessa que esta tela faz é estreita e precisa continuar estreita: ligar escreve UM campo.
 * No dia em que alguém achar prático "aproveitar e corrigir o valor também", a operação deixa de
 * ser segura de rodar com o mês aberto — e ninguém vai perceber até a conferência de caixa não
 * fechar.
 */
describe('ligar escreve UMA coisa só', () => {
  it('e a lista de campos permitidos está escrita, não subentendida', () => {
    expect([...CAMPOS_QUE_LIGAR_PODE_ESCREVER]).toEqual(['catalogoItemId']);
  });

  it('o serviço não escreve valor, data nem nada de dinheiro ao ligar', () => {
    const svc = readFileSync(join(__dirname, 'caixa.service.ts'), 'utf8');
    const i = svc.indexOf('async ligarItensAoCatalogo');
    const j = svc.indexOf('async listVendas');
    expect(i).toBeGreaterThan(0);
    const corpo = svc.slice(i, j);
    expect(corpo).toContain('data: { catalogoItemId }');
    // O `updateMany` é o único write, e o único campo é o vínculo.
    expect(corpo).not.toMatch(/data:\s*\{[^}]*valorTotal/);
    expect(corpo).not.toMatch(/data:\s*\{[^}]*valorUnitario/);
    expect(corpo).not.toMatch(/data:\s*\{[^}]*desconto/);
    expect(corpo).not.toContain('recebimento');
  });

  it('em massa é do administrativo', () => {
    const svc = readFileSync(join(__dirname, 'caixa.service.ts'), 'utf8');
    const i = svc.indexOf('async ligarItensAoCatalogo');
    expect(svc.slice(i, i + 700)).toContain("!== 'ADMIN'");
  });
});

describe('o nome que a equipe digita de memória', () => {
  it('casa apesar de acento, caixa e espaço dobrado', () => {
    expect(nomeNormalizado('CONSULTA - Dra Vivian')).toBe(nomeNormalizado('Consulta - Dra  Vivian'));
    expect(nomeNormalizado('Diária de internação')).toBe('diaria de internacao');
  });

  it('nome vazio não casa com nada', () => {
    expect(sugerirVinculo('', [{ id: 'a', nome: 'Qualquer' }])).toBeNull();
    expect(sugerirVinculo('   ', [{ id: 'a', nome: '   ' }])).toBeNull();
  });
});

describe('a sugestão automática só arrisca o que é certo', () => {
  const cat = [
    { id: 'c1', nome: 'Fluidoterapia' },
    { id: 'c2', nome: 'Fluidoterapia até 10K' },
    { id: 'c3', nome: 'Consulta' },
    { id: 'c4', nome: 'CONSULTA' },
  ];

  it('nome idêntico a UM item: sugere', () => {
    expect(sugerirVinculo('fluidoterapia', cat)).toEqual({ id: 'c1', nome: 'Fluidoterapia' });
  });

  it('parecido NÃO é sugerido', () => {
    // Grudar "Fluidoterapia" em "Fluidoterapia até 10K" produz um relatório plausível e falso,
    // que é pior que o "Não classificado" honesto de hoje: ninguém vai conferir um número que
    // parece certo.
    expect(sugerirVinculo('Fluidoterapia ate 10 K', cat)).toBeNull();
  });

  it('dois cadastros com o mesmo nome: não sugere nenhum', () => {
    // É exatamente o caso que a etiqueta "nome repetido" veio denunciar. Escolher um dos dois
    // no escuro é cometer o erro em vez de mostrá-lo.
    expect(sugerirVinculo('consulta', cat)).toBeNull();
  });
});

describe('o número que mede a arrumação', () => {
  it('é a fração do DINHEIRO classificado, não a de linhas', () => {
    // Cem linhas de R$ 1 ligadas e uma de R$ 10.000 solta não é "99% arrumado".
    const linhas = [
      ...Array.from({ length: 100 }, () => ({ catalogoItemId: 'x', valorTotal: 1 })),
      { catalogoItemId: null, valorTotal: 10000 },
    ];
    expect(percentualClassificado(linhas)).toBeLessThan(2);
  });

  it('período sem venda nenhuma não é "mal classificado"', () => {
    // Zero dividido por zero vira NaN na tela, e NaN em vermelho assusta à toa.
    expect(percentualClassificado([])).toBe(100);
  });

  it('id em branco não conta como vínculo', () => {
    expect(percentualClassificado([{ catalogoItemId: '  ', valorTotal: 100 }])).toBe(0);
  });

  it('tudo ligado dá 100', () => {
    expect(percentualClassificado([{ catalogoItemId: 'a', valorTotal: 50 }, { catalogoItemId: 'b', valorTotal: 50 }])).toBe(100);
  });
});
