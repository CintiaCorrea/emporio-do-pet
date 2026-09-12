import { ListasService } from './listas.service';

// 🛡️ SALVAR DUAS VEZES O MESMO CONTEÚDO NÃO PODE FALHAR.
//
// Cintia, 12/09/2026: "o boletim da fisio não está salvando". lista_itens tem índice ÚNICO em
// (lista, valor), e a tela do boletim não guardava o id do que acabava de criar — então toda
// gravação seguinte tentava CRIAR de novo o mesmo registro. Confirmado no banco:
//
//   duplicate key value violates unique constraint "lista_itens_lista_valor_key"
//
// Salvava na primeira e falhava em todas as seguintes. São 12 telas chamando esta rota; por
// isso a correção mora aqui, e não só na tela.

const P2002 = Object.assign(new Error('unique'), { code: 'P2002' });

function servico(prisma: any) {
  return new ListasService(prisma as any);
}

describe('criar item de lista é idempotente', () => {
  it('conteúdo novo: cria normalmente', async () => {
    const prisma = { listaItem: { create: jest.fn().mockResolvedValue({ id: 'a', ativo: true }) } };
    const r = await servico(prisma).create({ lista: 'petboletim_x', valor: '{"a":1}' } as any);
    expect(r).toEqual({ id: 'a', ativo: true });
  });

  it('conteúdo IDÊNTICO já salvo: devolve o que existe, em vez de estourar', async () => {
    const prisma = {
      listaItem: {
        create: jest.fn().mockRejectedValue(P2002),
        findFirst: jest.fn().mockResolvedValue({ id: 'ja-existe', ativo: true }),
        update: jest.fn(),
      },
    };
    const r = await servico(prisma).create({ lista: 'petboletim_x', valor: '{"a":1}' } as any);
    expect(r).toEqual({ id: 'ja-existe', ativo: true });
    expect(prisma.listaItem.update).not.toHaveBeenCalled();
  });

  it('se o item estava desativado, reativa — pedir para criar é pedir que ele valha', async () => {
    const prisma = {
      listaItem: {
        create: jest.fn().mockRejectedValue(P2002),
        findFirst: jest.fn().mockResolvedValue({ id: 'dorminhoco', ativo: false }),
        update: jest.fn().mockResolvedValue({ id: 'dorminhoco', ativo: true }),
      },
    };
    const r = await servico(prisma).create({ lista: 'x', valor: 'y' } as any);
    expect(prisma.listaItem.update).toHaveBeenCalledWith({ where: { id: 'dorminhoco' }, data: { ativo: true } });
    expect(r).toEqual({ id: 'dorminhoco', ativo: true });
  });

  it('erro que NÃO é duplicidade continua estourando — não engolir falha de verdade', async () => {
    const outro = Object.assign(new Error('banco caiu'), { code: 'P1001' });
    const prisma = { listaItem: { create: jest.fn().mockRejectedValue(outro), findFirst: jest.fn() } };
    await expect(servico(prisma).create({ lista: 'x', valor: 'y' } as any)).rejects.toThrow('banco caiu');
    expect(prisma.listaItem.findFirst).not.toHaveBeenCalled();
  });
});
