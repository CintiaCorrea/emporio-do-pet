import { readFileSync } from 'fs';
import { join } from 'path';
import { podeLancarNoCaixa, podeFecharCaixa } from './caixa.regras';
import { AJUSTE_ATE, dentroDaJanelaDeAjuste } from '../../common/janela-de-ajuste';

/**
 * O ADMINISTRATIVO LANÇANDO EM CAIXA DE OUTRA PESSOA — com prazo.
 *
 * Cintia, 12/09/2026: "pode permitir que eu como adm faça as alterações nos caixas já abertos,
 * sem necessidade de abrir um em meu nome, somente até amanhã também?"
 *
 * Ela está conferindo os caixas de setembro e fazendo a conciliação bancária. Abrir um caixa no
 * próprio nome a cada correção criaria um caixa fantasma por vez — a sujeira que a limpeza de
 * 09/09 veio desfazer.
 *
 * Mas isto afrouxa a regra que ela mesma fixou em 08/09: "os caixas devem ser individuais e
 * inacessíveis por outra pessoa". Por isso a exceção tem três limites, e é isto que os testes
 * guardam: só ADMIN, só dentro da janela, e a janela passa sozinha.
 */
const DENTRO = '2026-09-13T10:00:00-03:00';
const DEPOIS = '2026-09-14T00:00:01-03:00';

const DONO = 'user-victoria';
const OUTRA = 'user-cintia';

describe('adm lança em caixa alheio', () => {
  describe('a regra de sempre continua', () => {
    it('o dono lança no próprio caixa, dentro ou fora da janela', () => {
      expect(podeLancarNoCaixa(DONO, DONO, 'RECEPTIONIST', DENTRO)).toBe(true);
      expect(podeLancarNoCaixa(DONO, DONO, 'RECEPTIONIST', DEPOIS)).toBe(true);
    });

    it('sem saber de quem é o caixa, ninguém lança — nem o adm', () => {
      expect(podeLancarNoCaixa(null, OUTRA, 'ADMIN', DENTRO)).toBe(false);
      expect(podeLancarNoCaixa(DONO, null, 'ADMIN', DENTRO)).toBe(false);
      expect(podeLancarNoCaixa('', '', 'ADMIN', DENTRO)).toBe(false);
    });

    it('recepção e veterinário NUNCA lançam no caixa da colega', () => {
      for (const papel of ['RECEPTIONIST', 'VETERINARIAN', 'VET', '', null, undefined]) {
        expect(podeLancarNoCaixa(DONO, OUTRA, papel as any, DENTRO)).toBe(false);
      }
    });
  });

  describe('a exceção do administrativo', () => {
    it('dentro da janela, o adm lança no caixa de outra pessoa', () => {
      expect(podeLancarNoCaixa(DONO, OUTRA, 'ADMIN', DENTRO)).toBe(true);
    });

    it('passada a janela, a trava volta SOZINHA — sem ninguém precisar lembrar', () => {
      expect(podeLancarNoCaixa(DONO, OUTRA, 'ADMIN', DEPOIS)).toBe(false);
    });

    it('a virada é no fim do dia 13', () => {
      expect(dentroDaJanelaDeAjuste('2026-09-13T23:59:00-03:00')).toBe(true);
      expect(dentroDaJanelaDeAjuste('2026-09-14T00:00:01-03:00')).toBe(false);
    });

    it('a data está escrita no código, não numa promessa de alguém lembrar', () => {
      expect(AJUSTE_ATE).toBe('2026-09-13T23:59:59-03:00');
    });

    it('o papel vem sem espaço pra dúvida: "admin" minúsculo também é adm', () => {
      expect(podeLancarNoCaixa(DONO, OUTRA, 'admin', DENTRO)).toBe(true);
      expect(podeLancarNoCaixa(DONO, OUTRA, 'Admin', DENTRO)).toBe(true);
    });
  });

  describe('fechar caixa não mudou', () => {
    it('o adm continua podendo fechar caixa alheio, com ou sem janela', () => {
      // Fechamento é conferência de gaveta: o dia não pode travar porque alguém faltou.
      expect(podeFecharCaixa(DONO, OUTRA, 'ADMIN')).toBe(true);
    });

    it('recepção continua sem fechar caixa alheio', () => {
      expect(podeFecharCaixa(DONO, OUTRA, 'RECEPTIONIST')).toBe(false);
    });
  });

  describe('uma data só para todas as travas afrouxadas', () => {
    const lerSrc = (...p: string[]) => readFileSync(join(__dirname, '..', '..', ...p), 'utf8');

    it('a internação bebe da MESMA fonte que o caixa', () => {
      // Duas datas seriam duas verdades: prorrogar uma e esquecer a outra deixa uma trava
      // aberta que todo mundo pensa que fechou.
      const fechamento = lerSrc('modules', 'hospitalizations', 'fechamento.regras.ts');
      expect(fechamento).toContain("from '../../common/janela-de-ajuste'");
      expect(fechamento).not.toMatch(/AJUSTE_ATE\s*=\s*'20/);   // não redeclara a data
      const caixa = lerSrc('modules', 'caixa', 'caixa.regras.ts');
      expect(caixa).toContain("from '../../common/janela-de-ajuste'");
    });

    it('a guarda do service pergunta o papel, e o controller manda', () => {
      // Proteção que só existe na tela não é proteção — e permissão que o service não recebe
      // não é permissão. Os dois lados têm de casar.
      const service = lerSrc('modules', 'caixa', 'caixa.service.ts');
      expect(service).toContain('podeLancarNoCaixa(caixa.userId, userId, papel)');
      const controller = lerSrc('modules', 'caixa', 'caixa.controller.ts');
      const semPapel = ['registrarRecebimento', 'registrarRecebimentoLote', 'registrarMovimento', 'vendaDireta']
        .filter((metodo) => !new RegExp(`${metodo}\\([^)]*papel\\)`).test(controller));
      expect(semPapel).toEqual([]);   // se falhar, a lista diz QUAL endpoint esqueceu o papel
    });

    it('quem lançou continua gravado — a mão do adm não vira anônima', () => {
      const service = lerSrc('modules', 'caixa', 'caixa.service.ts');
      expect(service).toContain('exigirDonoDoCaixa(caixaId, userId, papel)');
    });
  });
});
