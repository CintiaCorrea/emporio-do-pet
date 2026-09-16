import { avisoDeRecebimentoNaExclusao } from './exclusao-com-recebimento.regras';

describe('apagar venda com dinheiro recebido avisa antes', () => {
  it('O CASO DA #1177: diz quanto, em que caixa, de quem e de que dia', () => {
    const txt = avisoDeRecebimentoNaExclusao([
      { valorTotal: 468.35, caixaSessao: { numero: 11, abertura: '2026-09-10T15:00:00Z', user: { name: 'Maria Gabriela' } } },
    ]);
    expect(txt).toBe('Esta venda tem R$ 468,35 recebido (R$ 468,35 no caixa nº 11 de Maria Gabriela 10/09). Apagar a venda apaga o recebimento junto, e o caixa fica R$ 468,35 menor. Apagar mesmo assim?');
  });

  it('soma mais de um recebimento e usa milhar', () => {
    const txt = avisoDeRecebimentoNaExclusao([
      { valorTotal: 1000, caixaSessao: { numero: 8 } },
      { valorTotal: 52.1, caixaSessao: { numero: 11 } },
    ])!;
    expect(txt).toContain('R$ 1.052,10 recebido');
    expect(txt).toContain('R$ 1.000,00 no caixa nº 8; R$ 52,10 no caixa nº 11');
  });

  it('sem dinheiro não há aviso', () => {
    expect(avisoDeRecebimentoNaExclusao([])).toBeNull();
    expect(avisoDeRecebimentoNaExclusao(null)).toBeNull();
    expect(avisoDeRecebimentoNaExclusao([{ valorTotal: 0 }])).toBeNull();
  });
});
