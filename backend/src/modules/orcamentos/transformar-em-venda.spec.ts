import { OrcamentosService } from './orcamentos.service';
import { mesDaCasa, somarNoContador, LISTA_CONTADOR } from './contador-de-orcamentos.regras';

// Cintia, 16/09/2026: ao transformar em venda, "o orçamento some" (como no SimplesVet) e fica só
// "um contador simples". Até ali a conversão criava a venda como "CONSULTA", agendada, e sem a
// ligação ao cadastro — as 11 vendas convertidas de agosto e setembro estavam todas sem vínculo.
function montar() {
  const chamadas: any = { venda: null, apagados: [] as string[], lista: [] as any[] };
  const lista: any[] = [];
  const prisma: any = {
    orcamento: {
      findUnique: async () => ({
        id: 'orc-1', petId: 'pet-luna', tutorId: 'tutor-1', appointmentId: null, valorTotal: 255, observacao: 'Retorno em 7 dias',
        itens: [
          { descricao: 'HEMOGRAMA COMPLETO CANINO / FELINO / MAMÍFEROS', catalogoItemId: 'cat-hemo', fornecedorId: 'lab-1', custoUnitario: 32, quantidade: 1, valorUnitario: 80, desconto: 0, valorTotal: 80 },
          { descricao: 'CONSULTA - DRA VIVIAN', catalogoItemId: 'cat-consulta', fornecedorId: null, custoUnitario: null, quantidade: 1, valorUnitario: 175, desconto: 0, valorTotal: 175 },
        ],
      }),
      delete: async ({ where }: any) => { chamadas.apagados.push(where.id); },
    },
    pet: { findUnique: async () => ({ tutorId: 'tutor-1' }) },
    listaItem: {
      findMany: async () => [],
      deleteMany: async () => ({}),
      findFirst: async ({ where }: any) => lista.find((l) => l.lista === where.lista && l.valor === where.valor) || null,
      create: async ({ data }: any) => { lista.push({ id: 'l' + lista.length, ...data }); },
      update: async ({ where, data }: any) => { Object.assign(lista.find((l) => l.id === where.id), data); },
    },
  };
  const appointments: any = { create: async (dto: any) => { chamadas.venda = dto; return { id: 'venda-1' }; } };
  return { svc: new OrcamentosService(prisma, appointments, {} as any), chamadas, lista };
}

describe('transformar orçamento em venda', () => {
  it('a venda nasce "Venda", concluída, com os itens ligados ao cadastro e o laboratório', async () => {
    const { svc, chamadas } = montar();
    await svc.converter('orc-1', {}, 'user-1');
    expect(chamadas.venda.type).toBe('Venda');
    expect(chamadas.venda.status).toBe('COMPLETED');
    expect(chamadas.venda.items[0].catalogoItemId).toBe('cat-hemo');
    expect(chamadas.venda.items[0].fornecedorId).toBe('lab-1');
    expect(chamadas.venda.items[0].custoUnitario).toBe(32);
    expect(chamadas.venda.notes).toBe('Retorno em 7 dias');
  });

  it('o orçamento some e o mês ganha +1 no contador', async () => {
    const { svc, chamadas, lista } = montar();
    await svc.converter('orc-1', {}, 'user-1');
    expect(chamadas.apagados).toEqual(['orc-1']);
    expect(lista).toEqual([expect.objectContaining({ lista: LISTA_CONTADOR, valor: mesDaCasa(), ordem: 1 })]);
  });
});

describe('o contador', () => {
  it('soma no mês da casa', async () => {
    const lista: any[] = [];
    const db: any = {
      listaItem: {
        findFirst: async ({ where }: any) => lista.find((l) => l.valor === where.valor) || null,
        create: async ({ data }: any) => { lista.push({ id: 'x', ...data }); },
        update: async ({ where, data }: any) => { Object.assign(lista.find((l) => l.id === where.id), data); },
      },
    };
    await somarNoContador(db, new Date('2026-09-16T23:00:00Z'));
    await somarNoContador(db, new Date('2026-09-17T01:30:00Z'));   // 22h30 de 16/09 em Fortaleza
    expect(lista).toEqual([expect.objectContaining({ valor: '2026-09', ordem: 2 })]);
  });

  it('meia-noite em Fortaleza ainda é o mês anterior no UTC da virada', () => {
    expect(mesDaCasa(new Date('2026-10-01T02:00:00Z'))).toBe('2026-09');   // 23h de 30/09
  });
});

// A VOLTA (Cintia, 17/09/2026): a venda feita por engano vira orçamento, sem refazer os itens.
describe('a venda vira orçamento', () => {
  const svc = require('fs').readFileSync(require('path').join(__dirname, 'orcamentos.service.ts'), 'utf8');
  it('só quando não há dinheiro recebido', () => {
    expect(svc).toContain('async virarOrcamento');
    expect(svc).toContain('Estorne o recebimento antes de transformá-la em orçamento');
  });
  it('os itens vão inteiros (com a ligação ao cadastro) e a venda sai pelo caminho de sempre', () => {
    const i = svc.indexOf('async virarOrcamento');
    const trecho = svc.slice(i, i + 2600);
    expect(trecho).toContain('catalogoItemId: it.catalogoItemId || undefined');
    expect(trecho).toContain('this.appointmentsService.remove(appointmentId');
  });
});

// A validade padrão do orçamento deixou de ser enfeite (17/09/2026): todo orçamento nascia "sem
// validade" porque ninguém lia a configuração.
describe('a validade padrão do orçamento', () => {
  const svc = require('fs').readFileSync(require('path').join(__dirname, 'orcamentos.service.ts'), 'utf8');
  it('sai da configuração de vendas quando não vem data', () => {
    expect(svc).toContain('private async diasDeValidadePadrao');
    expect(svc).toContain("lista: 'configvendas'");
    expect(svc).toContain('d.setDate(d.getDate() + dias);');
  });
});
