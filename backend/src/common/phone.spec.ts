import { inserirNonoDigitoBR, normalizePhone, last8, last9 } from './phone';

// BLINDAGEM do numero enviado ao WhatsApp. Em 04/09/2026 duas mensagens falharam com
// "Message undeliverable" (Meta 131026) porque o numero saiu daqui sem o nono digito.
describe('phone', () => {
  describe('inserirNonoDigitoBR', () => {
    it('insere o 9 no numero que quebrou de verdade (558599522127)', () => {
      expect(inserirNonoDigitoBR('558599522127')).toBe('5585999522127');
    });
    it('nao mexe em numero que ja tem 13 digitos', () => {
      expect(inserirNonoDigitoBR('5585986018111')).toBe('5585986018111');
    });
    it('NAO insere o 9 em telefone fixo (comeca com 2, 3, 4 ou 5)', () => {
      // Fixo de Fortaleza: 55 85 3232-1234. Inserir o 9 criaria um numero inexistente.
      expect(inserirNonoDigitoBR('558532321234')).toBe('558532321234');
      expect(inserirNonoDigitoBR('558542321234')).toBe('558542321234');
    });
    it('insere o 9 quando o local comeca com 6, 7, 8 ou 9 (celular antigo)', () => {
      expect(inserirNonoDigitoBR('558588881234')).toBe('5585988881234');
      expect(inserirNonoDigitoBR('558566661234')).toBe('5585966661234');
    });
    it('ignora numero que nao e brasileiro ou tem outro tamanho', () => {
      expect(inserirNonoDigitoBR('12125551234')).toBe('12125551234');
      expect(inserirNonoDigitoBR('85999522127')).toBe('85999522127');
      expect(inserirNonoDigitoBR('')).toBe('');
      expect(inserirNonoDigitoBR(null)).toBe('');
    });
    it('aceita numero com mascara', () => {
      expect(inserirNonoDigitoBR('+55 (85) 9952-2127')).toBe('5585999522127');
    });
  });

  describe('normalizePhone (nucleo ja existente)', () => {
    it('leva qualquer formato para os 13 digitos canonicos', () => {
      expect(normalizePhone('5585986018111')).toBe('5585986018111');
      expect(normalizePhone('85986018111')).toBe('5585986018111');
      expect(normalizePhone('8586018111')).toBe('5585986018111');
    });
  });

  describe('comparacao entre formatos', () => {
    it('last9 e last8 ignoram as diferencas de formato', () => {
      expect(last9('5585986018111')).toBe(last9('85986018111'));
      expect(last8('5585986018111')).toBe('86018111');
    });
  });
});
