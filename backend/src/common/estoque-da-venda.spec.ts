import { readFileSync } from 'fs';
import { join } from 'path';
import { devolverEstoqueDaVenda, ORIGEM_ESTORNO } from './estoque-da-venda';

// Cintia, 17/09/2026: "As vacinas têm estoque, então o item deve voltar ao estoque." Apagar venda
// paga, estornar recebimento e reabrir venda passam a devolver o que a venda baixou.
function banco(saidas: any[], estornos: any[] = [], saldo = 10) {
  const criados: any[] = [];
  let estoque = saldo;
  const db: any = {
    appointmentItem: { findMany: async () => [{ id: 'linha-raiva' }] },
    catEstoqueMovimento: {
      findMany: async ({ where }: any) => (where.origem === 'VENDA' ? saidas.filter((s) => where.refId.in.includes(s.refId)) : estornos.filter((e) => where.refId.in.includes(e.refId))),
      create: async ({ data }: any) => { criados.push(data); },
    },
    itemCatalogo: {
      findUnique: async () => ({ estoqueAtual: estoque }),
      update: async ({ data }: any) => { estoque = data.estoqueAtual; },
    },
  };
  return { db, criados, saldo: () => estoque };
}

describe('devolver ao estoque o que a venda baixou', () => {
  it('a vacina antirrábica vendida volta: ENTRADA com a mesma quantidade', async () => {
    const { db, criados, saldo } = banco([{ id: 'mov-1', itemId: 'cat-raiva', quantidade: 1, refId: 'venda-1' }], [], 9);
    expect(await devolverEstoqueDaVenda(db, 'venda-1')).toBe(1);
    expect(criados[0]).toMatchObject({ itemId: 'cat-raiva', tipo: 'ENTRADA', quantidade: 1, saldoAntes: 9, saldoDepois: 10, origem: ORIGEM_ESTORNO, refId: 'mov-1' });
    expect(saldo()).toBe(10);
  });

  it('pega também a baixa feita pela rotina, que usa o id da linha', async () => {
    const { db, criados } = banco([{ id: 'mov-2', itemId: 'cat-raiva', quantidade: 2, refId: 'linha-raiva' }]);
    expect(await devolverEstoqueDaVenda(db, 'venda-1')).toBe(1);
    expect(criados[0].quantidade).toBe(2);
  });

  it('a mesma saída não volta duas vezes', async () => {
    const { db, criados } = banco([{ id: 'mov-1', itemId: 'cat-raiva', quantidade: 1, refId: 'venda-1' }], [{ refId: 'mov-1' }]);
    expect(await devolverEstoqueDaVenda(db, 'venda-1')).toBe(0);
    expect(criados).toEqual([]);
  });

  it('venda que não baixou nada: nada acontece', async () => {
    const { db } = banco([]);
    expect(await devolverEstoqueDaVenda(db, 'venda-1')).toBe(0);
  });
});

describe('onde o estoque volta', () => {
  const ler = (...p: string[]) => readFileSync(join(__dirname, '..', 'modules', ...p), 'utf8');

  it('apagar venda paga devolve o estoque no mesmo passo', () => {
    expect(ler('appointments', 'appointments.service.ts')).toContain('await devolverEstoqueDaVenda(tx as any, id);');
  });

  it('estornar recebimento (e reabrir venda, que usa o estorno) devolve quando a venda deixa de estar paga', () => {
    expect(ler('caixa', 'caixa.service.ts')).toContain("if (ap.paymentStatus === 'PAID' && !agoraPaga) await devolverEstoqueDaVenda(");
  });

  it('a rotina de estoque não baixa de novo o que a venda já baixou', () => {
    const src = ler('catalogo', 'catalogo.service.ts');
    expect(src).toContain("appointment: { is: { paymentStatus: 'PAID' } }");
    expect(src).toContain('!feitos.has(`${i.appointmentId}|${i.catalogoItemId}`)');
  });
});

describe('venda não se apaga pela agenda, pelo atendimento nem pelo documento', () => {
  const ler = (...p: string[]) => readFileSync(join(__dirname, '..', 'modules', ...p), 'utf8');
  it('o servidor recusa com E_VENDA quando a tela pede naoApagarVenda', () => {
    const src = ler('appointments', 'appointments.service.ts');
    expect(src).toContain('if (naoApagarVenda && venda?.numeroVenda != null)');
    expect(src).toContain('E_VENDA: Este registro é a venda nº');
    expect(ler('appointments', 'appointments.controller.ts')).toContain("@Query('naoApagarVenda')");
  });
});
