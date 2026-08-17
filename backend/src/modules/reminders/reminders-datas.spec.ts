import { ehAniversarioHoje, diasAteDataPura, ddmmDataPura, fortalezaYMD } from './reminders-datas';

// Rede de segurança das DATAS dos lembretes. Se alguém reintroduzir o bug de fuso
// (mensagem 1 dia antes), estes testes QUEBRAM antes de subir.

describe('reminders-datas (fuso Fortaleza vs data pura)', () => {
  // Datas puras são salvas à meia-noite UTC (ex.: nascimento 06/08).
  const nasc06Ago = new Date('2026-08-06T00:00:00.000Z');

  describe('ehAniversarioHoje', () => {
    it('🎂 aniversário de 06/08 cai no PRÓPRIO dia 06 (manhã de Fortaleza)', () => {
      // 06/08 09:00 Fortaleza = 06/08 12:00 UTC
      expect(ehAniversarioHoje(nasc06Ago, new Date('2026-08-06T12:00:00Z'))).toBe(true);
    });

    it('🚫 NÃO cai no dia 05 (o bug antigo mandava 1 dia antes)', () => {
      // 05/08 09:00 Fortaleza = 05/08 12:00 UTC
      expect(ehAniversarioHoje(nasc06Ago, new Date('2026-08-05T12:00:00Z'))).toBe(false);
    });

    it('🌙 vira o dia no horário certo de Fortaleza (00:30 UTC ainda é dia 05)', () => {
      // 06/08 00:30 UTC = 05/08 21:30 Fortaleza → ainda é dia 5
      expect(ehAniversarioHoje(nasc06Ago, new Date('2026-08-06T00:30:00Z'))).toBe(false);
      // 06/08 03:30 UTC = 06/08 00:30 Fortaleza → já é dia 6
      expect(ehAniversarioHoje(nasc06Ago, new Date('2026-08-06T03:30:00Z'))).toBe(true);
    });
  });

  describe('diasAteDataPura (vacina)', () => {
    const agora05 = new Date('2026-08-05T12:00:00Z'); // 05/08 09:00 Fortaleza
    it('vence hoje = 0', () => {
      expect(diasAteDataPura(new Date('2026-08-05T00:00:00Z'), agora05)).toBe(0);
    });
    it('vence amanhã = 1 (não 0 — o bug antigo adiantava 1 dia)', () => {
      expect(diasAteDataPura(new Date('2026-08-06T00:00:00Z'), agora05)).toBe(1);
    });
    it('faltam 15 dias = 15 (marco do lembrete)', () => {
      expect(diasAteDataPura(new Date('2026-08-20T00:00:00Z'), agora05)).toBe(15);
    });
    it('venceu ontem = -1', () => {
      expect(diasAteDataPura(new Date('2026-08-04T00:00:00Z'), agora05)).toBe(-1);
    });
  });

  describe('ddmmDataPura', () => {
    it('06/08 mostra "06/08" (não "05/08")', () => {
      expect(ddmmDataPura(nasc06Ago)).toBe('06/08');
    });
  });

  describe('fortalezaYMD', () => {
    it('01:00 UTC ainda é o dia anterior em Fortaleza', () => {
      expect(fortalezaYMD(new Date('2026-08-06T01:00:00Z')).d).toBe(5);
    });
    it('12:00 UTC é o mesmo dia em Fortaleza', () => {
      expect(fortalezaYMD(new Date('2026-08-06T12:00:00Z')).d).toBe(6);
    });
  });
});
