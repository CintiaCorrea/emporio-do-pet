import { ehFaseConcluida, ehFaseSolicitacao, exameElegivelLote, precisaLembrarRetirada, textoDoLembrete, atingiuFase, faseDeRetirada } from './exames.regras';

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

describe('Lembrete da retirada', () => {
  it('lembra o exame que chegou na coluna de retirada', () => {
    expect(precisaLembrarRetirada({ status: 'Retirado' }, FASES)).toBe(true);
    expect(precisaLembrarRetirada({ status: 'Resultado' }, FASES)).toBe(true);
  });

  it('NAO lembra o que ainda nao foi retirado', () => {
    expect(precisaLembrarRetirada({ status: 'Solicitar' }, FASES)).toBe(false);
  });

  it('NAO lembra o que ja terminou', () => {
    // Alerta que grita pelo que ja foi entregue e alerta que a equipe aprende a ignorar.
    expect(precisaLembrarRetirada({ status: 'Entregue' }, FASES)).toBe(false);
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
    expect(t.titulo).toBe('2 exames para retirar');
    expect(t.mensagem).toContain('Luna — Hemograma');
  });

  it('lista longa nao vira parede de texto', () => {
    const muitos = Array.from({ length: 9 }, (_, i) => ({ nome: `Exame ${i + 1}`, petNome: `Pet ${i + 1}` }));
    const t = textoDoLembrete(muitos)!;
    expect(t.titulo).toBe('9 exames para retirar');
    expect(t.mensagem).toContain('e mais 5');
  });
});
