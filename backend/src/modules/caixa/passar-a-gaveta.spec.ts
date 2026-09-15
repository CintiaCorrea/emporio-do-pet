import { readFileSync } from 'fs';
import { join } from 'path';
import { podeTransferirEntreCaixas } from './caixa.regras';

/**
 * O DINHEIRO PASSANDO DE UMA GAVETA PARA OUTRA.
 *
 * Cintia, 15/09/2026: "a Gabriela não consegue fechar o caixa dela e transferir o saldo em
 * dinheiro para o caixa da Vitória".
 *
 * Não conseguia porque isto NÃO EXISTIA. O botão "Transferência" que havia move dinheiro entre
 * CONTAS (banco, cofre) — e o que acontece de verdade no fim do turno é outra coisa: a gaveta
 * passa de mão em mão. Fazer isso por sangria numa ponta e suprimento na outra exigia duas
 * operações e contava uma história falsa, como se o dinheiro tivesse ido ao banco e voltado.
 *
 * O QUE ESTA REGRA NÃO FAZ, e é decisão registrada: não confere saldo. O servidor não calcula o
 * dinheiro em caixa — esse número é montado na tela. Recriar a conta aqui seria uma segunda
 * verdade sobre o mesmo dinheiro, e duas contas divergentes são piores do que uma só. A tela
 * avisa quando o valor passa do que ela mostra; quem fecha a conta é a conferência da gaveta.
 */
const BASE = { origemId: 'cx-gabriela', destinoId: 'cx-vitoria', origemAberto: true, destinoAberto: true, valor: 250 };

describe('passar a gaveta para outro caixa', () => {
  it('com tudo em ordem, libera', () => {
    expect(podeTransferirEntreCaixas(BASE).ok).toBe(true);
  });

  describe('para onde', () => {
    it('sem destino, recusa', () => {
      const r = podeTransferirEntreCaixas({ ...BASE, destinoId: '' });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.erro).toMatch(/destino/i);
    });

    it('para o próprio caixa não é transferência', () => {
      const r = podeTransferirEntreCaixas({ ...BASE, destinoId: BASE.origemId });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.erro).toMatch(/não sairia do lugar/i);
    });
  });

  describe('os dois caixas precisam estar abertos', () => {
    it('a origem fechada recusa — e diz o caminho', () => {
      // É o caso da Gabriela: ela fechava PRIMEIRO e depois tentava transferir.
      const r = podeTransferirEntreCaixas({ ...BASE, origemAberto: false });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.erro).toMatch(/antes de fechar|reabra/i);
    });

    it('o destino fechado recusa, dizendo de quem é', () => {
      // Lançar em caixa fechado mudaria o total de um dia que alguém já conferiu — a mesma razão
      // pela qual reabrir uma venda não mexe em caixa fechado.
      const r = podeTransferirEntreCaixas({ ...BASE, destinoAberto: false, destinoDono: 'Vitória' });
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.erro).toContain('Vitória');
        expect(r.erro).toMatch(/precisa estar aberto/i);
      }
    });
  });

  describe('o valor', () => {
    it('zero, negativo ou lixo não passa', () => {
      for (const v of [0, -10, NaN, null, undefined]) {
        expect(podeTransferirEntreCaixas({ ...BASE, valor: v as any }).ok).toBe(false);
      }
    });
  });
});

describe('como o dinheiro é gravado', () => {
  const svc = readFileSync(join(__dirname, 'caixa.service.ts'), 'utf8');
  // O METODO INTEIRO, da assinatura ate o proximo. Uma janela de N caracteres vazava para o
  // metodo seguinte e reprovava por causa de codigo que nem e deste caminho.
  const fn = svc.slice(svc.indexOf('async transferirEntreCaixas('), svc.indexOf('/** Sangria/Suprimento'));

  it('DUAS LINHAS NA MESMA TRANSAÇÃO — ou as duas existem, ou nenhuma', () => {
    // Separadas, uma podia dar certo e a outra falhar: o dinheiro sumiria de um caixa sem
    // aparecer no outro. É exatamente o buraco que estas semanas passaram consertando.
    expect(fn).toContain('this.prisma.$transaction([');
    expect(fn).toContain("tipo: 'SANGRIA'");
    expect(fn).toContain("tipo: 'SUPRIMENTO'");
  });

  it('cada linha diz de onde veio ou para onde foi', () => {
    // Sangria sem destino escrito é dinheiro que some da vista de quem confere depois.
    expect(fn).toContain('Transferencia para o caixa');
    expect(fn).toContain('Transferencia recebida do caixa');
  });

  it('NÃO gera lançamento financeiro', () => {
    // O dinheiro não saiu da casa nem mudou de conta: continua em espécie, no mesmo cofre, só
    // que em outra gaveta. Lançar Espécie → Espécie seria registrar um movimento que não houve.
    expect(fn).not.toContain('lancamentos.create');
    expect(fn).not.toContain('transferenciaCaixaFinanceiro');
  });

  it('a regra é conferida ANTES de gravar', () => {
    expect(fn.indexOf('podeTransferirEntreCaixas')).toBeLessThan(fn.indexOf('$transaction'));
  });

  it('o dono do caixa de origem é exigido', () => {
    // Ninguém tira dinheiro da gaveta de outra pessoa — a regra de 08/09/2026 continua valendo.
    expect(fn).toContain('exigirDonoDoCaixa(origemId, userId, papel)');
  });
});
