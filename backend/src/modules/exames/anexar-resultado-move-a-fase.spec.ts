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

  describe('mais de um laudo no mesmo exame', () => {
    // Cintia, 15/09/2026: "em alguns momentos eu preciso adicionar mais de um laudo". Uma
    // citologia de 5 lâminas volta em partes; um histopatológico vem com laudo e adendo.
    //
    // O campo era UM só e o segundo anexo apagava o primeiro, sem avisar: o laudo sumia da ficha
    // do pet e ninguém tinha como saber que existiu.
    it('o segundo laudo SOMA, não substitui', async () => {
      const comUm = {
        ...CARD,
        valor: JSON.stringify({
          nome: 'Citologia', status: 'Resultado',
          resultadoUrl: 'https://x/lamina1.pdf', resultadoArquivo: 'lamina1.pdf',
          resultadoEm: '2026-09-15T10:00:00-03:00', resultadoPor: 'Dra. Vivian',
        }),
      };
      const { prisma, gravado } = prismaCom(comUm);
      await new ExamesService(prisma, {} as any, {} as any)
        .anexarResultado('c1', 'https://x/lamina2.pdf', 'lamina2.pdf', 'Dra. Vivian');

      expect(gravado.valor.laudos.map((l: any) => l.arquivo)).toEqual(['lamina1.pdf', 'lamina2.pdf']);
      // O campo antigo continua existindo, apontando para o mais recente: a ficha do pet, a
      // inbox e a linha do tempo leem ele, e mudá-lo obrigaria a mexer em todas.
      expect(gravado.valor.resultadoUrl).toBe('https://x/lamina2.pdf');
    });

    it('card que nunca teve laudo começa a lista com o primeiro', async () => {
      const { prisma, gravado } = prismaCom(CARD);
      await new ExamesService(prisma, {} as any, {} as any).anexarResultado('c1', 'https://x/l.pdf', 'l.pdf');
      expect(gravado.valor.laudos.length).toBe(1);
      expect(gravado.valor.laudos[0].url).toBe('https://x/l.pdf');
    });

    it('o MESMO arquivo de novo não duplica', async () => {
      // Clique duplo, ou a pessoa em dúvida se subiu. Duas linhas iguais no card fariam o vet
      // abrir os dois para descobrir que são o mesmo.
      const comUm = {
        ...CARD,
        valor: JSON.stringify({ nome: 'Citologia', laudos: [{ url: 'https://x/l.pdf', arquivo: 'l.pdf' }] }),
      };
      const { prisma, gravado } = prismaCom(comUm);
      const r = await new ExamesService(prisma, {} as any, {} as any).anexarResultado('c1', 'https://x/l.pdf', 'l.pdf');
      expect(r.ok).toBe(true);
      expect(r.jaAnexado).toBe(true);
      expect(gravado.valor).toBeNull();   // nem grava
    });

    it('o cliente NÃO é avisado de novo a cada laudo', async () => {
      // A regra já existia (`podeAvisarCliente` recusa quem tem `clienteAvisadoAt`), e este
      // teste a prende ao caso novo: três lâminas não são três mensagens ao tutor.
      const { podeAvisarCliente } = require('./exames.regras');
      const jaAvisado = { resultadoUrl: 'https://x/l2.pdf', clienteAvisadoAt: '2026-09-15T10:35:46-03:00' };
      expect(podeAvisarCliente(jaAvisado)).toBe(false);
    });
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
