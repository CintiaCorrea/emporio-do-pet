import { ensureNumeroVenda } from './venda-numero';

// Prisma de mentira: só o que ensureNumeroVenda usa.
const falso = (ap: any, max = 1245) => {
  const gravados: any[] = [];
  return {
    gravados,
    appointment: {
      findUnique: async () => ap,
      aggregate: async () => ({ _max: { numeroVenda: max } }),
      updateMany: async (q: any) => { gravados.push(q.data.numeroVenda); ap = { ...ap, numeroVenda: q.data.numeroVenda }; return { count: 1 }; },
    },
  };
};

describe('quem ganha número de venda', () => {
  it('consulta com cobrança ganha o próximo número', async () => {
    const p = falso({ numeroVenda: null, type: 'CONSULTA', notes: null });
    expect(await ensureNumeroVenda(p, 'x')).toBe(1246);
  });

  it('O CASO DA #1174: registro de internação com diária no valor NÃO ganha número', async () => {
    const p = falso({ numeroVenda: null, type: 'Internação', notes: '{"type":"HOSPITALIZATION","dailyRate":150}' });
    expect(await ensureNumeroVenda(p, 'x')).toBeNull();
    expect(p.gravados).toEqual([]);
  });

  it('nem pelas notes, se o nome vier diferente', async () => {
    const p = falso({ numeroVenda: null, type: 'Venda', notes: '{"type":"HOSPITALIZATION"}' });
    expect(await ensureNumeroVenda(p, 'x')).toBeNull();
  });

  it('orçamento não ganha número', async () => {
    const p = falso({ numeroVenda: null, type: 'Orçamento', notes: null });
    expect(await ensureNumeroVenda(p, 'x')).toBeNull();
  });

  it('quem já tem número continua com ele', async () => {
    const p = falso({ numeroVenda: 1130, type: 'Resultado de exames', notes: '' });
    expect(await ensureNumeroVenda(p, 'x')).toBe(1130);
  });
});
