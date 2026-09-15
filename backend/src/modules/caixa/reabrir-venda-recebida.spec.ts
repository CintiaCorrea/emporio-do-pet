import { readFileSync } from 'fs';
import { join } from 'path';
import { podeEditarVenda, podeReabrirVenda } from './caixa.regras';

/**
 * REABRIR UMA VENDA JÁ RECEBIDA.
 *
 * Cintia, 15/09/2026, respondendo às três perguntas sobre edição:
 *   1. "Depois de baixada ou recebida somente o adm pode reabrir a venda para que sejam feitas
 *      as devidas correções"
 *   2. "Sim, é possível [excluir] e também é possível deletar a venda, também tudo pelo adm"
 *   3. "Antes de receber todos podem editar vendas e orçamento, depois de receber somente o adm"
 *
 * E sobre o caixa: "Hoje no SimplesVet estornamos a venda do caixa."
 *
 * O CONTEXTO: ela vinha dizendo há dias que vendas está "muito engessada" e que precisa de
 * "mais liberdade para edições mesmo que isso tenha que ser autorizado por perfil". A liberdade
 * é o ponto — a trava existe só onde há dinheiro contado.
 */
const REC = (fechado = false, numero = 12) => ({ caixaFechado: fechado, caixaNumero: numero });

describe('quem edita uma venda', () => {
  it('antes de receber, TODO MUNDO edita', () => {
    // É trabalho de balcão corrigir um item digitado errado. Travar isso é o "engessado" de que
    // ela se queixou.
    for (const papel of ['RECEPTIONIST', 'VETERINARIAN', 'ADMIN', '', null, undefined]) {
      expect(podeEditarVenda(false, papel as any)).toBe(true);
    }
  });

  it('depois de receber, só o administrativo', () => {
    expect(podeEditarVenda(true, 'ADMIN')).toBe(true);
    for (const papel of ['RECEPTIONIST', 'VETERINARIAN', '', null, undefined]) {
      expect(podeEditarVenda(true, papel as any)).toBe(false);
    }
  });

  it('"admin" minúsculo também é adm', () => {
    expect(podeEditarVenda(true, 'admin')).toBe(true);
    expect(podeEditarVenda(true, ' Admin ')).toBe(true);
  });
});

describe('reabrir a venda recebida', () => {
  it('só o administrativo', () => {
    for (const papel of ['RECEPTIONIST', 'VETERINARIAN', '', null]) {
      const r = podeReabrirVenda(papel as any, [REC()]);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.erro).toMatch(/administrativo/i);
    }
    expect(podeReabrirVenda('ADMIN', [REC()]).ok).toBe(true);
  });

  it('venda sem recebimento não tem o que reabrir', () => {
    const r = podeReabrirVenda('ADMIN', []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toMatch(/já está em aberto/i);
  });

  describe('caixa FECHADO é a porta que fica trancada', () => {
    it('recusa, e diz qual caixa', () => {
      // Tirar um recebimento de um caixa fechado muda o total de um dia que alguém já conferiu:
      // a gaveta bateu com o sistema naquele momento e deixaria de bater, sem nada explicando.
      const r = podeReabrirVenda('ADMIN', [REC(true, 12)]);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.erro).toContain('12');
        expect(r.erro).toMatch(/Reabra o caixa antes/i);
        expect(r.erro).toMatch(/conferid/i);   // diz a consequência, não só "não pode"
      }
    });

    it('lista todos os caixas fechados envolvidos, sem repetir', () => {
      const r = podeReabrirVenda('ADMIN', [REC(true, 12), REC(true, 12), REC(true, 15)]);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.erro).toContain('12, 15');
        expect(r.erro.match(/12/g)?.length).toBe(1);
      }
    });

    it('basta UM fechado no meio de abertos para recusar', () => {
      expect(podeReabrirVenda('ADMIN', [REC(false, 1), REC(true, 2)]).ok).toBe(false);
    });

    it('todos abertos, libera', () => {
      expect(podeReabrirVenda('ADMIN', [REC(false, 1), REC(false, 2)]).ok).toBe(true);
    });
  });
});

describe('o estorno na prática', () => {
  const svc = readFileSync(join(__dirname, 'caixa.service.ts'), 'utf8');
  const fn = svc.slice(svc.indexOf('async reabrirVenda('), svc.indexOf('async deleteCredito('));

  it('REAPROVEITA o estorno que já existia, em vez de apagar na mão', () => {
    // `deleteRecebimento` é quem sabe limpar a taxa do cartão, o uso de crédito e a receita no
    // DRE. Apagar a linha direto deixaria lançamentos órfãos apontando para um recebimento que
    // não existe mais.
    expect(fn).toContain('this.deleteRecebimento(');
    expect(fn).not.toMatch(/recebimento\.delete\(/);
  });

  it('a regra é conferida ANTES de estornar qualquer coisa', () => {
    const posRegra = fn.indexOf('podeReabrirVenda');
    const posEstorno = fn.indexOf('this.deleteRecebimento(');
    expect(posRegra).toBeGreaterThan(-1);
    expect(posRegra).toBeLessThan(posEstorno);
  });

  it('devolve quanto foi estornado — a tela precisa dizer o valor', () => {
    expect(fn).toContain('estornado');
  });

  it('o controller manda o papel; sem ele a trava não existiria', () => {
    const ctrl = readFileSync(join(__dirname, 'caixa.controller.ts'), 'utf8');
    expect(ctrl).toMatch(/reabrirVenda\([^)]*papel\)/);
    expect(ctrl).toContain("@Patch('venda/:appointmentId/reabrir')");
  });
});
