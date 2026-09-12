import { atrasoDoExame, levouEm, PRAZO_PADRAO_DIAS, FASES_PADRAO } from './exames.regras';

// O EXAME QUE O LABORATÓRIO NÃO DEVOLVEU (Cintia, 12/09/2026).
//
// O lembrete diário passou a cobrir só a primeira coluna, a pedido dela. Em "Retirado" a bola
// está com o laboratório — mas se o laudo não volta, ninguém percebe, e o cliente pagou e espera
// em silêncio. Este aviso tapa esse buraco: aparece UMA vez, quando vira atraso, e não insiste.

const FASES = FASES_PADRAO;
const dia = (n: number) => new Date(Date.UTC(2026, 8, n, 12, 0, 0)).toISOString();

const exame = (extra: any = {}) => ({
  nome: 'HEMOGRAMA', status: 'Retirado', date: dia(1),
  historico: { Retirado: { at: dia(1) } }, prazoDias: 2, ...extra,
});

describe('atraso do laboratório', () => {
  it('dentro do prazo não é atraso', () => {
    expect(atrasoDoExame(exame(), FASES, dia(3)).atrasado).toBe(false);
  });

  it('passou do prazo, é atraso, e diz quantos dias', () => {
    const r = atrasoDoExame(exame(), FASES, dia(5));
    expect(r.atrasado).toBe(true);
    expect(r.dias).toBe(2);          // levou dia 1, prazo 2 → vencia dia 3
  });

  it('o relógio começa quando o LABORATÓRIO LEVOU, não na venda', () => {
    // Exame vendido sexta e coletado segunda não está atrasado na segunda.
    const vendidoAntes = exame({ date: dia(1), historico: { Retirado: { at: dia(4) } } });
    expect(atrasoDoExame(vendidoAntes, FASES, dia(5)).atrasado).toBe(false);
    expect(levouEm(vendidoAntes, FASES)).toBe(dia(4));
  });

  it('sem histórico da coluna, cai na data do card', () => {
    const semHist = exame({ historico: null });
    expect(levouEm(semHist, FASES)).toBe(dia(1));
  });

  it('depois que o laudo chega, não há atraso de laboratório', () => {
    // A bola passou para o cliente; essa espera é outro assunto.
    expect(atrasoDoExame(exame({ status: 'Resultado' }), FASES, dia(30)).atrasado).toBe(false);
  });

  it('exame ainda em Solicitar não conta — o laboratório nem levou', () => {
    expect(atrasoDoExame(exame({ status: 'Solicitar' }), FASES, dia(30)).atrasado).toBe(false);
  });

  it('exame entregue nunca está atrasado', () => {
    expect(atrasoDoExame(exame({ status: 'Entregue' }), FASES, dia(30)).atrasado).toBe(false);
    expect(atrasoDoExame(exame({ entregueAt: dia(2) }), FASES, dia(30)).atrasado).toBe(false);
  });

  it('sem prazo cadastrado, usa o padrão e AVISA que é palpite', () => {
    // Dizer "atrasado" com uma certeza que não se tem ensina a equipe a ignorar o aviso.
    const r = atrasoDoExame(exame({ prazoDias: null }), FASES, dia(1 + PRAZO_PADRAO_DIAS + 2));
    expect(r.estimado).toBe(true);
    expect(r.prazoDias).toBe(PRAZO_PADRAO_DIAS);
    expect(r.atrasado).toBe(true);
  });

  it('prazo cadastrado manda, e não é palpite', () => {
    const r = atrasoDoExame(exame({ prazoDias: 10 }), FASES, dia(5));
    expect(r.estimado).toBe(false);
    expect(r.prazoDias).toBe(10);
    expect(r.atrasado).toBe(false);
  });

  it('"Aguardando" (nome antigo) é lido como Retirado e conta atraso', () => {
    const antigo = exame({ status: 'Aguardando', historico: { Aguardando: { at: dia(1) } } });
    expect(atrasoDoExame(antigo, FASES, dia(5)).atrasado).toBe(true);
  });

  it('data podre ou exame vazio não viram atraso', () => {
    expect(atrasoDoExame(exame({ date: 'nao e data', historico: null }), FASES, dia(30)).atrasado).toBe(false);
    expect(atrasoDoExame(null as any, FASES, dia(30)).atrasado).toBe(false);
    expect(atrasoDoExame(exame(), [], dia(30)).atrasado).toBe(false);
  });
});
