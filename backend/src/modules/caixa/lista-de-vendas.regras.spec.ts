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
