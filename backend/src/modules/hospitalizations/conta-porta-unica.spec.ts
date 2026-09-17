import { readFileSync } from 'fs';
import { join } from 'path';

// 🛡️ A CONTA DA INTERNAÇÃO TEM UMA PORTA SÓ (construção B, 17/09/2026).
//
// A tela gravava o item direto na lista genérica: o servidor só ficava sabendo quando alguém abria
// a ficha, e a venda do dia aparecia atrasada. Além disso a mesma aplicação entrava duas vezes —
// a internação da Luna tem CERENIA das 06:15 lançada três vezes.
const svc = readFileSync(join(__dirname, 'hospitalizations.service.ts'), 'utf8');
const ctrl = readFileSync(join(__dirname, 'hospitalizations.controller.ts'), 'utf8');

describe('a porta única da conta da internação', () => {
  it('o servidor tem lançar, editar e apagar item da conta', () => {
    expect(ctrl).toContain("@Post(':id/conta')");
    expect(ctrl).toContain("@Patch(':id/conta/:itemId')");
    expect(ctrl).toContain("@Delete(':id/conta/:itemId')");
  });

  it('cada um deles atualiza a venda do dia NA HORA', () => {
    for (const metodo of ['async lancarNaConta', 'async apagarDaConta', 'async editarNaConta']) {
      const i = svc.indexOf(metodo);
      expect(i).toBeGreaterThan(-1); // ${metodo}
      expect(svc.slice(i, i + 1800)).toContain('sincronizarVendasDosDiasAbertos');
    }
  });

  it('item nasce com data e o repetido não entra', () => {
    const i = svc.indexOf('async lancarNaConta');
    const trecho = svc.slice(i, i + 1800);
    expect(trecho).toContain('comData(item)');
    expect(trecho).toContain('jaEstaNaConta(');
  });
});

// Cintia, 16/09/2026: "Gerar comanda do dia cobra de novo". O botão e o caminho saíram — cada dia
// já vira venda sozinha, e o que chega depois da cobrança entra numa venda complementar.
describe('o caminho que cobrava em dobro saiu', () => {
  it('não existe mais comanda do dia no servidor', () => {
    expect(ctrl).not.toContain("comanda-dia");
    expect(svc).not.toContain('async gerarComandaDia');
  });

  it('o que chega depois do dia cobrado vira venda complementar', () => {
    expect(svc).toContain('novosDepoisDaCobranca(');
    expect(svc).toContain('vendasComplementares');
    expect(svc).toContain('Venda complementar da internação');
  });
});
