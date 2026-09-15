import { readFileSync } from 'fs';
import { join } from 'path';
import { ExamesService } from './exames.service';

/**
 * TODA VENDA COM EXAME CRIA O CARD — venha de onde vier.
 *
 * Cintia, 15/09/2026: "Não estava salvando os exames nas comandas, não sei se é porque estávamos
 * mexendo." Não era. Os números de produção: em 10 dias, 13 exames vendidos e UM card criado.
 *
 * A causa era a FORMA. Só o PDV e a conversão de orçamento criavam o card; editar uma comanda, a
 * comanda da ficha, o atendimento — todas gravavam o item e não avisavam ninguém. O exame era
 * cobrado do cliente e não existia para o laboratório: sem quadro, sem solicitação de coleta e,
 * pior, sem conta a pagar. Cada tela nova era mais uma chance de esquecer.
 *
 * E havia um segundo buraco atrás do primeiro: editar a comanda APAGA e recria todos os itens
 * com ids novos, deixando o `itemVendaId` do card apontando para o vazio — justamente o vínculo
 * que autoriza o a-pagar a nascer.
 */
const FASES = [
  { id: 'f1', valor: JSON.stringify({ nome: 'Solicitar' }) },
  { id: 'f2', valor: JSON.stringify({ nome: 'Retirado' }) },
  { id: 'f3', valor: JSON.stringify({ nome: 'Resultado' }) },
  { id: 'f4', valor: JSON.stringify({ nome: 'Entregue' }) },
];

type Cenario = {
  venda?: any;
  itens?: any[];
  catalogo?: any[];
  cards?: any[];
  itensVivos?: string[];
};

function montar(c: Cenario) {
  const criados: any[] = [];
  const atualizados: any[] = [];
  const prisma: any = {
    appointment: { findUnique: async () => c.venda ?? null },
    appointmentItem: {
      findMany: async ({ where }: any) =>
        where?.id?.in
          ? (c.itensVivos ?? (c.itens || []).map((i) => i.id)).filter((id: string) => where.id.in.includes(id)).map((id: string) => ({ id }))
          : (c.itens || []),
    },
    // O mock HONRA o filtro de tipo. A primeira versão ignorava, e com isso o teste "quem diz que
    // é exame é o catálogo" passava um SERVICO adiante — um mock frouxo teria aprovado
    // exatamente o bug que este arquivo existe para impedir.
    itemCatalogo: {
      findMany: async ({ where }: any) =>
        (c.catalogo || []).filter((x) => where.id.in.includes(x.id) && (!where.tipo || x.tipo === where.tipo)),
    },
    itemExame: { findUnique: async () => null },
    listaItem: {
      findMany: async ({ where }: any) => (where?.lista === 'exame_fases' ? FASES : (c.cards || [])),
      create: async ({ data }: any) => { criados.push({ lista: data.lista, d: JSON.parse(data.valor) }); return {}; },
      update: async ({ where, data }: any) => { atualizados.push({ id: where.id, d: JSON.parse(data.valor) }); return {}; },
    },
  };
  return { prisma, criados, atualizados, svc: new ExamesService(prisma, {} as any, {} as any) };
}

const VENDA = { id: 'v1', petId: 'p1', type: 'Venda' };
const CAT_EXAME = { id: 'cat-hemo', tipo: 'EXAME' };

describe('toda venda com exame cria o card', () => {
  it('cria o card de um exame que ainda não tem — a comanda editada era o caso mais comum', async () => {
    const { svc, criados } = montar({
      venda: VENDA,
      itens: [{ id: 'it1', descricao: 'HEMOGRAMA COMPLETO', catalogoItemId: 'cat-hemo', fornecedorId: 'lab1', custoUnitario: 30, valorUnitario: 80 }],
      catalogo: [CAT_EXAME],
      cards: [],
    });
    const r = await svc.garantirCardsDaVenda('v1');

    expect(r).toEqual({ criados: 1, religados: 0 });
    expect(criados[0].lista).toBe('petexa_p1');
    expect(criados[0].d.nome).toBe('HEMOGRAMA COMPLETO');
    expect(criados[0].d.itemVendaId).toBe('it1');       // nasce já ligado ao item da venda
    expect(criados[0].d.status).toBe('Solicitar');
  });

  it('QUEM DIZ QUE É EXAME É O CATÁLOGO, não o que a tela mandou', async () => {
    // A tela mandar `tipoItem` errado foi metade do problema. Agora o item é classificado pelo
    // cadastro, e uma tela distraída não consegue mais fazer o exame desaparecer.
    const { svc, criados } = montar({
      venda: VENDA,
      itens: [{ id: 'it1', descricao: 'CONSULTA', catalogoItemId: 'cat-consulta' }],
      catalogo: [{ id: 'cat-consulta', tipo: 'SERVICO' }],
      cards: [],
    });
    expect(await svc.garantirCardsDaVenda('v1')).toEqual({ criados: 0, religados: 0 });
    expect(criados).toEqual([]);
  });

  it('não duplica: rodar de novo na mesma venda não cria nada', async () => {
    // É chamado no create E no update, e pode ser chamado de novo a qualquer momento.
    const { svc, criados, atualizados } = montar({
      venda: VENDA,
      itens: [{ id: 'it1', descricao: 'HEMOGRAMA COMPLETO', catalogoItemId: 'cat-hemo' }],
      catalogo: [CAT_EXAME],
      cards: [{ id: 'c1', valor: JSON.stringify({ nome: 'HEMOGRAMA COMPLETO', status: 'Retirado', itemVendaId: 'it1' }) }],
    });
    expect(await svc.garantirCardsDaVenda('v1')).toEqual({ criados: 0, religados: 0 });
    expect(criados).toEqual([]);
    expect(atualizados).toEqual([]);
  });

  describe('a comanda editada, que apaga e recria os itens', () => {
    it('RELIGA o card ao item novo, em vez de criar um segundo', async () => {
      // Sem isto, cada edição de comanda deixava um exame órfão: cobrado do cliente, sem custo
      // lançado, e um card fantasma no quadro ao lado do novo.
      const { svc, criados, atualizados } = montar({
        venda: VENDA,
        itens: [{ id: 'it-NOVO', descricao: 'HEMOGRAMA COMPLETO', catalogoItemId: 'cat-hemo' }],
        catalogo: [CAT_EXAME],
        cards: [{ id: 'c1', valor: JSON.stringify({ nome: 'HEMOGRAMA COMPLETO', status: 'Retirado', itemVendaId: 'it-VELHO' }) }],
        itensVivos: ['it-NOVO'],   // o id antigo não existe mais
      });
      const r = await svc.garantirCardsDaVenda('v1');

      expect(r).toEqual({ criados: 0, religados: 1 });
      expect(criados).toEqual([]);
      expect(atualizados[0].id).toBe('c1');
      expect(atualizados[0].d.itemVendaId).toBe('it-NOVO');
      expect(atualizados[0].d.status).toBe('Retirado');   // a fase em que estava é preservada
    });

    it('dois exames iguais viram dois cards — cada órfão é consumido uma vez só', async () => {
      const { svc, criados, atualizados } = montar({
        venda: VENDA,
        itens: [
          { id: 'itA', descricao: 'CITOLOGIA', catalogoItemId: 'cat-hemo' },
          { id: 'itB', descricao: 'CITOLOGIA', catalogoItemId: 'cat-hemo' },
        ],
        catalogo: [CAT_EXAME],
        cards: [{ id: 'c1', valor: JSON.stringify({ nome: 'CITOLOGIA', itemVendaId: 'velho' }) }],
        itensVivos: ['itA', 'itB'],
      });
      const r = await svc.garantirCardsDaVenda('v1');

      expect(r).toEqual({ criados: 1, religados: 1 });
      expect(atualizados[0].d.itemVendaId).toBe('itA');
      expect(criados[0].d.itemVendaId).toBe('itB');
    });

    it('card ARQUIVADO ou ENTREGUE não é religado — ele saiu do quadro de propósito', async () => {
      for (const extra of [{ arquivadoEm: '2026-09-10' }, { entregueAt: '2026-09-10' }]) {
        const { svc, criados, atualizados } = montar({
          venda: VENDA,
          itens: [{ id: 'itA', descricao: 'CITOLOGIA', catalogoItemId: 'cat-hemo' }],
          catalogo: [CAT_EXAME],
          cards: [{ id: 'c1', valor: JSON.stringify({ nome: 'CITOLOGIA', itemVendaId: 'velho', ...extra }) }],
          itensVivos: ['itA'],
        });
        const r = await svc.garantirCardsDaVenda('v1');
        expect(r.religados).toBe(0);
        expect(r.criados).toBe(1);   // o exame vendido de novo merece card novo
        expect(atualizados).toEqual([]);
        expect(criados.length).toBe(1);
      }
    });
  });

  describe('o que NÃO deve virar card', () => {
    it('orçamento não cria exame — ele vira card quando é convertido', async () => {
      const { svc, criados } = montar({
        venda: { id: 'v1', petId: 'p1', type: 'Orçamento' },
        itens: [{ id: 'it1', descricao: 'HEMOGRAMA', catalogoItemId: 'cat-hemo' }],
        catalogo: [CAT_EXAME],
      });
      expect(await svc.garantirCardsDaVenda('v1')).toEqual({ criados: 0, religados: 0 });
      expect(criados).toEqual([]);
    });

    it('venda sem pet não cria nada — o card mora na ficha de um pet', async () => {
      const { svc } = montar({ venda: { id: 'v1', petId: null, type: 'Venda' } });
      expect(await svc.garantirCardsDaVenda('v1')).toEqual({ criados: 0, religados: 0 });
    });

    it('item sem catalogoItemId não é adivinhado', async () => {
      // Venda antiga ou item digitado à mão: melhor não criar card do que inventar um exame.
      const { svc, criados } = montar({
        venda: VENDA,
        itens: [{ id: 'it1', descricao: 'HEMOGRAMA COMPLETO', catalogoItemId: null }],
        catalogo: [CAT_EXAME],
      });
      expect(await svc.garantirCardsDaVenda('v1')).toEqual({ criados: 0, religados: 0 });
      expect(criados).toEqual([]);
    });

    it('venda inexistente, ou id vazio, não quebram', async () => {
      const { svc } = montar({ venda: null });
      expect(await svc.garantirCardsDaVenda('nao-existe')).toEqual({ criados: 0, religados: 0 });
      expect(await svc.garantirCardsDaVenda('')).toEqual({ criados: 0, religados: 0 });
    });
  });

  describe('a recuperação dos exames perdidos', () => {
    it('aceita nascer direto em "Resultado"', async () => {
      // Cintia, 15/09/2026: "se entrarem no kanban coloque na aba de resultados, pois eles já
      // devem ter sido entregues".
      const { svc, criados } = montar({
        venda: VENDA,
        itens: [{ id: 'it1', descricao: 'CITOLOGIA', catalogoItemId: 'cat-hemo' }],
        catalogo: [CAT_EXAME],
        cards: [],
      });
      await svc.garantirCardsDaVenda('v1', { statusInicial: 'Resultado' });
      expect(criados[0].d.status).toBe('Resultado');
      expect(criados[0].d.historico.Resultado).toBeTruthy();
    });
  });

  describe('o gatilho está ligado nas duas pontas', () => {
    const ler = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8');

    it('quem grava itens EMITE o evento — no create e no update', () => {
      // O update é o que mais importa: é a edição de comanda, o caso mais comum do problema.
      const src = ler('appointments', 'appointments.service.ts');
      expect(src).toContain("emit('venda.itens.gravados'");
      expect((src.match(/this\.avisarItensGravados\(/g) || []).length).toBeGreaterThanOrEqual(2); // create + update
    });

    it('e o módulo de exames ESCUTA', () => {
      const src = readFileSync(join(__dirname, 'exames.service.ts'), 'utf8');
      expect(src).toContain("@OnEvent('venda.itens.gravados')");
      // Nunca deixa o erro subir: a venda já foi gravada e não pode cair por causa do card.
      const fn = src.slice(src.indexOf('async aoGravarItensDaVenda('), src.indexOf('async aoGravarItensDaVenda(') + 400);
      expect(fn).toContain('catch');
    });
  });
});

describe('UM criador, e só um', () => {
  // Cintia, 15/09/2026, com o print do quadro: "os cards dos exames estão sendo duplicados".
  //
  // Era eu. Quando o ponto único entrou, o ponto de venda e a conversão de orçamento CONTINUARAM
  // criando o card por conta própria — dois cards por exame vendido, no mesmo segundo, um com
  // origem PDV e outro com origem VENDA.
  //
  // A lição é a do próprio ponto único, do avesso: o problema nunca foi uma tela esquecer de
  // criar o card, foi EXISTIR mais de um lugar que cria. Acrescentar o criador central sem
  // remover os antigos trocou "faltar" por "sobrar".
  const ler = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8');

  it('o ponto de venda NÃO cria card de exame', () => {
    expect(ler('caixa', 'caixa.service.ts')).not.toContain('iniciarExamesDaVenda');
  });

  it('a conversão de orçamento NÃO cria card de exame', () => {
    expect(ler('orcamentos', 'orcamentos.service.ts')).not.toContain('iniciarExamesDaVenda');
  });

  it('quem cria é o ouvinte do evento, e mais ninguém', () => {
    // A internação continua com porta própria (`exames/iniciar`): ela não passa por
    // appointmentItem, então o ponto único não a alcança. É a exceção, e é deliberada.
    const svc = ler('exames', 'exames.service.ts');
    expect(svc).toContain("@OnEvent('venda.itens.gravados')");
    expect(svc).toContain('async iniciarExamesDaVenda(');   // segue existindo para a internação
  });
});
