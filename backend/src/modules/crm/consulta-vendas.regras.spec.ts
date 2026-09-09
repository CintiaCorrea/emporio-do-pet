import { pagoDaVenda, abertoDaVenda, situacaoDaVenda, TIPOS_DE_VENDA, ehTipoDeVenda, ehTipoDeOrcamento } from './consulta-vendas.regras';
import * as fs from 'fs';
import * as path from 'path';

describe('Consulta de vendas — as contas de dinheiro fecham', () => {
  it('soma os recebimentos da venda', () => {
    expect(pagoDaVenda(500, [{ valorTotal: 200 }, { valorTotal: 150 }])).toBe(350);
    expect(abertoDaVenda(500, [{ valorTotal: 200 }, { valorTotal: 150 }])).toBe(150);
  });

  it('pagamento a maior NAO vira saldo negativo', () => {
    // Troco e assunto do caixa. Se entrasse aqui, esta venda tiraria R$ 50 do "a receber" do
    // periodo e o total da tela nao fecharia com mais nada.
    expect(pagoDaVenda(100, [{ valorTotal: 150 }])).toBe(100);
    expect(abertoDaVenda(100, [{ valorTotal: 150 }])).toBe(0);
  });

  it('venda sem recebimento esta inteira em aberto', () => {
    expect(pagoDaVenda(300, [])).toBe(0);
    expect(abertoDaVenda(300, null)).toBe(300);
    expect(situacaoDaVenda(300, [])).toBe('ABERTA');
  });

  it('reconhece a baixa parcial', () => {
    expect(situacaoDaVenda(500, [{ valorTotal: 200 }])).toBe('PARCIAL');
  });

  it('um centavo de arredondamento nao deixa a venda eternamente parcial', () => {
    expect(situacaoDaVenda(100, [{ valorTotal: 99.995 }])).toBe('PAGA');
  });

  it('venda paga por inteiro', () => {
    expect(situacaoDaVenda(250, [{ valorTotal: 100 }, { valorTotal: 150 }])).toBe('PAGA');
  });

  it('valor zerado nao vira venda paga', () => {
    // Venda de R$ 0 sem recebimento e cadastro pela metade, nao dinheiro que entrou.
    expect(situacaoDaVenda(0, [])).toBe('ABERTA');
  });

  it('lixo no valor ou no recebimento nao contamina a conta', () => {
    expect(pagoDaVenda('abc' as any, [{ valorTotal: null }, {} as any])).toBe(0);
    expect(abertoDaVenda(null, undefined)).toBe(0);
  });
});

// ── "E CADE AS VENDAS DE SETEMBRO?" (Cintia, 08/09/2026) ─────────────────────────────────────
//
// Nao eram so as de setembro. A mesma coisa estava escrita com duas grafias: o importador do
// SimplesVet grava type 'VENDA', o nosso ponto de venda grava 'Venda', e a consulta procurava
// so pela primeira. Agosto (importado) aparecia; tudo o que a clinica vendeu no nosso sistema,
// nao. Erro que parece funcionar e o pior tipo de erro.
describe('o que conta como VENDA no campo type', () => {
  it('aceita as duas grafias que existem no banco de verdade', () => {
    expect(ehTipoDeVenda('VENDA')).toBe(true);   // importador
    expect(ehTipoDeVenda('Venda')).toBe(true);   // ponto de venda e internacao
    expect(ehTipoDeVenda('venda')).toBe(true);
    expect(ehTipoDeVenda(' Venda ')).toBe(true);
  });

  it('orcamento nao e venda, em nenhuma grafia', () => {
    for (const t of ['Orçamento', 'ORCAMENTO', 'orcamento', 'Orcamento']) {
      expect(ehTipoDeVenda(t)).toBe(false);
      expect(ehTipoDeOrcamento(t)).toBe(true);
    }
  });

  it('agendamento comum tambem nao e venda', () => {
    for (const t of ['Consulta', 'Retorno', 'Banho', '', null, undefined]) {
      expect(ehTipoDeVenda(t as any)).toBe(false);
    }
  });

  it('a lista usada na query cobre as grafias que a regra aceita', () => {
    // Se alguem acrescentar uma grafia so na funcao e esquecer da lista, a query volta a
    // esconder venda — que foi exatamente o que aconteceu.
    for (const t of TIPOS_DE_VENDA) expect(ehTipoDeVenda(t)).toBe(true);
  });

  it('nenhuma consulta procura a grafia solta de novo', () => {
    // A trava: `type: 'VENDA'` pode aparecer ao ESCREVER (o importador grava assim), mas nunca
    // mais dentro de um `where` — foi assim que a tela escondeu as vendas da casa.
    const linhas = fs.readFileSync(path.resolve(__dirname, 'crm-integration.service.ts'), 'utf8')
      .split(/\r?\n/)
      .filter((l) => !l.trim().startsWith('//'))
      .filter((l) => l.includes("type: 'VENDA'"));
    // A unica linha que pode ter a grafia solta e a do importador, que CRIA o registro.
    expect(linhas.every((l) => !l.includes('where') && !l.includes('tutorId'))).toBe(true);
    expect(linhas.length).toBeLessThanOrEqual(1);
  });

});
