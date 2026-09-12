import * as fs from 'fs';
import * as path from 'path';

// 🛡️ TODA PORTA QUE CRIA EXAME LIGA O CARD AO ITEM DA VENDA.
//
// Sem o vínculo, a conta a pagar do laboratório volta a esperar o cliente pagar — o oposto do
// que a Cintia decidiu em 07/09/2026. Em 12/09 havia 43 cards soltos de 46, e a causa era esta:
// o PDV ligava, a conversão de orçamento não. Uma porta certa e outra errada é pior do que duas
// erradas, porque ninguém percebe.
//
// Este teste falha se alguém criar uma porta nova e esquecer o vínculo.

const src = (p: string) => fs.readFileSync(path.resolve(__dirname, p), 'utf8');

describe('vínculo exame ↔ item da venda', () => {
  const portas: { nome: string; caminho: string }[] = [
    { nome: 'PDV (venda direta)', caminho: '../caixa/caixa.service.ts' },
    { nome: 'conversão de orçamento', caminho: '../orcamentos/orcamentos.service.ts' },
  ];

  for (const p of portas) {
    it(`${p.nome}: liga pelo núcleo comum, não por cópia`, () => {
      const s = src(p.caminho);
      expect(s).toContain("from '../exames/vincular-item-da-venda'");
      expect(s).toContain('ligarAoItemDaVenda(');
      // e busca os itens que acabou de criar, senão não há com o que casar
      expect(s).toContain('appointmentItem.findMany');
    });

    it(`${p.nome}: não refez o casamento à mão`, () => {
      const s = src(p.caminho);
      // a sutileza que se perde numa segunda escrita: consumir cada item UMA vez
      expect(s).not.toMatch(/usados\.add\(/);
    });
  }

  it('o núcleo continua existindo com o nome que as portas importam', () => {
    const nucleo = src('vincular-item-da-venda.ts');
    expect(nucleo).toContain('export function ligarAoItemDaVenda');
  });
});
