import { projetarFluxo, compensacaoCartao, somarDias, MovimentoPrevisto } from './fluxo-caixa.regras';

// BLINDAGEM do fluxo de caixa. A pergunta que ele responde e "em que dia eu fico sem
// dinheiro na conta" — se a projecao errar, a Cintia toma decisao de pagamento com
// numero errado. Estes testes existem pra isso nao mudar sem alguem perceber.
describe('fluxo-caixa.regras', () => {
  const HOJE = '2026-09-04';

  describe('compensacaoCartao', () => {
    it('cartao cai em D+1 (a clinica tem antecipacao contratada)', () => {
      expect(compensacaoCartao('2026-09-04')).toBe('2026-09-05');
    });
    it('PARCELADO tambem cai todo em D+1 — decisao da Cintia em 04/09/2026', () => {
      // Se um dia o contrato com a operadora mudar pra "uma parcela por mes",
      // este teste falha e obriga a revisar o nucleo em vez de deixar passar.
      expect(compensacaoCartao('2026-09-30')).toBe('2026-10-01');
    });
    it('vira o mes e o ano corretamente', () => {
      expect(compensacaoCartao('2026-12-31')).toBe('2027-01-01');
      expect(compensacaoCartao(new Date('2026-02-28T15:00:00Z'))).toBe('2026-03-01');
    });
  });

  describe('somarDias', () => {
    it('nao escorrega por fuso horario', () => {
      expect(somarDias('2026-09-04', 30)).toBe('2026-10-04');
      expect(somarDias('2026-09-04', 0)).toBe('2026-09-04');
    });
  });

  describe('projetarFluxo', () => {
    it('devolve exatamente a quantidade de dias pedida, comecando em hoje', () => {
      const f = projetarFluxo(100000, [], HOJE, 30);
      expect(f.dias).toHaveLength(30);
      expect(f.dias[0].data).toBe('2026-09-04');
      expect(f.dias[29].data).toBe('2026-10-03');
    });

    it('sem movimento nenhum, o saldo fica parado', () => {
      const f = projetarFluxo(481230, [], HOJE, 5);
      expect(f.dias.every((d) => d.saldoCentavos === 481230)).toBe(true);
      expect(f.primeiroDiaNegativo).toBeNull();
    });

    it('soma entradas e subtrai saidas, acumulando dia a dia', () => {
      const mv: MovimentoPrevisto[] = [
        { data: '2026-09-04', valorCentavos: 20000, tipo: 'ENTRADA' },
        { data: '2026-09-05', valorCentavos: 5000, tipo: 'SAIDA' },
      ];
      const f = projetarFluxo(10000, mv, HOJE, 3);
      expect(f.dias[0].saldoCentavos).toBe(30000);
      expect(f.dias[1].saldoCentavos).toBe(25000);
      expect(f.dias[2].saldoCentavos).toBe(25000);
      expect(f.totalEntradasCentavos).toBe(20000);
      expect(f.totalSaidasCentavos).toBe(5000);
    });

    it('APONTA O DIA EM QUE O DINHEIRO ACABA — o motivo da tela existir', () => {
      const mv: MovimentoPrevisto[] = [
        { data: '2026-09-05', valorCentavos: 640000, tipo: 'SAIDA', descricao: 'Salarios' },
        { data: '2026-09-06', valorCentavos: 334000, tipo: 'SAIDA', descricao: 'Aluguel' },
        { data: '2026-09-08', valorCentavos: 648000, tipo: 'ENTRADA', descricao: 'Maquininha' },
      ];
      const f = projetarFluxo(481230, mv, HOJE, 10);
      // Saldo 4.812 nao cobre o salario de 6.400: ja fica negativo no dia 05.
      expect(f.primeiroDiaNegativo).toBe('2026-09-05');
      // Mas o FUNDO do poco e no dia 06, depois do aluguel — e o numero que a tela destaca.
      expect(f.menorSaldo?.data).toBe('2026-09-06');
      expect(f.menorSaldo?.valorCentavos).toBe(481230 - 640000 - 334000);
      // e volta pro azul quando a maquininha cai
      expect(f.dias.find((d) => d.data === '2026-09-08')!.saldoCentavos).toBeGreaterThan(0);
    });

    it('junta varios movimentos do mesmo dia numa linha so', () => {
      const mv: MovimentoPrevisto[] = [
        { data: '2026-09-04', valorCentavos: 10000, tipo: 'ENTRADA', descricao: 'Vendas' },
        { data: '2026-09-04', valorCentavos: 7000, tipo: 'ENTRADA', descricao: 'Maquininha' },
        { data: '2026-09-04', valorCentavos: 3000, tipo: 'SAIDA', descricao: 'Agua' },
      ];
      const f = projetarFluxo(0, mv, HOJE, 1);
      expect(f.dias[0].entradaCentavos).toBe(17000);
      expect(f.dias[0].saidaCentavos).toBe(3000);
      expect(f.dias[0].saldoCentavos).toBe(14000);
      expect(f.dias[0].descricoes).toEqual(['Vendas', 'Maquininha', 'Agua']);
    });

    it('ignora o que esta fora da janela (antes e depois)', () => {
      const mv: MovimentoPrevisto[] = [
        { data: '2026-09-01', valorCentavos: 999999, tipo: 'ENTRADA' },
        { data: '2026-12-01', valorCentavos: 999999, tipo: 'ENTRADA' },
      ];
      const f = projetarFluxo(5000, mv, HOJE, 30);
      expect(f.totalEntradasCentavos).toBe(0);
      expect(f.dias[29].saldoCentavos).toBe(5000);
    });

    it('ignora valor zero, negativo ou movimento sem data', () => {
      const mv: any[] = [
        { data: '2026-09-04', valorCentavos: 0, tipo: 'ENTRADA' },
        { data: '2026-09-04', valorCentavos: -500, tipo: 'SAIDA' },
        { data: null, valorCentavos: 900, tipo: 'ENTRADA' },
      ];
      const f = projetarFluxo(1000, mv, HOJE, 2);
      expect(f.dias[0].saldoCentavos).toBe(1000);
    });

    it('aceita data com hora (vem assim do banco) sem escorregar de dia', () => {
      const mv: any[] = [{ data: '2026-09-06T23:30:00.000Z', valorCentavos: 5000, tipo: 'ENTRADA' }];
      const f = projetarFluxo(0, mv, HOJE, 5);
      expect(f.dias.find((d) => d.data === '2026-09-06')!.entradaCentavos).toBe(5000);
    });
  });
});
