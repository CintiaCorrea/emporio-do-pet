import { escolherMeuCaixa, avisoSemMeuCaixa, resolverCaixaDoRecebimento } from './caixa.regras';

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

  describe('resolverCaixaDoRecebimento (a regra que a venda usa de verdade)', () => {
    it('1) usa o caixa da pessoa logada quando ela tem um aberto', () => {
      const r = resolverCaixaDoRecebimento([caixaAna, caixaBia], ana);
      expect(r.caixa?.id).toBe('cx-ana');
      expect(r.deOutraPessoa).toBeFalsy();
    });

    it('2) com UM caixa aberto que nao e o meu, usa esse mesmo (nao ha ambiguidade)', () => {
      // Caso da administradora vendendo sem ter aberto caixa proprio. Bloquear aqui
      // travava o balcao sem proteger nada -- foi o que aconteceu em 04/09/2026.
      const r = resolverCaixaDoRecebimento([caixaBia], ana);
      expect(r.caixa?.id).toBe('cx-bia');
      expect(r.deOutraPessoa).toBe(true);
      expect(r.erro).toBeUndefined();
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

    it('sem usuario logado e com um caixa so, ainda funciona', () => {
      const r = resolverCaixaDoRecebimento([caixaBia], null);
      expect(r.caixa?.id).toBe('cx-bia');
    });
  });
});
