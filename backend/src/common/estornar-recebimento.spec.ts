import { readFileSync } from 'fs';
import { join } from 'path';
import { estornarRecebimento, limparReceitaDaVenda } from './estornar-recebimento';

// O caso real: a #1177 da Cueia (16/09/2026) foi apagada com R$ 468,35 recebidos no caixa nº 11.
// O banco soltou a ligação (SET NULL) e o recebimento ficou no caixa sem venda. Cintia, ao decidir
// como deve ser: "ele sai do caixa".
function banco() {
  const feito: string[] = [];
  const db = {
    creditoMovimento: { deleteMany: async (a: any) => { feito.push(`credito:${a.where.recebimentoId}`); } },
    recebimento: { delete: async (a: any) => { feito.push(`recebimento:${a.where.id}`); } },
    lancamento: { deleteMany: async (a: any) => { feito.push(`lancamento:${JSON.stringify(a.where.externalId)}`); } },
  };
  return { db, feito };
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
