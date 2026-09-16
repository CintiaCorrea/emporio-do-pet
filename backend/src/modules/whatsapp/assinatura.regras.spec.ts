import { readFileSync } from 'fs';
import { join } from 'path';
import { comAssinatura, deveAssinar, nomeDaAssinatura, semAssinaturaDaTela } from './assinatura.regras';

/**
 * VETERINÁRIO ASSINA SEMPRE; A RECEPÇÃO NÃO ASSINA.
 *
 * Cintia, 16/09/2026: "A — para os veterinários. A recepção não precisa assinar."
 */
describe('o nome que vai na frente', () => {
  it('título + primeiro nome', () => {
    expect(nomeDaAssinatura('Dra. Vivian Corrêa')).toBe('Dra. Vivian');
    expect(nomeDaAssinatura('Dr. Gabriel Soares')).toBe('Dr. Gabriel');
  });
  it('sem título, só o primeiro nome', () => {
    expect(nomeDaAssinatura('Victoria Sharon')).toBe('Victoria');
  });
});

describe('quem assina', () => {
  it('veterinário no cadastro de profissionais', () => {
    expect(deveAssinar('VETERINARIO')).toBe(true);
  });
  it('recepção, gerência e quem não tem cadastro de profissional: não', () => {
    expect(deveAssinar('RECEPCIONISTA')).toBe(false);
    expect(deveAssinar('GERENTE')).toBe(false);
    expect(deveAssinar(null)).toBe(false);
  });
});

describe('a mensagem como sai', () => {
  it('veterinário: com nome, em negrito', () => {
    expect(comAssinatura('Finalizamos com a Stella.', 'Dra. Victoria Sousa', 'VETERINARIO')).toBe('*Dra. Victoria*:\nFinalizamos com a Stella.');
  });
  it('recepção: como foi digitada', () => {
    expect(comAssinatura('Tenho às 15h, podemos agendar?', 'Maria Gabriela da Cruz Araujo', 'RECEPCIONISTA')).toBe('Tenho às 15h, podemos agendar?');
  });
  it('não assina duas vezes', () => {
    expect(comAssinatura('*Dra. Vivian*:\nBom dia', 'Dra. Vivian Corrêa', 'VETERINARIO')).toBe('*Dra. Vivian*:\nBom dia');
  });
});

describe('a aba antiga que ainda assina pela tela', () => {
  it('tira a assinatura de quem envia, para o servidor decidir', () => {
    expect(semAssinaturaDaTela('*Maria*:\nBom dia D Anna!', 'Maria Gabriela da Cruz Araujo')).toBe('Bom dia D Anna!');
  });
  it('não mexe em negrito que não é o nome de quem envia', () => {
    expect(semAssinaturaDaTela('*Atenção*:\nTraga o exame', 'Maria Gabriela da Cruz Araujo')).toBe('*Atenção*:\nTraga o exame');
  });
});

describe('o envio usa a regra — no servidor, sem botão', () => {
  const ctrl = readFileSync(join(__dirname, 'whatsapp-conversations.controller.ts'), 'utf8');
  it('a mensagem digitada na conversa', () => {
    const i = ctrl.indexOf("@Post('conversations/:id/messages')");
    const corpo = ctrl.slice(i, ctrl.indexOf('return result;', i));
    expect(corpo).toContain('await this.textoAssinado(user, dto.content)');
  });
  it('o envio direto (nova conversa, orçamento rápido)', () => {
    const i = ctrl.indexOf("@Post('send')");
    const corpo = ctrl.slice(i, ctrl.indexOf('return {', i));
    expect(corpo).toContain('await this.textoAssinado(user, texto)');
    // As telas mandam `content`; esta rota lia só `message` e o envio saía vazio.
    expect(corpo).toContain('dto.message ?? dto.content');
  });
});
