import {
  diaDe, itensDoDia, diaDaDiaria, diariasComecadas, diariaDoDia,
  montarFechamento, diasEmAberto, podeEditarItem, totalDoItem,
} from './fechamento.regras';

// BLINDAGEM DO FECHAMENTO DIÁRIO.
//
// Aqui mora a cobrança da internação, e o erro que este núcleo existe para impedir já
// aconteceu de verdade: "Comanda do dia" descontava o que já fora faturado, "Enviar pro
// Caixa" somava tudo de novo. Quem usasse os dois na mesma internação cobrava o cliente
// duas vezes — sem erro, sem aviso, e só descobrindo ao conferir item por item.
//
// As decisões da Cintia (05-06/09/2026) travadas aqui:
//   cobrar só o que falta · fecha por dia · a diária entra no dia em que o período começou
//   · aplicação entra na hora · comanda fechada só o administrativo edita.

const item = (o: any) => ({ quantidade: 1, valorUnitario: 100, categoria: 'Procedimento', ...o });

// A Kate entrou 29/08/2026 às 14:48 (horário de Fortaleza).
const ENTRADA = '2026-08-29T14:48:00-03:00';

describe('fechamento diário da internação', () => {
  describe('o dia é o de Fortaleza, não o de Greenwich', () => {
    it('22h de Fortaleza ainda é o mesmo dia, e não o seguinte', () => {
      expect(diaDe('2026-09-05T22:30:00-03:00')).toBe('2026-09-05');
    });
    it('01h da manhã é o dia novo', () => {
      expect(diaDe('2026-09-06T01:00:00-03:00')).toBe('2026-09-06');
    });
    it('data inválida ou vazia não vira dia nenhum', () => {
      expect(diaDe(null)).toBeNull();
      expect(diaDe('banana')).toBeNull();
      expect(diaDe('')).toBeNull();
    });
  });

  describe('o que entra no fechamento de um dia', () => {
    const itens = [
      item({ id: 'a', descricao: 'Ondansetrona', at: '2026-09-05T08:27:00-03:00', valorUnitario: 37.57 }),
      item({ id: 'b', descricao: 'Oxigênio', at: '2026-09-05T16:00:00-03:00', valorUnitario: 115 }),
      item({ id: 'c', descricao: 'Urinálise', at: '2026-09-04T10:00:00-03:00', valorUnitario: 40 }),
      item({ id: 'd', descricao: 'Gaze', at: '2026-09-05T09:00:00-03:00', categoria: 'Insumo', valorUnitario: 0 }),
      item({ id: 'e', descricao: 'Consulta', at: '2026-09-05T11:00:00-03:00', valorUnitario: 170, baixado: true }),
    ];

    it('pega só os do dia pedido', () => {
      expect(itensDoDia(itens, '2026-09-05').map((i) => i.id)).toEqual(['a', 'b']);
    });
    it('item JÁ COBRADO não volta — é a trava da cobrança em dobro', () => {
      expect(itensDoDia(itens, '2026-09-05').some((i) => i.id === 'e')).toBe(false);
    });
    it('insumo fica de fora: baixa estoque, não vira dinheiro', () => {
      expect(itensDoDia(itens, '2026-09-05').some((i) => i.id === 'd')).toBe(false);
    });
    it('item SEM DATA entra — é lançamento antigo, e deixá-lo de fora seria nunca cobrá-lo', () => {
      const semData = [item({ id: 'z', at: null, valorUnitario: 50 })];
      expect(itensDoDia(semData, '2026-09-05').map((i) => i.id)).toEqual(['z']);
    });
  });

  describe('a diária entra no dia em que o período COMEÇOU', () => {
    it('entrada 29/08 14:48 → a 1ª diária é do dia 29, não do 30', () => {
      expect(diaDaDiaria(ENTRADA, 0)).toBe('2026-08-29');
    });
    it.each([[0, '2026-08-29'], [1, '2026-08-30'], [2, '2026-08-31'], [7, '2026-09-05']])(
      'a %sª diária cai em %s', (i, dia) => expect(diaDaDiaria(ENTRADA, i as number)).toBe(dia));

    it('8 diárias começadas de 29/08 14:48 até 05/09 21:00', () => {
      expect(diariasComecadas(ENTRADA, '2026-09-05T21:00:00-03:00')).toBe(8);
    });
    it('25 horas internado = 2 diárias, a regra que a Cintia confirmou', () => {
      expect(diariasComecadas(ENTRADA, '2026-08-30T15:48:00-03:00')).toBe(2);
    });

    it('diária já faturada não é devida de novo', () => {
      expect(diariaDoDia(ENTRADA, '2026-08-29', 0).devida).toBe(true);
      expect(diariaDoDia(ENTRADA, '2026-08-29', 1).devida).toBe(false);
      expect(diariaDoDia(ENTRADA, '2026-08-30', 1).devida).toBe(true);
    });
  });

  describe('montando a comanda do dia', () => {
    const itens = [
      item({ id: 'a', at: '2026-09-05T08:27:00-03:00', valorUnitario: 37.57 }),
      item({ id: 'b', at: '2026-09-05T16:00:00-03:00', valorUnitario: 115 }),
    ];
    it('soma os itens do dia mais a diária', () => {
      const f = montarFechamento({ itens, dia: '2026-09-05', entrada: ENTRADA, diariaValor: 150, diariasFaturadas: 7 });
      expect(f.itens).toHaveLength(2);
      expect(f.diaria).toMatchObject({ valor: 150, indice: 7 });
      expect(f.total).toBeCloseTo(302.57, 2);
    });

    // O ERRO QUE ESTE NÚCLEO EXISTE PRA IMPEDIR.
    it('com as diárias JÁ LANÇADAS como itens, a diária NÃO entra de novo', () => {
      const comDiariaItem = [...itens, item({ id: 'd', descricao: 'Diária de internação — 05/09', categoria: 'Diária', at: '2026-09-05T14:48:00-03:00', valorUnitario: 150 })];
      const f = montarFechamento({ itens: comDiariaItem, dia: '2026-09-05', entrada: ENTRADA, diariaValor: 150, diariasFaturadas: 7, diariasGeradas: true });
      expect(f.diaria).toBeNull();
      expect(f.total).toBeCloseTo(302.57, 2); // e não 452,57
    });

    it('dia sem nada a cobrar sai vazio — não vira comanda de R$ 0,00', () => {
      const f = montarFechamento({ itens: [], dia: '2026-09-03', entrada: ENTRADA, diariaValor: 0 });
      expect(f.vazio).toBe(true);
      expect(f.total).toBe(0);
    });

    it('diária sem valor não entra: a conta não fecha com R$ 0,00 fingindo cobrança', () => {
      const f = montarFechamento({ itens: [], dia: '2026-08-29', entrada: ENTRADA, diariaValor: 0 });
      expect(f.diaria).toBeNull();
    });
  });

  describe('os dias que ainda estão em aberto', () => {
    it('lista do mais antigo pro mais novo, sem os já cobrados', () => {
      const itens = [
        item({ at: '2026-09-04T10:00:00-03:00', valorUnitario: 40 }),
        item({ at: '2026-09-05T08:00:00-03:00', valorUnitario: 37.57 }),
        item({ at: '2026-09-03T10:00:00-03:00', valorUnitario: 90, baixado: true }),
      ];
      const dias = diasEmAberto({ itens, ate: '2026-09-05T21:00:00-03:00' });
      expect(dias.map((d) => d.dia)).toEqual(['2026-09-04', '2026-09-05']);
    });

    it('inclui os dias das diárias ainda não faturadas', () => {
      const dias = diasEmAberto({ itens: [], entrada: ENTRADA, ate: '2026-09-01T15:00:00-03:00', diariaValor: 150, diariasFaturadas: 1 });
      expect(dias.map((d) => d.dia)).toEqual(['2026-08-30', '2026-08-31', '2026-09-01']);
    });

    // A BORDA QUE O PROPRIO TESTE ME ENSINOU: a diaria do dia so existe depois que o
    // periodo dela COMECA. A Kate entrou 14:48 — as 10h de 01/09 ainda corre a diaria que
    // comecou 31/08 14:48, e a de 01/09 so nasce as 14:48. Fechar o dia de manha nao pode
    // cobrar uma diaria que ainda nao comecou.
    it('a diária do dia só entra depois da hora da entrada', () => {
      const antes = diasEmAberto({ itens: [], entrada: ENTRADA, ate: '2026-09-01T10:00:00-03:00', diariaValor: 150, diariasFaturadas: 1 });
      expect(antes.map((d) => d.dia)).toEqual(['2026-08-30', '2026-08-31']);
      const depois = diasEmAberto({ itens: [], entrada: ENTRADA, ate: '2026-09-01T14:49:00-03:00', diariaValor: 150, diariasFaturadas: 1 });
      expect(depois.map((d) => d.dia)).toContain('2026-09-01');
    });

    it('não devolve dia no futuro — a diária de amanhã ainda não começou', () => {
      const dias = diasEmAberto({ itens: [], entrada: ENTRADA, ate: '2026-08-30T10:00:00-03:00', diariaValor: 150 });
      expect(dias.every((d) => d.dia <= '2026-08-30')).toBe(true);
    });

    it('internação sem nada lançado não gera fechamento nenhum', () => {
      expect(diasEmAberto({ itens: [], ate: '2026-09-05T21:00:00-03:00' })).toEqual([]);
    });
  });

  describe('quem pode mexer numa comanda já fechada', () => {
    it('item de dia AINDA ABERTO qualquer um edita — é o plantão trabalhando', () => {
      expect(podeEditarItem(item({ baixado: false }), 'RECEPTIONIST')).toBe(true);
      expect(podeEditarItem(item({ baixado: false }), 'VET')).toBe(true);
    });
    it('item JÁ COBRADO só o administrativo edita', () => {
      const cobrado = item({ baixado: true });
      expect(podeEditarItem(cobrado, 'RECEPTIONIST')).toBe(false);
      expect(podeEditarItem(cobrado, 'VET')).toBe(false);
      expect(podeEditarItem(cobrado, 'ADMIN')).toBe(true);
      expect(podeEditarItem(cobrado, 'admin')).toBe(true);
      expect(podeEditarItem(cobrado, undefined)).toBe(false);
    });
  });

  describe('o total de uma linha', () => {
    it.each([
      [{ quantidade: 2, valorUnitario: 30 }, 60],
      [{ quantidade: 1, valorUnitario: 37.57 }, 37.57],
      [{ quantidade: 0, valorUnitario: 100 }, 0],
      [{ quantidade: -1, valorUnitario: 100 }, 0],
      [{}, 0],
    ])('%o = %s', (i, t) => expect(totalDoItem(i as any)).toBeCloseTo(t, 2));
  });
});
