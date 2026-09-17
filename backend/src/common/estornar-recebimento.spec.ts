import { readFileSync } from 'fs';
import { join } from 'path';
import { estornarRecebimento, limparReceitaDaVenda, devolverDescontoDoRecebimento } from './estornar-recebimento';

// O caso real: a #1177 da Cueia (16/09/2026) foi apagada com R$ 468,35 recebidos no caixa nº 11.
// O banco soltou a ligação (SET NULL) e o recebimento ficou no caixa sem venda. Cintia, ao decidir
// como deve ser: "ele sai do caixa".
function banco(rec: any = { appointmentId: 'venda-1177', descontoItens: null }, itens: Record<string, any> = {}, venda: any = { value: 0 }) {
  const feito: string[] = [];
  const db = {
    creditoMovimento: { deleteMany: async (a: any) => { feito.push(`credito:${a.where.recebimentoId}`); } },
    recebimento: {
      delete: async (a: any) => { feito.push(`recebimento:${a.where.id}`); },
      findUnique: async () => rec,
    },
    lancamento: { deleteMany: async (a: any) => { feito.push(`lancamento:${JSON.stringify(a.where.externalId)}`); } },
    appointmentItem: {
      findUnique: async ({ where }: any) => itens[where.id] ?? null,
      update: async ({ where, data }: any) => { Object.assign(itens[where.id], data); },
    },
    appointment: {
      findUnique: async () => venda,
      update: async ({ data }: any) => { Object.assign(venda, data); },
    },
  };
  return { db, feito, itens, venda };
}

describe('estornar um recebimento', () => {
  it('devolve o crédito usado, apaga o recebimento e limpa taxa de cartão e baixa de crédito', async () => {
    const { db, feito } = banco();
    await estornarRecebimento(db, 'rec-1177');
    expect(feito).toEqual([
      'credito:rec-1177',
      'recebimento:rec-1177',
      'lancamento:{"startsWith":"taxa:rec-1177:"}',
      'lancamento:"credito-uso:rec-1177"',
    ]);
  });

  it('a receita e o desconto da venda saem do financeiro', async () => {
    const { db, feito } = banco();
    await limparReceitaDaVenda(db, 'venda-1177');
    expect(feito).toEqual(['lancamento:{"startsWith":"venda:venda-1177:"}', 'lancamento:"desconto:venda-1177"']);
  });
});

describe('um estorno só, usado pelas duas portas', () => {
  const ler = (...p: string[]) => readFileSync(join(__dirname, '..', 'modules', ...p), 'utf8');

  it('apagar recebimento no caixa usa o estorno único', () => {
    const src = ler('caixa', 'caixa.service.ts');
    expect(src).toContain('await estornarRecebimento(this.prisma as any, itemId);');
    expect(src).not.toContain('this.prisma.creditoMovimento.deleteMany({ where: { recebimentoId: itemId } })');
  });

  it('apagar venda paga estorna os recebimentos e apaga a venda no mesmo passo', () => {
    const src = ler('appointments', 'appointments.service.ts');
    const i = src.indexOf('  async remove(');
    const corpo = src.slice(i, src.indexOf('\n  async ', i + 10));
    expect(corpo).toContain('for (const rec of recebimentosDaVenda) await estornarRecebimento(tx as any, rec.id);');
    expect(corpo).toContain('return tx.appointment.delete({ where: { id } });');
    // caixa fechado não é mexido por baixo
    expect(corpo).toContain('podeReabrirVenda(true,');
    // o aviso ao administrativo continua vindo antes
    expect(corpo.indexOf('TEM_RECEBIMENTO')).toBeLessThan(corpo.indexOf('estornarRecebimento'));
  });
});

describe('o desconto do recebimento volta para a venda no estorno', () => {
  // Cintia, 17/09/2026 (recomendação aceita): a venda que ganhou 5% porque seria paga no PIX não pode
  // ficar com o desconto se o recebimento for apagado — seria paga depois no cartão com 5% a menos.
  it('cada linha recupera a parte dela e a venda volta ao valor cheio', async () => {
    const itens = {
      consulta: { desconto: 8.5, valorTotal: 161.5 },
      exame: { desconto: 63.15, valorTotal: 1199.85 },
    };
    const venda = { value: 1361.35 };
    const { db } = banco({ appointmentId: 'venda-1229', descontoItens: [{ itemId: 'consulta', valor: 8.5 }, { itemId: 'exame', valor: 63.15 }] }, itens, venda);
    const voltou = await devolverDescontoDoRecebimento(db, 'rec');
    expect(voltou).toBe(71.65);
    expect(itens.consulta).toEqual({ desconto: 0, valorTotal: 170 });
    expect(itens.exame).toEqual({ desconto: 0, valorTotal: 1263 });
    expect(venda.value).toBe(1433);
  });

  it('linha que saiu da venda depois não quebra o estorno', async () => {
    const venda = { value: 100 };
    const { db } = banco({ appointmentId: 'v', descontoItens: [{ itemId: 'sumiu', valor: 5 }] }, {}, venda);
    expect(await devolverDescontoDoRecebimento(db, 'rec')).toBe(0);
    expect(venda.value).toBe(100);
  });

  it('recebimento sem desconto não mexe na venda', async () => {
    const venda = { value: 100 };
    const { db } = banco({ appointmentId: 'v', descontoItens: null }, {}, venda);
    expect(await devolverDescontoDoRecebimento(db, 'rec')).toBe(0);
    expect(venda.value).toBe(100);
  });
});
