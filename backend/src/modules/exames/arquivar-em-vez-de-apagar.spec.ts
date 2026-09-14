import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { ehArquivado, podeSerExpurgado, diasAteExpurgo, ARQUIVO_DIAS, precisaLembrarSolicitacao, atrasoDoExame, FASES_PADRAO } from './exames.regras';
import { ExamesService } from './exames.service';

/**
 * TIRAR DO QUADRO NÃO É DESTRUIR.
 *
 * Cintia, 13/09/2026, escolhendo entre apagar e arquivar: "Arquivar, reversível". E em
 * 14/09/2026: "Pode ficar arquivado por 45 dias pode ser? Só não pode sumir das vendas e
 * orçamentos".
 *
 * A lixeira do quadro sempre significou "some da minha frente", mas apagava de verdade — sem
 * volta e sem rastro. Quem limpasse o card errado num dia corrido perdia o acompanhamento e só
 * descobriria quando o tutor ligasse cobrando o resultado.
 *
 * O que estes testes guardam:
 *   · tirar do quadro grava uma marca, não apaga;
 *   · o arquivado some da fila, do lembrete e do aviso de atraso — e some de verdade, senão
 *     vira o alarme que ninguém consegue desligar;
 *   · o expurgo só encosta em quem TEM a marca e passou dos 45 dias;
 *   · apagar de vez é só do administrativo, e a trava é no servidor.
 */
const svcCom = (prisma: any) => new ExamesService(prisma, {} as any, {} as any);

describe('arquivar em vez de apagar', () => {
  describe('o prazo dela', () => {
    it('são 45 dias, escritos no código', () => {
      expect(ARQUIVO_DIAS).toBe(45);
    });

    it('no dia 44 ainda fica; no 45 pode sair', () => {
      const card = { arquivadoEm: '2026-09-14T10:00:00-03:00' };
      expect(podeSerExpurgado(card, '2026-10-27T10:00:00-03:00')).toBe(false);  // 43 dias
      expect(podeSerExpurgado(card, '2026-10-29T10:00:00-03:00')).toBe(true);   // 45 dias
    });

    it('a tela consegue dizer quantos dias faltam', () => {
      const card = { arquivadoEm: '2026-09-14T10:00:00-03:00' };
      expect(diasAteExpurgo(card, '2026-09-14T11:00:00-03:00')).toBe(45);
      expect(diasAteExpurgo(card, '2026-10-14T10:00:00-03:00')).toBe(15);
      expect(diasAteExpurgo(card, '2027-01-01T10:00:00-03:00')).toBe(0);
      expect(diasAteExpurgo({}, '2026-09-14T10:00:00-03:00')).toBeNull();
    });
  });

  describe('o expurgo só apaga o que deve', () => {
    it('card NUNCA arquivado não é apagado, por mais velho que seja', () => {
      // O erro que isto impede: confundir "antigo" com "descartável" e varrer o histórico de
      // exames de 2024 junto com o arquivo.
      expect(podeSerExpurgado({ } as any, '2030-01-01')).toBe(false);
      expect(podeSerExpurgado({ arquivadoEm: null }, '2030-01-01')).toBe(false);
    });

    it('data ilegível NÃO é apagada — na dúvida, o expurgo não age', () => {
      expect(podeSerExpurgado({ arquivadoEm: 'ontem' }, '2030-01-01')).toBe(false);
      expect(podeSerExpurgado({ arquivadoEm: '' }, '2030-01-01')).toBe(false);
    });

    it('na prática: apaga um a um, só os vencidos, e ignora o ilegível', async () => {
      const apagados: string[] = [];
      const prisma: any = {
        listaItem: {
          findMany: async () => [
            { id: 'vencido', valor: JSON.stringify({ nome: 'A', arquivadoEm: '2026-01-01T10:00:00-03:00' }) },
            { id: 'novo', valor: JSON.stringify({ nome: 'B', arquivadoEm: '2026-09-10T10:00:00-03:00' }) },
            { id: 'no-quadro', valor: JSON.stringify({ nome: 'C' }) },
            { id: 'quebrado', valor: 'nao e json' },
          ],
          delete: async ({ where }: any) => { apagados.push(where.id); return {}; },
        },
      };
      const r = await svcCom(prisma).expurgarArquivados('2026-09-14T10:00:00-03:00');
      expect(apagados).toEqual(['vencido']);
      expect(r.apagados).toBe(1);
    });

    it('o expurgo NÃO usa deleteMany — a data mora dentro do JSON', async () => {
      // Um `deleteMany` com filtro amplo neste lugar já levou 22 vendas embora em 31/08/2026.
      // Cada card tem de ser lido e conferido sozinho antes de sair.
      const prisma: any = {
        listaItem: {
          findMany: async () => [],
          deleteMany: async () => { throw new Error('deleteMany não pode ser usado aqui'); },
        },
      };
      await expect(svcCom(prisma).expurgarArquivados()).resolves.toEqual({ apagados: 0 });
    });
  });

  describe('o arquivado some de verdade', () => {
    const CARD = { nome: 'Citologia', status: FASES_PADRAO[0], arquivadoEm: '2026-09-14T10:00:00-03:00' };

    it('não é lembrado, mesmo parado na primeira coluna', () => {
      expect(precisaLembrarSolicitacao({ ...CARD, arquivadoEm: null }, FASES_PADRAO)).toBe(true);
      expect(precisaLembrarSolicitacao(CARD, FASES_PADRAO)).toBe(false);
    });

    it('não conta atraso, mesmo estourando o prazo', () => {
      const parado = { nome: 'X', status: 'Retirado', date: '2026-08-01T09:00:00-03:00', prazoDias: 3 };
      expect(atrasoDoExame(parado, FASES_PADRAO, '2026-09-14T09:00:00-03:00').atrasado).toBe(true);
      expect(atrasoDoExame({ ...parado, arquivadoEm: '2026-09-10' }, FASES_PADRAO, '2026-09-14T09:00:00-03:00').atrasado).toBe(false);
    });

    it('sai da fila do quadro', async () => {
      const prisma: any = {
        listaItem: {
          findMany: async ({ where }: any) =>
            where?.lista?.startsWith === 'petexa_'
              ? [
                  { id: 'fica', lista: 'petexa_p1', valor: JSON.stringify({ nome: 'Fica', status: 'Retirado' }) },
                  { id: 'sai', lista: 'petexa_p1', valor: JSON.stringify({ nome: 'Sai', status: 'Retirado', arquivadoEm: '2026-09-14T10:00:00-03:00' }) },
                ]
              : [],
        },
        pet: { findMany: async () => [{ id: 'p1', name: 'Madona', tutor: { name: 'Juliana' } }] },
        fornecedor: { findMany: async () => [] },
      };
      const fila = await svcCom(prisma).listarFila();
      expect(fila.map((f: any) => f.itemId)).toEqual(['fica']);
    });

    it('mas continua achável em Arquivados, com o prazo à vista', async () => {
      // Some do quadro e some do sistema são coisas diferentes. Sem esta lista, "reversível" era
      // só uma palavra: ninguém consegue desfazer o que não consegue encontrar.
      const prisma: any = {
        listaItem: {
          findMany: async () => [
            { id: 'fica', lista: 'petexa_p1', valor: JSON.stringify({ nome: 'Fica', status: 'Retirado' }) },
            { id: 'sai', lista: 'petexa_p1', valor: JSON.stringify({ nome: 'Sai', status: 'Retirado', arquivadoEm: new Date().toISOString() }) },
          ],
        },
        pet: { findMany: async () => [{ id: 'p1', name: 'Madona', tutor: { name: 'Juliana' } }] },
      };
      const arq = await svcCom(prisma).listarArquivados();
      expect(arq.map((a: any) => a.itemId)).toEqual(['sai']);
      expect(arq[0].petNome).toBe('Madona');
      expect(arq[0].diasParaApagar).toBe(ARQUIVO_DIAS);
    });
  });

  describe('a volta atrás', () => {
    it('restaurar tira a marca e devolve o card à fase em que ele estava', async () => {
      let gravado: any = null;
      const prisma: any = {
        listaItem: {
          findUnique: async () => ({ id: 'c', lista: 'petexa_p1', valor: JSON.stringify({ nome: 'X', status: 'Retirado', arquivadoEm: '2026-09-14T10:00:00-03:00', arquivadoPor: 'u1' }) }),
          update: async ({ data }: any) => { gravado = JSON.parse(data.valor); return {}; },
        },
      };
      const r = await svcCom(prisma).restaurar('c');
      expect(r.ok).toBe(true);
      expect(gravado.arquivadoEm).toBeUndefined();
      expect(gravado.arquivadoPor).toBeUndefined();
      // NÃO volta para a primeira coluna: o laboratório já levou o material, e recomeçar faria a
      // equipe pedir a coleta de novo.
      expect(gravado.status).toBe('Retirado');
      expect(ehArquivado(gravado)).toBe(false);
    });

    it('arquivar duas vezes não muda a data do primeiro arquivamento', async () => {
      // Senão o prazo de 45 dias reiniciava a cada clique repetido, e o arquivo nunca esvaziava.
      const chamadas: string[] = [];
      const prisma: any = {
        listaItem: {
          findUnique: async () => ({ id: 'c', lista: 'petexa_p1', valor: JSON.stringify({ nome: 'X', arquivadoEm: '2026-08-01T10:00:00-03:00' }) }),
          update: async () => { chamadas.push('update'); return {}; },
        },
      };
      const r = await svcCom(prisma).excluir('c');
      expect(r.ok).toBe(true);
      expect(chamadas).toEqual([]);
    });
  });

  describe('apagar de vez é só do administrativo', () => {
    const prismaQueApaga = (chamadas: string[]) => ({
      listaItem: {
        findUnique: async () => ({ id: 'c', lista: 'petexa_p1', valor: '{"nome":"X"}' }),
        delete: async () => { chamadas.push('delete'); return {}; },
        update: async () => { chamadas.push('update'); return {}; },
      },
    });

    it('recepção e veterinário são RECUSADOS — e nada é apagado', async () => {
      for (const papel of ['RECEPTIONIST', 'VETERINARIAN', '', null, undefined]) {
        const chamadas: string[] = [];
        const r = await svcCom(prismaQueApaga(chamadas)).excluir('c', { definitivo: true, papel: papel as any });
        expect(r.ok).toBe(false);
        expect(chamadas).toEqual([]);
      }
    });

    it('o adm apaga, e "admin" minúsculo também é adm', async () => {
      for (const papel of ['ADMIN', 'admin', 'Admin']) {
        const chamadas: string[] = [];
        const r = await svcCom(prismaQueApaga(chamadas)).excluir('c', { definitivo: true, papel });
        expect(r.ok).toBe(true);
        expect(chamadas).toEqual(['delete']);
      }
    });

    it('o controller MANDA o papel — trava que não recebe o papel não é trava', () => {
      const ctrl = readFileSync(join(__dirname, 'exames.controller.ts'), 'utf8');
      expect(ctrl).toMatch(/definitivo:\s*true,\s*papel/);
      expect(ctrl).toContain("@CurrentUser('role')");
    });
  });

  describe('as portas existem dos dois lados', () => {
    const web = (...p: string[]) => join(__dirname, '..', '..', '..', '..', 'vet-crm', ...p);

    it('o site tem as três rotas novas', () => {
      // `/api/exames/arquivados` sem pasta própria cairia na rota dinâmica `[itemId]`, que só
      // responde DELETE: o GET voltaria 405 e a gaveta apareceria sempre vazia, sem erro visível.
      const faltando = [
        ['app', 'api', 'exames', 'arquivados', 'route.ts'],
        ['app', 'api', 'exames', '[itemId]', 'restaurar', 'route.ts'],
        ['app', 'api', 'exames', '[itemId]', 'definitivo', 'route.ts'],
      ].filter((p) => !existsSync(web(...p))).map((p) => p.join('/'));
      expect(faltando).toEqual([]);
    });

    it('o backend expõe as três', () => {
      const ctrl = readFileSync(join(__dirname, 'exames.controller.ts'), 'utf8');
      expect(ctrl).toContain("@Get('arquivados')");
      expect(ctrl).toContain("@Post(':itemId/restaurar')");
      expect(ctrl).toContain("@Delete(':itemId/definitivo')");
    });

    it('o expurgo tem hora marcada — arquivo sem expurgo cresce para sempre', () => {
      expect(readFileSync(join(__dirname, 'exames.scheduler.ts'), 'utf8')).toContain('expurgarArquivados()');
    });
  });
});
