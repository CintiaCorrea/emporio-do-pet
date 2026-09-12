import { ligarCardsSoltosDoPet } from './vincular-item-da-venda';

// O EXAME DA INTERNAÇÃO (Cintia, 12/09/2026: "internação também tem que ir para o kanban").
//
// Lá o card nasce ANTES da venda: o exame entra na conta do dia, e a conta do dia só vira venda
// depois. Então o vínculo é feito do outro lado — quando a venda do dia aparece.
//
// Sem ele, a conta a pagar do laboratório volta a esperar o cliente pagar, que é o oposto da
// regra de 07/09/2026.

const card = (id: string, nome: string, extra: any = {}) => ({
  id,
  valor: JSON.stringify({ nome, status: 'Solicitar', ...extra }),
});

function prismaDeMentira(cards: any[], itens: any[]) {
  const gravados: { id: string; valor: string }[] = [];
  return {
    gravados,
    prisma: {
      listaItem: {
        findMany: async () => cards,
        update: async ({ where, data }: any) => { gravados.push({ id: where.id, valor: data.valor }); return {}; },
      },
      appointmentItem: { findMany: async () => itens },
    } as any,
  };
}

describe('ligarCardsSoltosDoPet', () => {
  it('liga o card solto ao item da venda do dia', async () => {
    const { prisma, gravados } = prismaDeMentira(
      [card('c1', 'HEMOGRAMA COMPLETO')],
      [{ id: 'i1', descricao: 'Hemograma Completo' }],
    );
    expect(await ligarCardsSoltosDoPet(prisma, 'pet1', 'apt1')).toBe(1);
    expect(JSON.parse(gravados[0].valor).itemVendaId).toBe('i1');
  });

  it('NÃO mexe em card que já tem vínculo, nem que o nome bata', async () => {
    const { prisma, gravados } = prismaDeMentira(
      [card('c1', 'HEMOGRAMA', { itemVendaId: 'i-antigo' })],
      [{ id: 'i-novo', descricao: 'HEMOGRAMA' }],
    );
    expect(await ligarCardsSoltosDoPet(prisma, 'pet1', 'apt1')).toBe(0);
    expect(gravados).toEqual([]);
  });

  it('preserva o resto do card — status, histórico, aviso ao lab', async () => {
    const { prisma, gravados } = prismaDeMentira(
      [card('c1', 'AMILASE', { status: 'Retirado', labAvisadoAt: '2026-09-11T14:30:00Z', historico: ['x'] })],
      [{ id: 'i1', descricao: 'AMILASE' }],
    );
    await ligarCardsSoltosDoPet(prisma, 'pet1', 'apt1');
    const d = JSON.parse(gravados[0].valor);
    expect(d).toMatchObject({ status: 'Retirado', labAvisadoAt: '2026-09-11T14:30:00Z', historico: ['x'], itemVendaId: 'i1' });
  });

  it('dois exames iguais casam com itens diferentes', async () => {
    const { prisma, gravados } = prismaDeMentira(
      [card('c1', 'CITOLOGIA'), card('c2', 'CITOLOGIA')],
      [{ id: 'i1', descricao: 'CITOLOGIA' }, { id: 'i2', descricao: 'CITOLOGIA' }],
    );
    expect(await ligarCardsSoltosDoPet(prisma, 'pet1', 'apt1')).toBe(2);
    expect(gravados.map((g) => JSON.parse(g.valor).itemVendaId)).toEqual(['i1', 'i2']);
  });

  it('sem par, não grava nada — não chuta', async () => {
    const { prisma, gravados } = prismaDeMentira(
      [card('c1', 'EXAME QUE NAO FOI VENDIDO')],
      [{ id: 'i1', descricao: 'OUTRA COISA' }],
    );
    expect(await ligarCardsSoltosDoPet(prisma, 'pet1', 'apt1')).toBe(0);
    expect(gravados).toEqual([]);
  });

  it('nunca estoura: derrubar o faturamento do dia por causa do exame seria pior', async () => {
    const quebrado: any = { listaItem: { findMany: async () => { throw new Error('banco fora'); } } };
    await expect(ligarCardsSoltosDoPet(quebrado, 'pet1', 'apt1')).resolves.toBe(0);
    await expect(ligarCardsSoltosDoPet({} as any, '', 'apt1')).resolves.toBe(0);
    await expect(ligarCardsSoltosDoPet({} as any, 'pet1', '')).resolves.toBe(0);
  });

  it('card ilegível é pulado, os outros seguem', async () => {
    const { prisma, gravados } = prismaDeMentira(
      [{ id: 'ruim', valor: '{{{ nao e json' }, card('c1', 'LIPASE')],
      [{ id: 'i1', descricao: 'LIPASE' }],
    );
    expect(await ligarCardsSoltosDoPet(prisma, 'pet1', 'apt1')).toBe(1);
    expect(gravados[0].id).toBe('c1');
  });
});
