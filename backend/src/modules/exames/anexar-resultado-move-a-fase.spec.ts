import { ExamesService } from './exames.service';

/**
 * ANEXAR O LAUDO E DIZER QUE ELE CHEGOU SÃO A MESMA AÇÃO.
 *
 * Cintia, 12/09/2026: "Ao anexar o exame pelo kanban ele salva na ficha do pet".
 *
 * Não há cópia para a ficha: o card É o registro do pet (mesma lista `petexa_<pet>` que a aba
 * Exames lê). O que este método precisa garantir é que as duas coisas andem juntas.
 *
 * Separadas, a gravação podia dar certo e a mudança de fase falhar — e o card ficaria com laudo
 * anexado parado em "Retirado", dizendo que o laboratório ainda está com o material e contando
 * atraso de um exame que já voltou. O quadro mentindo sobre o próprio estado.
 */
const FASES = [
  { id: 'f1', valor: JSON.stringify({ nome: 'Solicitar' }) },
  { id: 'f2', valor: JSON.stringify({ nome: 'Retirado' }) },
  { id: 'f3', valor: JSON.stringify({ nome: 'Resultado' }) },
  { id: 'f4', valor: JSON.stringify({ nome: 'Entregue' }) },
];

function prismaCom(card: any, fases = FASES) {
  const gravado: any = { valor: null };
  return {
    gravado,
    prisma: {
      listaItem: {
        findUnique: async () => card,
        findMany: async ({ where }: any) => (where?.lista === 'exame_fases' ? fases : []),
        update: async ({ data }: any) => { gravado.valor = JSON.parse(data.valor); return {}; },
      },
    } as any,
  };
}

const CARD = {
  id: 'c1',
  lista: 'petexa_pet1',
  valor: JSON.stringify({ nome: 'Citologia', status: 'Retirado', date: '2026-09-01T09:00:00-03:00' }),
};

describe('anexar resultado move a fase', () => {
  it('grava o laudo E move para Resultado, numa operação só', async () => {
    const { prisma, gravado } = prismaCom(CARD);
    const r = await new ExamesService(prisma, {} as any, {} as any)
      .anexarResultado('c1', 'https://arquivo/laudo.pdf', 'laudo.pdf', 'Dra. Ana');

    expect(r.ok).toBe(true);
    expect(gravado.valor.resultadoUrl).toBe('https://arquivo/laudo.pdf');
    expect(gravado.valor.resultadoArquivo).toBe('laudo.pdf');
    expect(gravado.valor.status).toBe('Resultado');
  });

  it('deixa registrado quem anexou e quando — laudo sem dono não se audita', () => {
    return (async () => {
      const { prisma, gravado } = prismaCom(CARD);
      await new ExamesService(prisma, {} as any, {} as any)
        .anexarResultado('c1', 'https://x/l.pdf', 'l.pdf', 'Dra. Ana');
      expect(gravado.valor.resultadoPor).toBe('Dra. Ana');
      expect(gravado.valor.resultadoEm).toBeTruthy();
      expect(gravado.valor.historico.Resultado.at).toBeTruthy();
    })();
  });

  it('NÃO apaga o que já estava no card', async () => {
    // O card carrega o vínculo com o item da venda e o histórico das fases. Reescrevê-lo por
    // inteiro em vez de acrescentar soltaria o exame da venda de onde ele nasceu.
    const comVinculo = {
      ...CARD,
      valor: JSON.stringify({ nome: 'Citologia', status: 'Retirado', itemVendaId: 'iv-9', fornecedorId: 'lab-1', prazoDias: 5, historico: { Retirado: { at: '2026-09-02' } } }),
    };
    const { prisma, gravado } = prismaCom(comVinculo);
    await new ExamesService(prisma, {} as any, {} as any).anexarResultado('c1', 'https://x/l.pdf');

    expect(gravado.valor.itemVendaId).toBe('iv-9');
    expect(gravado.valor.fornecedorId).toBe('lab-1');
    expect(gravado.valor.prazoDias).toBe(5);
    expect(gravado.valor.historico.Retirado.at).toBe('2026-09-02');   // o passado não é reescrito
  });

  it('recusa laudo sem arquivo, e não toca no card', async () => {
    const { prisma, gravado } = prismaCom(CARD);
    const svc = new ExamesService(prisma, {} as any, {} as any);
    for (const vazio of ['', '   ', null, undefined]) {
      const r = await svc.anexarResultado('c1', vazio as any);
      expect(r.ok).toBe(false);
    }
    expect(gravado.valor).toBeNull();
  });

  it('id que não é card de exame é recusado', async () => {
    const { prisma, gravado } = prismaCom({ id: 'x', lista: 'petboletim_pet1', valor: '{}' });
    const r = await new ExamesService(prisma, {} as any, {} as any).anexarResultado('x', 'https://x/l.pdf');
    expect(r.ok).toBe(false);
    expect(gravado.valor).toBeNull();
  });

  it('sem coluna de resultado configurada, GRAVA o laudo e deixa a fase onde está', async () => {
    // Melhor um card na coluna errada do que o laudo recusado: o arquivo já subiu, e perdê-lo
    // por causa de uma configuração de fases faria o vet refazer tudo sem entender o motivo.
    const semResultado = [
      { id: 'f1', valor: JSON.stringify({ nome: 'Solicitar' }) },
      { id: 'f2', valor: JSON.stringify({ nome: 'Retirado' }) },
    ];
    const { prisma, gravado } = prismaCom(CARD, semResultado);
    const r = await new ExamesService(prisma, {} as any, {} as any).anexarResultado('c1', 'https://x/l.pdf');

    expect(r.ok).toBe(true);
    expect(gravado.valor.resultadoUrl).toBe('https://x/l.pdf');
    expect(gravado.valor.status).toBe('Retirado');
  });

  it('acha a coluna mesmo com outro nome — a busca é por texto, não por palavra exata', async () => {
    const renomeada = [
      { id: 'f1', valor: JSON.stringify({ nome: 'Solicitar' }) },
      { id: 'f2', valor: JSON.stringify({ nome: 'Retirado' }) },
      { id: 'f3', valor: JSON.stringify({ nome: 'Resultados prontos' }) },
      { id: 'f4', valor: JSON.stringify({ nome: 'Entregue' }) },
    ];
    const { prisma, gravado } = prismaCom(CARD, renomeada);
    await new ExamesService(prisma, {} as any, {} as any).anexarResultado('c1', 'https://x/l.pdf');
    expect(gravado.valor.status).toBe('Resultados prontos');
  });
});
