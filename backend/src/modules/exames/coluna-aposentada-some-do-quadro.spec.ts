import { readFileSync } from 'fs';
import { join } from 'path';
import { fasesVigentes, faseNormalizada, atrasoDoExame, FASES_PADRAO } from './exames.regras';

/**
 * A COLUNA QUE FOI "ELIMINADA" E CONTINUOU NA TELA.
 *
 * Cintia, 12/09/2026: "Aguardando: vamos eliminar (redundante)". Eu mudei FASES_PADRAO,
 * publiquei, e em 14/09 ela voltou: "a alteração no exame ainda não aconteceu" — com a tela
 * mostrando Solicitar · Retirado · Aguardando · Resultado, e um exame parado em Aguardando.
 *
 * A causa: as colunas moram no BANCO (lista `exame_fases`), não no código. FASES_PADRAO é só a
 * rede de quem NUNCA configurou. A clínica dela tinha a lista salva, então mudar o padrão não
 * mudou nada — e nada no sistema avisou que o pedido não tinha tido efeito.
 *
 * E tinha uma armadilha pior esperando: se ela tivesse apagado a coluna na mão, o card gravado
 * em "Aguardando" não pareceria nenhuma das colunas restantes e o quadro o jogaria na PRIMEIRA
 * ("Solicitar"). O laboratório já tinha levado o material, e a equipe seria mandada pedir a
 * coleta de novo.
 */
describe('coluna aposentada some do quadro', () => {
  const CONFIG_DELA = ['Solicitar', 'Retirado', 'Aguardando', 'Resultado', 'Entregue'];

  describe('a lista configurada perde os nomes aposentados', () => {
    it('"Aguardando" sai da configuração dela, sem ela precisar editar nada', () => {
      expect(fasesVigentes(CONFIG_DELA)).toEqual(['Solicitar', 'Retirado', 'Resultado', 'Entregue']);
    });

    it('sobram TRÊS colunas no quadro — a última não é coluna, tira o card de vista', () => {
      const vigentes = fasesVigentes(CONFIG_DELA);
      expect(vigentes.slice(0, -1)).toEqual(['Solicitar', 'Retirado', 'Resultado']);
    });

    it('o padrão de quem nunca configurou já está limpo', () => {
      expect(fasesVigentes(FASES_PADRAO)).toEqual(FASES_PADRAO);
    });

    it('sem destino na lista, o nome velho É a coluna e NÃO pode sumir', () => {
      // Uma casa cuja coluna de retirada se chama "Retirar" perderia a etapa inteira se a regra
      // fosse "todo nome aposentado sai". Ela só sai quando há para onde os cards irem.
      expect(fasesVigentes(['Solicitar', 'Retirar', 'Resultado'])).toEqual(['Solicitar', 'Retirar', 'Resultado']);
      expect(fasesVigentes(['Solicitado', 'Retirado', 'Resultado'])).toEqual(['Solicitado', 'Retirado', 'Resultado']);
    });

    it('aguenta lista vazia, nula e com buracos sem inventar coluna', () => {
      expect(fasesVigentes([])).toEqual([]);
      expect(fasesVigentes(null as any)).toEqual([]);
      expect(fasesVigentes(['Solicitar', '', '  ', null as any, 'Retirado'])).toEqual(['Solicitar', 'Retirado']);
    });
  });

  describe('o card gravado na coluna que saiu', () => {
    const VIGENTES = fasesVigentes(CONFIG_DELA);

    it('é LIDO em "Retirado" — não volta para "Solicitar"', () => {
      // O erro que isto impede: de volta na primeira coluna, o exame entraria no lembrete diário
      // e a recepção pediria de novo a coleta de um material que o laboratório já levou.
      expect(faseNormalizada('Aguardando', VIGENTES)).toBe('Retirado');
      expect(faseNormalizada('Aguardando', VIGENTES)).not.toBe('Solicitar');
    });

    it('e passa a contar atraso, que era o que não acontecia', () => {
      // Com "Aguardando" ainda na lista, o exame ficava numa coluna que não era a de retirada —
      // e atraso só corre entre "o laboratório levou" e "o laudo chegou". Ficava invisível.
      const exame = { status: 'Aguardando', date: '2026-09-01T09:00:00-03:00', prazoDias: 3 };
      expect(atrasoDoExame(exame, CONFIG_DELA, '2026-09-14T09:00:00-03:00').atrasado).toBe(false);
      const agora = atrasoDoExame(exame, VIGENTES, '2026-09-14T09:00:00-03:00');
      expect(agora.atrasado).toBe(true);
      expect(agora.dias).toBe(10);
    });
  });

  describe('a tela e o servidor leem a MESMA lista', () => {
    const lerSrc = (...p: string[]) => readFileSync(join(__dirname, ...p), 'utf8');
    const lerWeb = (...p: string[]) =>
      readFileSync(join(__dirname, '..', '..', '..', '..', 'vet-crm', ...p), 'utf8');

    it('o service filtra as fases antes de entregá-las', () => {
      // Sem isto o backend continuaria achando que "Aguardando" é uma coluna legítima, e o
      // quadro mostraria uma coisa enquanto os lembretes calculariam outra.
      expect(lerSrc('exames.service.ts')).toContain('fasesVigentes(nomes)');
    });

    it('o quadro NÃO tem a sua própria lista de reserva', () => {
      // Era assim que "Aguardando" sobrevivia: uma segunda lista, escrita dentro da tela, que
      // ninguém lembrava de atualizar junto com o padrão do backend.
      const kanban = lerWeb('app', '(user)', 'dashboard', 'erp', 'exames-kanban', 'page.tsx');
      expect(kanban).not.toMatch(/\[\s*"Solicitar"\s*,/);
      expect(kanban).toContain('loadExameFases()');
    });

    it('o quadro traduz o nome antigo ANTES de escolher a coluna', () => {
      const kanban = lerWeb('app', '(user)', 'dashboard', 'erp', 'exames-kanban', 'page.tsx');
      expect(kanban).toContain('faseNormalizada(status, colunas)');
    });

    it('a tela aplica o mesmo corte que o servidor', () => {
      expect(lerWeb('lib', 'exameFases.ts')).toContain('fasesVigentes(arr)');
    });
  });
});
