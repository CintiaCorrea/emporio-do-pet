import {
  diaDe, itensDoDia, diaDaDiaria, diariasComecadas, diariaDoDia,
  montarFechamento, diasEmAberto, podeEditarItem, totalDoItem, dentroDaSemanaDeAjuste, AJUSTE_ATE, acaoDaVendaDoDia,
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
    // DEPOIS da semana de ajuste. As datas sao explicitas porque a regra muda com o tempo,
    // e teste que depende de "hoje" comeca a falhar sozinho no dia 13.
    const DEPOIS = '2026-09-15T10:00:00-03:00';
    it('item JÁ COBRADO só o administrativo edita', () => {
      const cobrado = item({ baixado: true });
      expect(podeEditarItem(cobrado, 'RECEPTIONIST', DEPOIS)).toBe(false);
      expect(podeEditarItem(cobrado, 'VET', DEPOIS)).toBe(false);
      expect(podeEditarItem(cobrado, 'ADMIN', DEPOIS)).toBe(true);
      expect(podeEditarItem(cobrado, 'admin', DEPOIS)).toBe(true);
      expect(podeEditarItem(cobrado, undefined, DEPOIS)).toBe(false);
    });

    // A SEMANA DE AJUSTE combinada com a Cintia (06 a 12/09/2026): a equipe esta aprendendo
    // a lancar e as contas antigas estao sendo acertadas. Travar agora faria toda correcao
    // passar por ela.
    describe('semana de ajuste, até 12/09', () => {
      it('dentro da semana, qualquer perfil edita item já cobrado', () => {
        const cobrado = item({ baixado: true });
        expect(podeEditarItem(cobrado, 'RECEPTIONIST', '2026-09-08T10:00:00-03:00')).toBe(true);
        expect(podeEditarItem(cobrado, 'VET', '2026-09-13T23:00:00-03:00')).toBe(true);
      });
      it('no dia 14 a trava volta SOZINHA — sem ninguém precisar lembrar', () => {
        const cobrado = item({ baixado: true });
        expect(podeEditarItem(cobrado, 'RECEPTIONIST', '2026-09-14T00:00:01-03:00')).toBe(false);
      });
      it('a virada é no fim do dia 13, não no começo', () => {
        expect(dentroDaSemanaDeAjuste('2026-09-13T23:59:00-03:00')).toBe(true);
        expect(dentroDaSemanaDeAjuste('2026-09-14T00:00:01-03:00')).toBe(false);
      });
      it('a data está escrita no código, não numa promessa de alguém lembrar', () => {
        expect(AJUSTE_ATE).toBe('2026-09-13T23:59:59-03:00');
      });
      it('item em aberto continua livre pra todo mundo, dentro ou fora da semana', () => {
        expect(podeEditarItem(item({ baixado: false }), 'VET', DEPOIS)).toBe(true);
      });

      // A HORA DE ENTRADA segue a mesma janela (decidido em 06/09). Ela e o relogio das
      // diarias: mudar de 17:19 pra 09:00 pode acrescentar uma diaria inteira na conta.
      it('a mesma janela vale pra corrigir a hora de entrada', () => {
        expect(dentroDaSemanaDeAjuste('2026-09-10T08:00:00-03:00')).toBe(true);
        expect(dentroDaSemanaDeAjuste(DEPOIS)).toBe(false);
      });
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

describe('acaoDaVendaDoDia — a conta do dia em aberto e uma venda em aberto', () => {
  it('primeiro lancamento do dia cria a venda', () => {
    expect(acaoDaVendaDoDia({ temAlgoACobrar: true })).toBe('CRIAR');
  });

  it('lancamento seguinte atualiza a venda que ja existe', () => {
    expect(acaoDaVendaDoDia({ temAlgoACobrar: true, vendaId: 'v1' })).toBe('ATUALIZAR');
  });

  it('apagar o ultimo item apaga a venda vazia', () => {
    // Venda de R$ 0 no caixa e pior que venda nenhuma: a recepcao tenta receber e nao ha o que.
    expect(acaoDaVendaDoDia({ temAlgoACobrar: false, vendaId: 'v1' })).toBe('APAGAR');
  });

  it('dia sem lancamento nenhum nao cria nada', () => {
    expect(acaoDaVendaDoDia({ temAlgoACobrar: false })).toBe('NADA');
  });

  it('dia que JA RECEBEU dinheiro nao e tocado', () => {
    // Sincronizar por cima de um recebimento mudaria o valor de uma conta ja paga.
    expect(acaoDaVendaDoDia({ temAlgoACobrar: true, vendaId: 'v1', vendaRecebeu: true })).toBe('NADA');
    expect(acaoDaVendaDoDia({ temAlgoACobrar: false, vendaId: 'v1', vendaRecebeu: true })).toBe('NADA');
  });

  it('dia fechado nao e tocado', () => {
    expect(acaoDaVendaDoDia({ temAlgoACobrar: true, vendaId: 'v1', diaFechado: true })).toBe('NADA');
  });
});

describe('O dia fechado nunca perde a venda (defeito de 07/09, corrigido em 08/09)', () => {
  it('depois de fechar, a venda do dia NAO e apagada por nao haver mais o que cobrar', () => {
    // Era o defeito: fechar o dia marcava os itens como cobrados; na proxima leitura da ficha a
    // sincronizacao via o dia "vazio" e apagava a venda que o fechamento tinha criado. A conta a
    // receber sumia do caixa, calada.
    expect(acaoDaVendaDoDia({ temAlgoACobrar: false, vendaId: 'v1', diaFechado: true })).toBe('NADA');
  });

  it('dia fechado tambem nao e atualizado quando aparece lancamento novo', () => {
    // Lancamento depois do fechamento e conta do dia SEGUINTE, nao remendo no que ja foi cobrado.
    expect(acaoDaVendaDoDia({ temAlgoACobrar: true, vendaId: 'v1', diaFechado: true })).toBe('NADA');
  });

  it('dia ABERTO que ficou sem item continua sendo apagado', () => {
    // Este e o caso legitimo do APAGAR: apagaram o ultimo item antes de fechar.
    expect(acaoDaVendaDoDia({ temAlgoACobrar: false, vendaId: 'v1', diaFechado: false })).toBe('APAGAR');
  });
});

// ── A DIÁRIA COBRADA DUAS VEZES (Cintia, 09/09/2026) ─────────────────────────────────────
//
// "A diária da internação está sendo cobrada 2 vezes. Por quê?"
//
// Porque havia dois caminhos: `garantirDiariasComoItens` criava a diária como ITEM da conta
// (sozinho, ao abrir a ficha) e `montarFechamento` somava a diária POR FORA. A defesa era a
// bandeira `diariasGeradas` — lida em três lugares, escrita em nenhum, sempre falsa.
//
// Agora quem responde é o dado: se o dia já tem a linha da diária, ela não entra de novo.
describe('a diária entra uma vez só', () => {
  const ENTRADA_ = new Date('2026-09-05T08:00:00-03:00');
  const diariaItem = (dia: string, valor = 150) => ({
    id: `d-${dia}`, descricao: `Diária de internação — ${dia.slice(8)}/${dia.slice(5, 7)}`,
    categoria: 'Diária', quantidade: 1, valorUnitario: valor, at: `${dia}T08:00:00-03:00`, baixado: false,
  });
  const medicacao = (dia: string) => ({
    id: `m-${dia}`, descricao: 'Ondansetrona', categoria: 'Medicação',
    quantidade: 1, valorUnitario: 40, at: `${dia}T10:00:00-03:00`, baixado: false,
  });

  it('com a diária JÁ entre os itens, não soma de novo por fora', () => {
    const f = montarFechamento({
      itens: [diariaItem('2026-09-05'), medicacao('2026-09-05')],
      dia: '2026-09-05', entrada: ENTRADA_, diariaValor: 150,
    });
    expect(f.diaria).toBeNull();
    expect(f.total).toBe(190); // 150 da diária (item) + 40 da medicação — não 340
  });

  it('sem a diária entre os itens, ela entra por fora — quem não tem, cobra', () => {
    const f = montarFechamento({
      itens: [medicacao('2026-09-05')],
      dia: '2026-09-05', entrada: ENTRADA_, diariaValor: 150,
    });
    expect(f.diaria?.valor).toBe(150);
    expect(f.total).toBe(190);
  });

  it('reconhece a diária escrita de qualquer jeito no banco', () => {
    // "Diária", "Diaria", "DIARIA" — as três existem, e todas significam a mesma coisa.
    for (const cat of ['Diária', 'Diaria', 'DIARIA', 'diaria ']) {
      const f = montarFechamento({
        itens: [{ ...diariaItem('2026-09-05'), categoria: cat }],
        dia: '2026-09-05', entrada: ENTRADA_, diariaValor: 150,
      });
      expect(f.diaria).toBeNull();
      expect(f.total).toBe(150);
    }
  });

  it('a diária de OUTRO dia não impede a deste dia', () => {
    // O item do dia 5 não pode calar a cobrança do dia 6 — seria deixar de cobrar.
    const f = montarFechamento({
      itens: [diariaItem('2026-09-05'), medicacao('2026-09-06')],
      dia: '2026-09-06', entrada: ENTRADA_, diariaValor: 150,
    });
    expect(f.diaria?.valor).toBe(150);
    expect(f.total).toBe(190);
  });

  it('a bandeira antiga continua valendo para quem já a passava', () => {
    const f = montarFechamento({
      itens: [medicacao('2026-09-05')],
      dia: '2026-09-05', entrada: ENTRADA_, diariaValor: 150, diariasGeradas: true,
    });
    expect(f.diaria).toBeNull();
  });
});
