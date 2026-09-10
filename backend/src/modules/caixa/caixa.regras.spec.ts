import { escolherMeuCaixa, avisoSemMeuCaixa, resolverCaixaDoRecebimento, podeLancarNoCaixa, podeFecharCaixa, meuCaixaJaAberto, podeApagarCaixa } from './caixa.regras';

// BLINDAGEM do caixa por operadora: com duas funcionárias e dois caixas abertos, a venda
// de uma não pode cair na gaveta da outra (era o que acontecia até 03/09/2026).
describe('caixa.regras', () => {
  const ana = 'user-ana';
  const bia = 'user-bia';
  const caixaAna = { id: 'cx-ana', userId: ana, abertura: new Date('2026-09-03T08:00:00Z') };
  const caixaBia = { id: 'cx-bia', userId: bia, abertura: new Date('2026-09-03T11:00:00Z') };

  describe('escolherMeuCaixa', () => {
    it('devolve o caixa da pessoa logada, não o aberto mais recente', () => {
      // O da Bia abriu depois; o critério antigo ("mais recente") devolveria o dela.
      expect(escolherMeuCaixa([caixaAna, caixaBia], ana)?.id).toBe('cx-ana');
    });
    it('devolve null quando só a colega tem caixa aberto', () => {
      expect(escolherMeuCaixa([caixaBia], ana)).toBeNull();
    });
    it('devolve null sem usuário logado (nunca chuta um caixa)', () => {
      expect(escolherMeuCaixa([caixaAna, caixaBia], null)).toBeNull();
    });
    it('devolve null quando não há nenhum caixa aberto', () => {
      expect(escolherMeuCaixa([], ana)).toBeNull();
    });
    it('com dois caixas meus abertos, vale o mais recente', () => {
      const antigo = { id: 'cx-ana-manha', userId: ana, abertura: new Date('2026-09-03T07:00:00Z') };
      expect(escolherMeuCaixa([antigo, caixaAna], ana)?.id).toBe('cx-ana');
    });
    it('aceita abertura como string ISO (vem assim de algumas rotas)', () => {
      const comoTexto = [{ id: 'cx-ana', userId: ana, abertura: '2026-09-03T08:00:00Z' }];
      expect(escolherMeuCaixa(comoTexto, ana)?.id).toBe('cx-ana');
    });
  });

  describe('avisoSemMeuCaixa', () => {
    it('distingue "só a colega abriu" de "ninguém abriu"', () => {
      expect(avisoSemMeuCaixa(1)).toMatch(/de outra pessoa/);
      expect(avisoSemMeuCaixa(0)).toMatch(/Nenhum caixa aberto/);
    });
  });

  describe('meuCaixaJaAberto (nao abrir o segundo por engano)', () => {
    it('acha o caixa que a pessoa ja tem aberto', () => {
      expect(meuCaixaJaAberto([caixaAna, caixaBia], ana)?.id).toBe('cx-ana');
    });
    it('o caixa da colega nao conta como meu', () => {
      expect(meuCaixaJaAberto([caixaBia], ana)).toBeNull();
    });
  });

  describe('resolverCaixaDoRecebimento (a regra que a venda usa de verdade)', () => {
    it('1) usa o caixa da pessoa logada quando ela tem um aberto', () => {
      const r = resolverCaixaDoRecebimento([caixaAna, caixaBia], ana);
      expect(r.caixa?.id).toBe('cx-ana');
      expect(r.erro).toBeUndefined();
    });

    it('2) com UM caixa aberto que nao e o meu, RECUSA — nao lanca na gaveta da colega', () => {
      // Ate 08/09/2026 esta funcao entregava o caixa da colega aqui, "porque nao havia
      // ambiguidade". Duas coisas mudaram: a Cintia decidiu que o caixa e individual, e o
      // servico passou a exigir o dono na hora de gravar. Enquanto os dois discordaram, a
      // venda era criada e o recebimento estourava — ninguem conseguia dar baixa.
      const r = resolverCaixaDoRecebimento([caixaBia], ana);
      expect(r.caixa).toBeNull();
      expect(r.erro).toMatch(/proprio caixa/i);
    });

    it('a regra da funcao e a MESMA que o servico exige na hora de gravar', () => {
      // Esta e a trava que impede o bug de voltar: o que esta funcao entrega tem de passar
      // por podeLancarNoCaixa, sempre. Se um dia alguem reabrir o atalho, cai aqui.
      for (const [abertos, quem] of [
        [[caixaAna, caixaBia], ana],
        [[caixaBia], ana],
        [[caixaAna, caixaBia], 'user-carla'],
        [[caixaBia], null],
        [[], ana],
      ] as const) {
        const r = resolverCaixaDoRecebimento(abertos as any, quem as any);
        if (r.caixa) expect(podeLancarNoCaixa(r.caixa.userId, quem as any)).toBe(true);
      }
    });

    it('3) com DOIS caixas abertos e nenhum meu, recusa (seria cara ou coroa)', () => {
      const r = resolverCaixaDoRecebimento([caixaAna, caixaBia], 'user-carla');
      expect(r.caixa).toBeNull();
      expect(r.erro).toMatch(/mais de um caixa aberto/i);
    });

    it('sem nenhum caixa aberto, recusa pedindo pra abrir', () => {
      const r = resolverCaixaDoRecebimento([], ana);
      expect(r.caixa).toBeNull();
      expect(r.erro).toMatch(/Nenhum caixa aberto/i);
    });

    it('sem usuario logado, recusa — sem saber quem recebeu nao ha caixa certo', () => {
      const r = resolverCaixaDoRecebimento([caixaBia], null);
      expect(r.caixa).toBeNull();
      expect(r.erro).toBeTruthy();
    });
  });
});

// ── O DIA DO CAIXA (06/09/2026) ──────────────────────────────────────────────────
//
// "Quando a Gabriela abre o caixa a Victoria não consegue abrir." Os dados mostraram
// outra coisa: a Victoria abriu TRÊS caixas em 05/09. Ela abria, não via, e abria de novo.
//
// O dia era calculado no fuso do SERVIDOR (UTC). Fortaleza é UTC−3, então "hoje" ia das
// 21h de ontem às 20h59 de hoje — e caixa aberto às 21h30 nascia no dia seguinte, sumindo
// da lista. A clínica atende à noite: acontecia todo dia.
import { faixaDoDia, aberturaRetroativa, podeAbrirCaixa } from './caixa.regras';

describe('o dia do caixa é o de Fortaleza', () => {
  it('o dia começa à meia-noite DAQUI, não em Greenwich', () => {
    const { ini, fim } = faixaDoDia('2026-09-06');
    expect(ini.toISOString()).toBe('2026-09-06T03:00:00.000Z');
    expect(fim.toISOString()).toBe('2026-09-07T02:59:59.999Z');
  });

  // O CASO QUE QUEBROU: 21h30 de Fortaleza é 00h30 UTC do dia seguinte.
  it('caixa aberto às 21h30 continua sendo do MESMO dia', () => {
    const { ini, fim } = faixaDoDia('2026-09-06');
    const aberto2130 = new Date('2026-09-06T21:30:00-03:00');
    expect(aberto2130.getTime()).toBeGreaterThanOrEqual(ini.getTime());
    expect(aberto2130.getTime()).toBeLessThanOrEqual(fim.getTime());
  });

  it('23h59 ainda é hoje; 00h01 já é amanhã', () => {
    const hoje = faixaDoDia('2026-09-06');
    expect(new Date('2026-09-06T23:59:00-03:00').getTime()).toBeLessThan(hoje.fim.getTime());
    expect(new Date('2026-09-07T00:01:00-03:00').getTime()).toBeGreaterThan(hoje.fim.getTime());
  });

  it('sem data, vale HOJE em Fortaleza — e não o dia do servidor', () => {
    const esperado = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' });
    expect(faixaDoDia().dia).toBe(esperado);
  });

  it('data inválida cai em hoje, em vez de virar 1970', () => {
    expect(faixaDoDia('banana').dia).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('caixa retroativo abre ao meio-dia DAQUI', () => {
    expect(aberturaRetroativa('2026-09-01')?.toISOString()).toBe('2026-09-01T15:00:00.000Z');
    expect(aberturaRetroativa('')).toBeUndefined();
    expect(aberturaRetroativa(undefined)).toBeUndefined();
  });
});

describe('quem pode abrir caixa', () => {
  // "Só as recepcionistas e adm" — Cintia, 06/09/2026. Veterinário atende; caixa é da
  // recepção. Quem abre responde pelo dinheiro da gaveta.
  it.each(['ADMIN', 'RECEPTIONIST', 'admin', 'receptionist'])('%s pode', (p) =>
    expect(podeAbrirCaixa(p)).toBe(true));
  it.each(['VETERINARIAN', 'GROOMER', '', null, undefined, 'qualquer'])('%s não pode', (p) =>
    expect(podeAbrirCaixa(p as any)).toBe(false));
});

describe('O caixa e individual', () => {
  it('so o dono lanca no proprio caixa', () => {
    expect(podeLancarNoCaixa('u1', 'u1')).toBe(true);
  });

  it('outra pessoa NAO lanca, nem sendo admin', () => {
    // Lancar na gaveta da colega faz a diferenca aparecer no fechamento da pessoa errada.
    expect(podeLancarNoCaixa('u1', 'u2')).toBe(false);
  });

  it('sem saber de quem e o caixa, nao lanca', () => {
    expect(podeLancarNoCaixa(null, 'u1')).toBe(false);
    expect(podeLancarNoCaixa('u1', null)).toBe(false);
    expect(podeLancarNoCaixa('', '')).toBe(false);
  });

  it('fechar: o dono pode', () => {
    expect(podeFecharCaixa('u1', 'u1', 'RECEPTIONIST')).toBe(true);
  });

  it('fechar: o administrativo tambem pode — senao o caixa de quem faltou trava o dia', () => {
    expect(podeFecharCaixa('u1', 'u2', 'ADMIN')).toBe(true);
  });

  it('fechar: outra recepcionista nao pode', () => {
    expect(podeFecharCaixa('u1', 'u2', 'RECEPTIONIST')).toBe(false);
  });
});

// ── APAGAR CAIXA (Cintia, 09/09/2026: "pode ter um botão para deletar o caixa somente para o
// adm") ────────────────────────────────────────────────────────────────────────────────────
describe('podeApagarCaixa', () => {
  it('so o administrativo', () => {
    expect(podeApagarCaixa({ papel: 'ADMIN' }).pode).toBe(true);
    for (const p of ['RECEPTIONIST', 'VET', '', null, undefined]) {
      const r = podeApagarCaixa({ papel: p as any });
      expect(r.pode).toBe(false);
      expect(r.motivo).toMatch(/administrativo/i);
    }
  });

  it('caixa COM movimento nao se apaga, nem pelo adm', () => {
    // Isto nao e limpeza, e apagar registro de dinheiro — e ninguem consegue explicar depois
    // por que a conferencia de um dia nao fecha.
    for (const campo of ['recebimentos', 'movimentos', 'creditos'] as const) {
      const r = podeApagarCaixa({ papel: 'ADMIN', [campo]: 2 } as any);
      expect(r.pode).toBe(false);
      expect(r.motivo).toMatch(/nao se apaga/i);
    }
  });

  it('suprimento de abertura tambem conta como movimento', () => {
    // Dinheiro que alguem pos na gaveta. Foi o caso do caixa 16, com R$ 0,01.
    const r = podeApagarCaixa({ papel: 'ADMIN', suprimento: 0.01 });
    expect(r.pode).toBe(false);
    expect(r.motivo).toMatch(/suprimento/i);
  });

  it('o motivo DIZ o que tem dentro — nao um "nao pode" seco', () => {
    const r = podeApagarCaixa({ papel: 'ADMIN', recebimentos: 3, movimentos: 1 });
    expect(r.motivo).toContain('3 recebimento(s)');
    expect(r.motivo).toContain('1 movimenta');
  });

  it('caixa vazio, pelo adm, pode', () => {
    expect(podeApagarCaixa({ papel: 'ADMIN', recebimentos: 0, movimentos: 0, creditos: 0, suprimento: 0 }).pode).toBe(true);
  });
});
