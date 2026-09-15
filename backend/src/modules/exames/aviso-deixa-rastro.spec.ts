import { readFileSync } from 'fs';
import { join } from 'path';
import { ExamesService } from './exames.service';

/**
 * TODA MENSAGEM AUTOMÁTICA DEIXA RASTRO NA CONVERSA.
 *
 * Cintia, 15/09/2026: "hoje só quem tem controle sobre essas mensagens sou eu e muitas vezes as
 * pessoas ficam com dúvidas, como no caso dos exames se o cliente realmente foi avisado."
 *
 * A causa: o sistema tem DOIS jeitos de mandar mensagem. `sendTemplateMessage` dispara e pronto;
 * `enviarTemplateRegistrando` dispara E grava na conversa do cliente, marcada como automática.
 * O aviso de exame e os pedidos ao laboratório usavam o primeiro — chegavam no celular e não
 * deixavam rastro nenhum no inbox. Não estavam escondidos: nunca estiveram lá.
 *
 * Um envio que ninguém consegue conferir depois é pior do que um envio que falha: o que falha,
 * alguém refaz.
 */
const src = readFileSync(join(__dirname, 'exames.service.ts'), 'utf8');

describe('aviso automático deixa rastro', () => {
  it('NENHUM envio do módulo usa o disparo cru', () => {
    // Se voltar a aparecer, a mensagem some do inbox de novo — sem erro, sem aviso.
    expect(src).not.toContain('this.whatsapp.sendTemplateMessage(');
  });

  it('o aviso ao cliente e os pedidos ao laboratório registram', () => {
    const chamadas = src.match(/enviarTemplateRegistrando\(/g) || [];
    expect(chamadas.length).toBeGreaterThanOrEqual(3);   // cliente + coleta avulsa + lote
  });

  it('e fecham a conversa sozinhas, para não encher a fila do dia', () => {
    // Cintia, no mesmo pedido: "sem que isso encha o nosso fluxo diário". A conversa só fica
    // aberta se o cliente responder — e aí ela deve ficar aberta mesmo.
    const trecho = src.slice(src.indexOf('enviarTemplateRegistrando('), src.indexOf('enviarTemplateRegistrando(') + 400);
    expect(trecho).toMatch(/true,\s*\n?\s*\);/);
  });

  it('o id da mensagem continua voltando — é por ele que o status de entrega é casado', async () => {
    process.env.EXAMES_AVISO_CLIENTE_ATIVO = '1';
    let gravado: any = null;
    const prisma: any = {
      listaItem: {
        findUnique: async () => ({ id: 'c1', lista: 'petexa_p1', valor: JSON.stringify({ nome: 'Citologia', resultadoUrl: 'u' }) }),
        update: async ({ data }: any) => { gravado = JSON.parse(data.valor); return {}; },
      },
      pet: { findUnique: async () => ({ name: 'Madona', tutor: { id: 't1', name: 'Juliana', contacts: [{ number: '5585999990000', isWhatsApp: true }] } }) },
    };
    const whatsapp = { enviarTemplateRegistrando: async () => ({ success: true, messageId: 'wamid.9' }) };
    const r = await new ExamesService(prisma, whatsapp as any, {} as any).avisarClienteDoResultado('c1');

    expect(r.ok).toBe(true);
    expect(gravado.clienteMessageId).toBe('wamid.9');
    delete process.env.EXAMES_AVISO_CLIENTE_ATIVO;
  });
});

describe('a lista de automáticas do dia', () => {
  const wa = readFileSync(join(__dirname, '..', 'whatsapp', 'whatsapp.service.ts'), 'utf8');
  const fn = wa.slice(wa.indexOf('async automaticasDoDia('), wa.indexOf('async enviarTemplateRegistrando('));

  it('NÃO apaga mensagem nenhuma', () => {
    // Ela pediu que "seja apagado todos os dias à meia-noite". Estas linhas SÃO as mensagens da
    // conversa do cliente: apagá-las deixaria o histórico dele com a resposta e sem a pergunta.
    // O que zera à meia-noite é a JANELA — a lista mostra o dia e amanhã começa vazia.
    expect(fn).not.toMatch(/\.delete\(|\.deleteMany\(/);
  });

  it('usa o dia da CLÍNICA, não o do servidor', () => {
    // O servidor roda em UTC: sem converter, a lista viraria às 21h.
    expect(fn).toContain("timeZone: 'America/Fortaleza'");
  });

  it('mostra só o que o sistema mandou sozinho', () => {
    // Mensagem escrita por uma pessoa, ou pela IA no atendimento, não entra: a aba existe para
    // acompanhar o que ninguém digitou.
    expect(fn).toContain("meta.senderType === 'SYSTEM'");
    expect(fn).toContain('direction: \'OUTBOUND\'');
  });
});
