import { ehFaseConcluida, ehFaseSolicitacao, exameElegivelLote } from './exames.regras';

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
