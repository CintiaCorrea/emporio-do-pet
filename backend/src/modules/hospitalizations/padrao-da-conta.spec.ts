import * as fs from 'fs';
import * as path from 'path';

// 🛡️ PROTEÇÃO DO PADRÃO DA CONTA DA INTERNAÇÃO.
//
// A Cintia, em 06/09/2026: "assim que estiver tudo dentro desse padrão podemos 'proteger'
// para que qualquer movimentação que barre no que construímos seja questionado".
//
// Os testes de regra (fechamento.regras.spec) provam que o CÁLCULO está certo. Estes aqui
// provam outra coisa: que ninguém desfez o DESENHO — e é aí que a gente se perdeu.
//
// A história: eu deixei um botão manual "Gerar diárias por dia" pra fazer o que devia ser
// automático. A ficha da Kate (que migrei à mão) ficou no padrão, as outras não. Ela levou
// dias notando telas diferentes pro mesmo conceito, e resumiu: "essa falta de padronização
// no que conversamos e estabelecemos dificulta e atrasa muito o trabalho".
//
// Cálculo errado um teste de unidade pega. Caminho paralelo reintroduzido, não — ele passa
// no build, passa no tsc, e só aparece quando alguém abre a tela e estranha. Estes testes
// existem pra falhar ANTES disso, com o motivo escrito.

const raiz = path.resolve(__dirname, '../../../..');
const ler = (p: string) => fs.readFileSync(path.join(raiz, p), 'utf8');

const FICHA = 'vet-crm/app/(user)/dashboard/erp/internacoes/[id]/page.tsx';
const SERVICE = 'backend/src/modules/hospitalizations/hospitalizations.service.ts';

describe('o padrão da conta da internação', () => {
  describe('a diária é ITEM do dia, nunca um número somado por fora', () => {
    it('o servidor cria a diária como item ao abrir a ficha', () => {
      const svc = ler(SERVICE);
      expect(svc).toContain('garantirDiariasComoItens');
      expect(svc).toMatch(/garantirDiariasComoItens\([^)]*\)/);
      // Tem de ser chamado no getById — é o que faz valer pra TODA internação, e não só
      // pra quem clicou num botão.
      const getById = svc.slice(svc.indexOf('async getById'), svc.indexOf('async update'));
      expect(getById).toContain('garantirDiariasComoItens');
    });

    it('a tela NÃO soma a diária por fora dos itens', () => {
      const ficha = ler(FICHA);
      // `diariaTotal` existe pra compatibilidade, mas tem de ser zero: a diária já entra
      // pelos itens da conta. Voltar a multiplicar aqui cobra a mesma diária duas vezes.
      expect(ficha).toMatch(/const diariaTotal = 0;/);
      expect(ficha).not.toMatch(/const diariaTotal = dias \* diariaVU/);
    });

    it('não existe mais caminho MANUAL pra gerar diárias', () => {
      const ficha = ler(FICHA);
      for (const morto of ['gerarDiariasPorDia', 'desfazerDiariasPorDia', 'diariasGeradas', 'diariasManuais']) {
        expect(ficha).not.toContain(morto);
      }
    });
  });

  describe('a cobrança tem UM caminho só', () => {
    it('quem decide o que entra na comanda é o núcleo, não a tela', () => {
      const svc = ler(SERVICE);
      expect(svc).toContain("from './fechamento.regras'");
      expect(svc).toContain('montarFechamento');
    });

    it('a tela pede o fechamento ao servidor e não recalcula nada', () => {
      const ficha = ler(FICHA);
      expect(ficha).toContain('/fechar-dia');
      // A tela manda o DIA. Se um dia ela voltar a montar a lista de itens da venda, é
      // sinal de que o segundo caminho de cobrança nasceu de novo — foi ele que cobrou
      // cliente duas vezes.
      expect(ficha).toMatch(/body: JSON\.stringify\(\{ dia \}\)/);
    });

    it('item já cobrado carrega a venda que o cobrou', () => {
      const svc = ler(SERVICE);
      expect(svc).toMatch(/baixado: true, comandaId: venda\.id/);
    });

    it('apagar uma venda solta os itens que apontavam pra ela', () => {
      const apt = ler('backend/src/modules/appointments/appointments.service.ts');
      expect(apt).toContain("lista: { startsWith: 'intconta_' }".replace(/'/g, '"'));
      expect(apt).toMatch(/d\.baixado = false/);
    });
  });

  describe('as travas que protegem dinheiro', () => {
    it('sem o peso do pet não se lança item', () => {
      const ficha = ler(FICHA);
      expect(ficha).toMatch(/if \(!pesoPet\) \{/);
      expect(ficha).toContain('está sem peso no cadastro');
    });

    it('a hora de entrada é corrigível, e depois da semana de ajuste só pelo adm', () => {
      const svc = ler(SERVICE);
      expect(svc).toContain('dentroDaSemanaDeAjuste');
      expect(svc).toMatch(/admissionAt/);
    });

    it('a conta mostra o DIA de cada item — é o que o cliente confere', () => {
      const ficha = ler(FICHA);
      expect(ficha).toContain('contaPorDia');
      expect(ficha).toMatch(/at: emQueI\.toISOString\(\)/);
    });
  });

  describe('nenhum hook depois do early return', () => {
    // Em 06/09/2026 dois hooks abaixo do `if (loading) return` derrubaram a ficha inteira
    // em produção: "Application error: a client-side exception". Build e tsc passaram os
    // dois. Este teste é a trava que faltava.
    it('a ficha da internação não tem hook abaixo do "carregando"', () => {
      const ficha = ler(FICHA).split('\r\n').join('\n');
      // A ancora e a INSTRUCAO (comeco de linha, dois espacos), nao qualquer ocorrencia do
      // texto: na primeira versao deste teste ele casou com o COMENTARIO que eu tinha
      // deixado avisando sobre esse mesmo erro, e acusou hooks que estavam no lugar certo.
      // Teste que acusa errado ensina a equipe a ignorar teste.
      const corte = ficha.search(/^ {2}if \(loading\) return/m);
      expect(corte).toBeGreaterThan(0);
      const depois = ficha.slice(corte);
      const hooks = depois.match(/^\s{2}const \[?\w+.*use(State|Memo|Effect|Callback|Ref)\(/gm) || [];
      expect(hooks).toEqual([]);
    });
  });
});
