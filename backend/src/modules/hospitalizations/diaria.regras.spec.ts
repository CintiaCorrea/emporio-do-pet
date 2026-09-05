import { diariasDevidas } from './diaria.regras';

// BLINDAGEM DA DIÁRIA DE INTERNAÇÃO.
//
// Duas regras moram aqui, e as duas são dinheiro:
//
//   1. 1 diária a cada 24 HORAS COMEÇADAS desde a entrada. A Cintia confirmou em 04/09:
//      25 horas = 2 diárias, 47 horas = 2. Não é "dias no calendário".
//
//   2. A conta PARA NA ALTA. Até 05/09 ela contava sempre até AGORA — um animal que saiu no
//      dia 1º e cuja ficha fosse aberta no dia 10 aparecia com nove diárias a mais, e quem
//      enviasse pro caixa naquele momento cobrava as nove. A conta crescia sozinha.
//
// E a entrada é a HORA EM QUE O ANIMAL CHEGOU, não a hora em que a ficha foi digitada — antes
// o sistema gravava `new Date()`, então quem chegava às 8h e era cadastrado às 14h tinha a
// diária virando 6 horas atrasada, todo dia da internação.

const h = (n: number) => n * 3600_000;
const base = new Date('2026-09-01T08:00:00-03:00').getTime();

describe('diárias devidas', () => {
  describe('24 horas começadas', () => {
    it.each([
      [1, 1], [12, 1], [23.9, 1], [24, 1],
      [24.1, 2], [25, 2], [47, 2], [48, 2],
      [49, 3], [72, 3], [73, 4],
    ])('%s horas internado = %s diária(s)', (horas, esperado) => {
      expect(diariasDevidas(base, base + h(horas))).toBe(esperado);
    });

    it('25 horas são 2 diárias — o exemplo que a Cintia deu', () => {
      expect(diariasDevidas(base, base + h(25))).toBe(2);
    });

    it('entrou e saiu na mesma hora ainda paga 1 — o box ficou ocupado', () => {
      expect(diariasDevidas(base, base)).toBe(1);
      expect(diariasDevidas(base, base + h(0.25))).toBe(1);
    });
  });

  describe('a conta para na alta', () => {
    it('alta com 50 horas cobra 3, mesmo consultada dez dias depois', () => {
      const alta = base + h(50);
      const dezDiasDepois = base + h(24 * 10);
      expect(diariasDevidas(base, dezDiasDepois, alta)).toBe(3);
    });

    it('sem alta, conta até agora — internação em andamento', () => {
      expect(diariasDevidas(base, base + h(50))).toBe(3);
    });

    it('alta inválida não trava nada: cai no comportamento de internação aberta', () => {
      expect(diariasDevidas(base, base + h(50), NaN)).toBe(3);
    });
  });

  describe('bordas que não podem cobrar errado', () => {
    it('nunca devolve zero — internação sempre tem ao menos 1 diária', () => {
      expect(diariasDevidas(base, base - h(5))).toBe(1);
    });
    it('entrada inválida não vira conta astronômica', () => {
      expect(diariasDevidas(NaN, base + h(50))).toBe(1);
    });
  });

  describe('quantas AINDA faltam faturar', () => {
    it('3 devidas e 1 já faturada deixam 2', () => {
      expect(Math.max(0, diariasDevidas(base, base + h(50)) - 1)).toBe(2);
    });
    it('já faturadas a mais não geram diária negativa', () => {
      expect(Math.max(0, diariasDevidas(base, base + h(25)) - 5)).toBe(0);
    });
  });
});
