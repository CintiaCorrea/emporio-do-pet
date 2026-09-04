import {
  pesoPlausivel,
  pesoSuspeito,
  sugestoesDeCorrecao,
  avisoPesoInvalido,
  PESO_MAX_KG,
} from './peso';

// BLINDAGEM do peso do animal. O caso real: em 04/09/2026 o Snoopy (#7974), poodle de
// 11 anos, estava cadastrado com 8100 kg — 8,1 digitado sem a virgula. O peso e digitado
// em cinco telas e o servidor nao validava nada.
//
// Isso passou a valer dinheiro: diaria de internacao, medicacao e caucao sao cobradas por
// FAIXA DE PESO desde a decisao de 04/09. Com 8100 kg o Snoopy cai na faixa mais cara.
describe('peso', () => {
  describe('o caso do Snoopy', () => {
    it('8100 kg e recusado', () => {
      expect(pesoPlausivel(8100)).toBe(false);
    });
    it('o sistema oferece as leituras possiveis, sem chutar uma so', () => {
      // 8100 pode ser 8,1 kg (digitado em gramas) ou 81 kg (um mastim). Nao da pra saber.
      expect(sugestoesDeCorrecao(8100)).toEqual([8.1, 81]);
    });
    it('a mensagem oferece as duas, com virgula', () => {
      expect(avisoPesoInvalido(8100)).toMatch(/8,1 kg ou 81 kg/);
    });
    it('8,1 kg passa normalmente', () => {
      expect(pesoPlausivel(8.1)).toBe(true);
    });
  });

  describe('pesoPlausivel', () => {
    it.each([0.1, 1, 4.2, 18.4, 45, 90, 110, PESO_MAX_KG])('aceita %s kg', (p) =>
      expect(pesoPlausivel(p)).toBe(true),
    );
    it.each([121, 500, 8100, 100000])('recusa %s kg', (p) => expect(pesoPlausivel(p)).toBe(false));
    it('recusa peso negativo e texto', () => {
      expect(pesoPlausivel(-5)).toBe(false);
      expect(pesoPlausivel('abc' as any)).toBe(false);
    });
    it('aceita vazio — o campo e opcional', () => {
      expect(pesoPlausivel(null)).toBe(true);
      expect(pesoPlausivel(undefined)).toBe(true);
    });
    it('aceita zero — significa "ainda nao pesado"', () => {
      expect(pesoPlausivel(0)).toBe(true);
    });
    it('recusa peso menor que um filhote recem-nascido', () => {
      expect(pesoPlausivel(0.01)).toBe(false);
    });
  });

  describe('sugestoesDeCorrecao', () => {
    it('184 kg: pode ser 1,84 kg (chihuahua filhote) ou 18,4 kg', () => {
      expect(sugestoesDeCorrecao(184)).toEqual([1.84, 18.4]);
    });
    it('nao sugere 0,184 kg — abaixo do piso das sugestoes, seria ruido', () => {
      expect(sugestoesDeCorrecao(184)).not.toContain(0.18);
    });
    it('4200 kg: pode ser 4,2 ou 42 kg', () => {
      expect(sugestoesDeCorrecao(4200)).toEqual([4.2, 42]);
    });
    it('nao sugere nada quando o peso ja e plausivel', () => {
      expect(sugestoesDeCorrecao(18.4)).toEqual([]);
    });
    it('nao sugere nada quando nenhuma divisao ajuda', () => {
      expect(sugestoesDeCorrecao(0.0001)).toEqual([]);
    });
  });

  describe('pesoSuspeito (o relatorio de revisao)', () => {
    it('pega o que passou antes da trava existir', () => {
      expect(pesoSuspeito(8100)).toBe(true);
      expect(pesoSuspeito(150)).toBe(true);
      expect(pesoSuspeito(0.02)).toBe(true);
    });
    it('nao acusa peso normal', () => {
      expect(pesoSuspeito(18.4)).toBe(false);
      expect(pesoSuspeito(90)).toBe(false);
    });
    it('nao acusa vazio nem zero', () => {
      expect(pesoSuspeito(null)).toBe(false);
      expect(pesoSuspeito(0)).toBe(false);
    });
  });
});
