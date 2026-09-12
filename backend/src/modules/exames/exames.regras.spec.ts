import { ehFaseConcluida, ehFaseSolicitacao, exameElegivelLote, precisaLembrarSolicitacao, textoDoLembrete, atingiuFase, faseDeRetirada, faseNormalizada, FASES_PADRAO } from './exames.regras';

// BLINDAGEM: estes testes travam a regra de aviso ao laboratório. A regressão histórica foi o envio
// preso em status.includes("coleta") — uma fase que NÃO existe (as reais são Solicitar/Retirado/…).
// Se alguém reintroduzir esse acoplamento, ou quebrar a elegibilidade, estes testes falham.

describe('exames.regras — aviso ao laboratório', () => {
  const INICIAL = 'Solicitar'; // 1ª fase real configurada

  describe('ehFaseSolicitacao', () => {
    it('aceita a fase inicial real "Solicitar"', () => {
      expect(ehFaseSolicitacao('Solicitar', INICIAL)).toBe(true);
    });
    it('aceita o vocabulário antigo "Solicitado"', () => {
      expect(ehFaseSolicitacao('Solicitado', INICIAL)).toBe(true);
    });
    it('NÃO exige a palavra "coleta" (causa-raiz do bug)', () => {
      // A fase real nunca teve "coleta"; a regra tem que valer sem ela.
      expect(ehFaseSolicitacao('Solicitar', INICIAL)).toBe(true);
      expect(ehFaseSolicitacao('Coleta solicitada', INICIAL)).toBe(false); // fase inexistente no sistema
    });
    it('recusa fases posteriores', () => {
      expect(ehFaseSolicitacao('Retirado', INICIAL)).toBe(false);
      expect(ehFaseSolicitacao('Resultado', INICIAL)).toBe(false);
      expect(ehFaseSolicitacao('Entregue', INICIAL)).toBe(false);
    });
  });

  describe('ehFaseConcluida', () => {
    it('reconhece as fases finais', () => {
      expect(ehFaseConcluida('Entregue')).toBe(true);
      expect(ehFaseConcluida('Resultado entregue ao tutor')).toBe(true);
    });
    it('não marca fases em andamento como concluídas', () => {
      expect(ehFaseConcluida('Solicitar')).toBe(false);
      expect(ehFaseConcluida('Resultado')).toBe(false);
    });
  });

  describe('exameElegivelLote (regra única)', () => {
    const lab = 'forn-veter';
    it('elegível: tem lab + não avisado + fase de solicitação', () => {
      expect(exameElegivelLote({ status: 'Solicitar', fornecedorId: lab, labAvisadoAt: null }, INICIAL)).toBe(true);
    });
    it('NÃO elegível sem laboratório vinculado', () => {
      expect(exameElegivelLote({ status: 'Solicitar', fornecedorId: null, labAvisadoAt: null }, INICIAL)).toBe(false);
    });
    it('NÃO elegível se já avisado (idempotência)', () => {
      expect(exameElegivelLote({ status: 'Solicitar', fornecedorId: lab, labAvisadoAt: '2026-08-11T14:00:00Z' }, INICIAL)).toBe(false);
    });
    it('NÃO elegível fora da fase de solicitação', () => {
      expect(exameElegivelLote({ status: 'Resultado', fornecedorId: lab, labAvisadoAt: null }, INICIAL)).toBe(false);
    });
    it('robusto a item nulo/ilegível', () => {
      expect(exameElegivelLote(null, INICIAL)).toBe(false);
      expect(exameElegivelLote(undefined, INICIAL)).toBe(false);
    });
  });
});

const FASES = ['Solicitar', 'Retirado', 'Aguardando', 'Resultado', 'Entregue'];

describe('A coluna "retirar" e o marco', () => {
  it('acha a coluna de retirada pelo nome, sem depender da palavra exata', () => {
    expect(faseDeRetirada(FASES)).toBe('Retirado');
    expect(faseDeRetirada(['Solicitar', 'Retirar', 'Entregue'])).toBe('Retirar');
    expect(faseDeRetirada(['Solicitar', 'Entregue'])).toBeNull();
  });

  it('a comparacao e POSICIONAL — nome de fase muda, ordem nao', () => {
    expect(atingiuFase('Retirado', 'Retirado', FASES)).toBe(true);
    expect(atingiuFase('Resultado', 'Retirado', FASES)).toBe(true);
    expect(atingiuFase('Solicitar', 'Retirado', FASES)).toBe(false);
  });

  it('fase desconhecida nao dispara nada', () => {
    // Na duvida, o sistema NAO cria conta a pagar sozinho.
    expect(atingiuFase('Fase que nao existe', 'Retirado', FASES)).toBe(false);
    expect(atingiuFase('Retirado', 'Coluna inexistente', FASES)).toBe(false);
  });
});

// AS TRES COLUNAS de 12/09/2026. O teste roda contra elas, e tambem contra as cinco antigas,
// porque os cards gravados continuam com o texto antigo.
const HOJE = FASES_PADRAO;

describe('Lembrete da solicitacao', () => {
  // A REGRA INVERTEU DE PROPOSITO, e o teste registra as duas conversas:
  //   07/09 — "o que interessa lembrar e o exame que esta pronto para ser retirado".
  //   12/09 — "somente para e se tiver exames na coluna solicitado. NAO E PARA REPETIR SE O
  //            EXAME ESTIVER EM OUTRA COLUNA."
  // Nao e ela mudando de ideia: "Retirado" passou a significar, explicitamente, o laboratorio
  // levar o material. Sob esse nome, a unica coluna em que a acao e NOSSA e a primeira.
  it('lembra SO o que esta na primeira coluna, esperando o laboratorio buscar', () => {
    expect(precisaLembrarSolicitacao({ nome: 'Hemograma', status: 'Solicitar' }, HOJE)).toBe(true);
  });

  it('NAO lembra depois que o laboratorio levou — ai e so esperar', () => {
    expect(precisaLembrarSolicitacao({ nome: 'Hemograma', status: 'Retirado' }, HOJE)).toBe(false);
    expect(precisaLembrarSolicitacao({ nome: 'Hemograma', status: 'Resultado' }, HOJE)).toBe(false);
  });

  it('NAO lembra o que ja terminou', () => {
    // Alerta que grita pelo que ja foi entregue e alerta que a equipe aprende a ignorar.
    expect(precisaLembrarSolicitacao({ nome: 'Hemograma', status: 'Entregue' }, HOJE)).toBe(false);
    expect(precisaLembrarSolicitacao({ nome: 'Hemograma', status: 'Solicitar', entregueAt: '2026-09-12' } as any, HOJE)).toBe(false);
  });

  it('NAO lembra exame sem nome — ele nem aparece no quadro', () => {
    // Era esta a diferenca entre o quadro e o lembrete: o quadro escondia, o lembrete contava.
    // E assim que nasce o lembrete fantasma — toca, a pessoa abre o quadro e nao acha nada.
    expect(precisaLembrarSolicitacao({ nome: '', status: 'Solicitar' }, HOJE)).toBe(false);
    expect(precisaLembrarSolicitacao({ nome: '   ', status: 'Solicitar' }, HOJE)).toBe(false);
    expect(precisaLembrarSolicitacao({ status: 'Solicitar' }, HOJE)).toBe(false);
  });

  it('card gravado com nome antigo cai na coluna certa', () => {
    // "Solicitado" e vocabulario antigo da primeira coluna.
    expect(precisaLembrarSolicitacao({ nome: 'X', status: 'Solicitado' }, HOJE)).toBe(true);
    // "Aguardando" era o laboratorio com o material: hoje e Retirado, entao NAO lembra.
    expect(precisaLembrarSolicitacao({ nome: 'X', status: 'Aguardando' }, HOJE)).toBe(false);
  });

  it('sem fases configuradas, nao inventa lembrete', () => {
    expect(precisaLembrarSolicitacao({ nome: 'X', status: 'Solicitar' }, [])).toBe(false);
    expect(precisaLembrarSolicitacao(null as any, HOJE)).toBe(false);
  });
});

describe('Nomes de coluna que sairam', () => {
  it('"Aguardando" e lido como Retirado — o laboratorio esta com o material', () => {
    // Jogar para Resultado diria que o laudo chegou, o que nao e verdade.
    expect(faseNormalizada('Aguardando', HOJE)).toBe('Retirado');
  });

  it('coluna que AINDA existe na configuracao da casa nao e traduzida', () => {
    // Se a casa mantiver "Aguardando" como coluna dela, ela manda.
    expect(faseNormalizada('Aguardando', FASES)).toBe('Aguardando');
  });

  it('nome desconhecido volta como veio, sem chute', () => {
    expect(faseNormalizada('Coluna inventada', HOJE)).toBe('Coluna inventada');
  });
});

describe('Exame concluido', () => {
  it('a MARCA de entrega vale mesmo sem o nome da coluna', () => {
    // Com "Entregue" deixando de ser coluna, quem diz que acabou e a data.
    expect(ehFaseConcluida('Resultado', '2026-09-12T10:00:00Z')).toBe(true);
  });

  it('os 45 cards antigos em "Entregue" continuam sendo lidos como concluidos', () => {
    // Eles nao foram reescritos — sao lidos.
    expect(ehFaseConcluida('Entregue')).toBe(true);
    expect(ehFaseConcluida('Resultado entregue ao tutor')).toBe(true);
  });

  it('sem marca e sem nome final, nao esta concluido', () => {
    expect(ehFaseConcluida('Retirado')).toBe(false);
    expect(ehFaseConcluida('Retirado', null)).toBe(false);
  });

  it('sem exame nenhum, nao manda lembrete', () => {
    expect(textoDoLembrete([])).toBeNull();
    expect(textoDoLembrete(null as any)).toBeNull();
  });

  it('o texto diz o tamanho do trabalho antes de abrir a tela', () => {
    const t = textoDoLembrete([
      { nome: 'Hemograma', petNome: 'Luna' },
      { nome: 'Ultrassom', petNome: 'Chico' },
    ])!;
    expect(t.titulo).toBe('2 exames esperando o laboratório');
    expect(t.mensagem).toContain('Luna — Hemograma');
  });

  it('lista longa nao vira parede de texto', () => {
    const muitos = Array.from({ length: 9 }, (_, i) => ({ nome: `Exame ${i + 1}`, petNome: `Pet ${i + 1}` }));
    const t = textoDoLembrete(muitos)!;
    expect(t.titulo).toBe('9 exames esperando o laboratório');
    expect(t.mensagem).toContain('e mais 5');
  });
});
