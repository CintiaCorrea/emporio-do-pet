import { ehVendaDeVerdade } from './lista-de-vendas.regras';

describe('Lista de vendas do caixa — o que aparece', () => {
  it('venda de balcao entra', () => {
    expect(ehVendaDeVerdade({ origem: 'VENDA', itens: 3, pago: 0 })).toBe(true);
  });

  it('consulta clinica NAO some da lista', () => {
    // "Nao e para sumir. E so para nao ser lancado quando inicia o atendimento clinico"
    // (Cintia, 07/09/2026). Esconder registro que existe e outra coisa — e errado.
    expect(ehVendaDeVerdade({ origem: 'ATENDIMENTO', itens: 0, pago: 0 })).toBe(true);
  });

  it('consulta COM item lancado continua na lista', () => {
    // Alguem cobrou algo ali dentro: isso e venda de verdade, com ou sem o nome de consulta.
    expect(ehVendaDeVerdade({ origem: 'ATENDIMENTO', itens: 2, pago: 0 })).toBe(true);
  });

  it('consulta que JA RECEBEU dinheiro nunca some', () => {
    // Esconder recebimento e muito pior que mostrar uma linha a mais.
    expect(ehVendaDeVerdade({ origem: 'ATENDIMENTO', itens: 0, pago: 150 })).toBe(true);
  });

  it('a internacao em si NAO entra — quem entra e a venda de cada dia', () => {
    // Desde 07/09/2026 a conta de cada dia vira venda propria. A internacao e um atendimento
    // com o valor da diaria; se ela tambem entrasse, o mesmo dinheiro apareceria duas vezes.
    expect(ehVendaDeVerdade({ origem: 'INTERNACAO', itens: 0, pago: 0 })).toBe(false);
  });

  it('internacao que ja recebeu continua aparecendo', () => {
    expect(ehVendaDeVerdade({ origem: 'INTERNACAO', itens: 0, pago: 300 })).toBe(true);
  });

  it('linha sem origem conhecida entra — na duvida, mostra', () => {
    expect(ehVendaDeVerdade({ itens: 0, pago: 0 })).toBe(true);
    expect(ehVendaDeVerdade({ origem: null, itens: 0, pago: 0 })).toBe(true);
  });

  it('lixo nao derruba a lista', () => {
    expect(ehVendaDeVerdade(null)).toBe(false);
    // Internacao com numero sujo continua fora (quem cobra sao as vendas de cada dia).
    expect(ehVendaDeVerdade({ origem: 'INTERNACAO', itens: 'x' as any, pago: null })).toBe(false);
  });
});

// 🛡️ O PERÍODO É O LIMITE — a lista não corta o começo do mês em silêncio.
//
// A Cintia, 09/09/2026: "tela de vendas só mostra a partir do dia 6, cadê o início do mês?"
//
// A tela abre pedindo 01/09 até hoje, e o servidor devolvia as 60 mais recentes, ordenadas da
// mais nova para a mais velha. Num mês movimentado, o começo do mês caía fora — sem aviso
// nenhum, o que é o pior jeito de uma lista mentir: ela parece completa.
describe('quantas vendas a lista devolve', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.resolve(__dirname, 'caixa.service.ts'), 'utf8');

  it('com período pedido, o período manda — não um corte fixo em 60', () => {
    expect(src).toContain("take: busca ? 2000 : abertas ? 300 : (query?.from || query?.to) ? 2000 : 60,");
  });

  it('os 60 continuam valendo só para a consulta sem período e sem busca', () => {
    // É a visão de "as últimas vendas", onde o corte é o próprio sentido da tela.
    const trecho = src.slice(src.indexOf('async listVendas('), src.indexOf('let rows = appts.map'));
    expect(trecho).toContain(': 60,');
    expect(trecho).toContain('(query?.from || query?.to)');
  });
});
