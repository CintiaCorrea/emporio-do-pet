import * as fs from 'fs';
import * as path from 'path';
import { ExamesService } from './exames.service';

// 🛡️ APAGAR O EXAME DO KANBAN NÃO PODE APAGAR A VENDA.
//
// Cintia, 12/09/2026: "se o exame for deletado do kanban, ele NÃO DEVE SER DELETADO dos outros
// lugares vendas/orçamentos."
//
// Hoje já é assim, e este teste existe para que continue sendo. É a mesma porta que em
// 31/08/2026 levou 22 vendas junto quando pediram para "zerar o financeiro": uma tela apaga o
// que é dela e leva embora o registro de dinheiro que alguém mais precisa.
//
// O desenho que protege: o card do Kanban é um `listaItem` da lista `petexa_<pet>` que GUARDA o
// id do item de venda (`itemVendaId`) como REFERÊNCIA. Ele não é dono de nada. Apagar o card
// apaga o acompanhamento; a venda, o orçamento e a conta do laboratório seguem intactos.
//
// A volta atrás seria fácil e silenciosa: bastaria alguém achar que "limpar o exame" deve
// limpar tudo e acrescentar um `appointmentItem.delete` aqui. Aí a venda perderia um item e
// ninguém ligaria uma coisa à outra.

const src = fs.readFileSync(path.resolve(__dirname, 'exames.service.ts'), 'utf8');
// O método inteiro, da assinatura até o próximo método. Era uma janela de 700 caracteres, que
// deixou de cobrir o corpo quando o excluir cresceu para arquivar — e uma janela curta demais
// faria o teste passar sem ler o trecho que ele existe para vigiar.
const corpoDoExcluir = src.slice(src.indexOf('async excluir('), src.indexOf('async restaurar('));

describe('excluir exame do Kanban', () => {
  it('o corpo do excluir só toca no card do Kanban', () => {
    expect(corpoDoExcluir).toContain('listaItem.delete');
    // nada de venda, item de venda, atendimento ou conta a pagar nesse caminho
    for (const proibido of ['appointment', 'appointmentItem', 'itemVenda.delete', 'lancamento', 'recebimento', 'orcamento']) {
      expect(corpoDoExcluir.toLowerCase()).not.toContain(proibido.toLowerCase() + '.delete');
    }
  });

  it('recusa id que não seja de um card de exame', () => {
    // `petexa_` é o prefixo da lista do Kanban. Sem esta checagem, um id qualquer de listaItem
    // (boletim, configuração, fase) seria apagado por esta rota.
    expect(corpoDoExcluir).toContain("startsWith('petexa_')");
  });

  it('na prática: mexe em UM listaItem e nada mais', async () => {
    // Desde 14/09/2026 tirar do quadro ARQUIVA em vez de apagar, mas o que este teste guarda não
    // mudou: o caminho inteiro toca um único listaItem e não encosta na venda.
    const chamadas: string[] = [];
    const prisma: any = {
      listaItem: {
        findUnique: async () => { chamadas.push('listaItem.findUnique'); return { id: 'card1', lista: 'petexa_pet1', valor: JSON.stringify({ nome: 'Hemograma', status: 'Retirado' }) }; },
        update: async () => { chamadas.push('listaItem.update'); return {}; },
        delete: async () => { chamadas.push('listaItem.delete'); return {}; },
      },
      // Qualquer toque nestes é falha do teste: são eles que guardam o dinheiro.
      appointment: new Proxy({}, { get: () => () => { chamadas.push('appointment.QUALQUER'); } }),
      appointmentItem: new Proxy({}, { get: () => () => { chamadas.push('appointmentItem.QUALQUER'); } }),
    };
    const svc = new ExamesService(prisma, {} as any, {} as any);
    const r = await svc.excluir('card1');

    expect(r.ok).toBe(true);
    expect(r.arquivado).toBe(true);
    expect(chamadas).toEqual(['listaItem.findUnique', 'listaItem.update']);
  });

  it('nem o apagar DEFINITIVO do adm encosta na venda', async () => {
    const chamadas: string[] = [];
    const prisma: any = {
      listaItem: {
        findUnique: async () => { chamadas.push('listaItem.findUnique'); return { id: 'card1', lista: 'petexa_pet1', valor: '{"nome":"X"}' }; },
        delete: async () => { chamadas.push('listaItem.delete'); return {}; },
      },
      appointment: new Proxy({}, { get: () => () => { chamadas.push('appointment.QUALQUER'); } }),
      appointmentItem: new Proxy({}, { get: () => () => { chamadas.push('appointmentItem.QUALQUER'); } }),
    };
    const svc = new ExamesService(prisma, {} as any, {} as any);
    const r = await svc.excluir('card1', { definitivo: true, papel: 'ADMIN' });

    expect(r.ok).toBe(true);
    expect(chamadas).toEqual(['listaItem.findUnique', 'listaItem.delete']);
  });

  it('card inexistente ou de outra lista não apaga nada', async () => {
    const chamadas: string[] = [];
    const prisma: any = {
      listaItem: {
        findUnique: async () => ({ id: 'x', lista: 'petboletim_pet1' }),   // é boletim, não exame
        update: async () => { chamadas.push('listaItem.update'); return {}; },
        delete: async () => { chamadas.push('listaItem.delete'); return {}; },
      },
    };
    const svc = new ExamesService(prisma, {} as any, {} as any);
    const r = await svc.excluir('x');

    expect(r.ok).toBe(false);
    expect(chamadas).toEqual([]);
  });
});
