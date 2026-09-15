import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { podeAvisarCliente, respostaMarcaEntregue } from './exames.regras';
import { ExamesService } from './exames.service';

/**
 * O FIM DO CICLO: avisar o cliente e considerar entregue.
 *
 * Cintia, 12/09/2026: "envia mensagem para o cliente que o exame está pronto e depois que o
 * cliente responder é considerado entregue e sai do quadro". 16/09: "assim que o vet recebe o
 * retorno do cliente o card pode sair da lista, pois aí o resultado já está sendo passado".
 *
 * A ESCOLHA DELA QUE MANDA AQUI (13/09): "só conta se a mensagem saiu".
 *
 * O risco que estes testes existem para conter é o pior de todos neste módulo: marcar como
 * entregue um exame que ninguém entregou. O card sai do quadro, o tutor continua esperando, e
 * não há mais nada na tela lembrando que aquilo ficou em aberto.
 */
const svcCom = (prisma: any, whatsapp: any = {}, notif: any = { create: async () => ({}) }) =>
  new ExamesService(prisma, whatsapp as any, notif as any);

describe('avisar o cliente e considerar entregue', () => {
  describe('quando dá para avisar', () => {
    it('só com laudo anexado — sem laudo não há o que avisar', () => {
      expect(podeAvisarCliente({ resultadoUrl: 'https://x/l.pdf' })).toBe(true);
      expect(podeAvisarCliente({ resultadoUrl: '' })).toBe(false);
      expect(podeAvisarCliente({ resultadoUrl: '   ' })).toBe(false);
      expect(podeAvisarCliente({})).toBe(false);
    });

    it('não insiste com quem já foi avisado', () => {
      expect(podeAvisarCliente({ resultadoUrl: 'u', clienteAvisadoAt: '2026-09-16T10:00:00-03:00' })).toBe(false);
    });

    it('nem com exame entregue ou arquivado', () => {
      expect(podeAvisarCliente({ resultadoUrl: 'u', entregueAt: '2026-09-16' })).toBe(false);
      expect(podeAvisarCliente({ resultadoUrl: 'u', arquivadoEm: '2026-09-16' })).toBe(false);
    });
  });

  describe('"só conta se a mensagem saiu"', () => {
    it('sem aviso registrado, a resposta do cliente NÃO entrega nada', () => {
      // O erro que isto impede: o tutor manda "bom dia" por outro assunto e um exame que nunca
      // foi comunicado some do quadro como entregue.
      expect(respostaMarcaEntregue({ resultadoUrl: 'u' } as any, '2026-09-16T10:00:00-03:00')).toBe(false);
      expect(respostaMarcaEntregue({ clienteAvisadoAt: null }, '2026-09-16T10:00:00-03:00')).toBe(false);
    });

    it('com aviso enviado, a resposta posterior entrega', () => {
      const d = { clienteAvisadoAt: '2026-09-16T10:00:00-03:00' };
      expect(respostaMarcaEntregue(d, '2026-09-16T10:05:00-03:00')).toBe(true);
    });

    it('resposta ANTERIOR ao aviso não entrega', () => {
      // Sem esta comparação, uma conversa que o cliente já tinha puxado antes fecharia o exame
      // no instante em que o aviso saísse — entregue sem ninguém ter lido nada.
      const d = { clienteAvisadoAt: '2026-09-16T10:00:00-03:00' };
      expect(respostaMarcaEntregue(d, '2026-09-16T09:59:00-03:00')).toBe(false);
    });

    it('não reentrega o que já está entregue, nem mexe em arquivado', () => {
      expect(respostaMarcaEntregue({ clienteAvisadoAt: '2026-09-16T10:00:00-03:00', entregueAt: '2026-09-16T11:00:00-03:00' }, '2026-09-17')).toBe(false);
      expect(respostaMarcaEntregue({ clienteAvisadoAt: '2026-09-16T10:00:00-03:00', arquivadoEm: '2026-09-16' }, '2026-09-17')).toBe(false);
    });

    it('datas ilegíveis não entregam nada', () => {
      expect(respostaMarcaEntregue({ clienteAvisadoAt: 'ontem' }, '2026-09-17')).toBe(false);
      expect(respostaMarcaEntregue({ clienteAvisadoAt: '2026-09-16T10:00:00-03:00' }, 'qualquer coisa')).toBe(false);
    });
  });

  describe('o aviso ao cliente, na prática', () => {
    const SEM_FLAG = process.env.EXAMES_AVISO_CLIENTE_ATIVO;
    afterEach(() => { process.env.EXAMES_AVISO_CLIENTE_ATIVO = SEM_FLAG; });

    it('DESLIGADO por padrão — mensagem a cliente não se liga por acidente', async () => {
      delete process.env.EXAMES_AVISO_CLIENTE_ATIVO;
      const enviou: any[] = [];
      const prisma: any = { listaItem: { findUnique: async () => { enviou.push('leu'); return null; } } };
      const r = await svcCom(prisma).avisarClienteDoResultado('c1');
      expect(r.desligado).toBe(true);
      expect(enviou).toEqual([]);   // nem chega a ler o card
    });

    it('ligado: envia e só então grava `clienteAvisadoAt`', async () => {
      process.env.EXAMES_AVISO_CLIENTE_ATIVO = '1';
      let gravado: any = null;
      const prisma: any = {
        listaItem: {
          findUnique: async () => ({ id: 'c1', lista: 'petexa_p1', valor: JSON.stringify({ nome: 'Citologia', resultadoUrl: 'https://x/l.pdf' }) }),
          update: async ({ data }: any) => { gravado = JSON.parse(data.valor); return {}; },
        },
        pet: { findUnique: async () => ({ name: 'Madona', tutor: { id: 't1', name: 'Juliana', contacts: [{ number: '5585999990000', isWhatsApp: true }] } }) },
      };
      const whatsapp = { enviarTemplateRegistrando: async () => ({ success: true, messageId: 'wamid.1' }) };
      const r = await svcCom(prisma, whatsapp).avisarClienteDoResultado('c1');

      expect(r.ok).toBe(true);
      expect(gravado.clienteAvisadoAt).toBeTruthy();
      expect(gravado.clienteMessageId).toBe('wamid.1');
      expect(gravado.tutorId).toBe('t1');
    });

    describe('o template e as variáveis', () => {
      const CARTA = (card: any = { resultadoPor: 'Dra. Vivian', resultadoPorEhVet: true }) => {
        const visto: any = { nome: null, partes: null };
        const prisma: any = {
          listaItem: {
            findUnique: async () => ({ id: 'c1', lista: 'petexa_p1', valor: JSON.stringify({ nome: 'Citologia', resultadoUrl: 'u', ...card }) }),
            update: async () => ({}),
          },
          pet: { findUnique: async () => ({ name: 'Madona', tutor: { id: 't1', name: 'Juliana', contacts: [{ number: '5585999990000', isWhatsApp: true }] } }) },
        };
        const whatsapp = {
          enviarTemplateRegistrando: async (_tel: string, nome: string, partes: any[]) => {
            visto.nome = nome; visto.partes = partes.map((p) => p.text);
            return { success: true, messageId: 'w1' };
          },
        };
        return { visto, prisma, whatsapp };
      };

      it('o padrão é o que PEDE resposta — é a resposta que fecha o exame', async () => {
        // Escolha da Cintia, 16/09/2026. Com o outro template a entrega dependeria de o cliente
        // resolver escrever por conta própria.
        process.env.EXAMES_AVISO_CLIENTE_ATIVO = '1';
        delete process.env.EXAMES_TEMPLATE_CLIENTE;
        const { visto, prisma, whatsapp } = CARTA();
        await svcCom(prisma, whatsapp).avisarClienteDoResultado('c1');
        expect(visto.nome).toBe('resultado_exame_disponivel');
      });

      it('o TUTOR vem primeiro — os dois textos começam com "Olá, {{1}}!"', async () => {
        // Trocar a ordem faria a mensagem cumprimentar o cachorro pelo nome. Foi assim que este
        // envio nasceu (pet, exame) e o teste existe para não voltar a ser.
        process.env.EXAMES_AVISO_CLIENTE_ATIVO = '1';
        delete process.env.EXAMES_TEMPLATE_CLIENTE;
        const { visto, prisma, whatsapp } = CARTA();
        await svcCom(prisma, whatsapp).avisarClienteDoResultado('c1');
        expect(visto.partes.slice(0, 2)).toEqual(['Juliana', 'Madona']);
      });

      it('só VETERINÁRIO vira nome no {{3}}', async () => {
        process.env.EXAMES_AVISO_CLIENTE_ATIVO = '1';
        delete process.env.EXAMES_TEMPLATE_CLIENTE;
        const vet = CARTA({ resultadoPor: 'Dra. Vivian', resultadoPorEhVet: true });
        await svcCom(vet.prisma, vet.whatsapp).avisarClienteDoResultado('c1');
        expect(vet.visto.partes).toEqual(['Juliana', 'Madona', 'Dra. Vivian']);
      });

      it('recepção anexando NÃO vira promessa — o texto diz que essa pessoa vai explicar o exame', async () => {
        process.env.EXAMES_AVISO_CLIENTE_ATIVO = '1';
        delete process.env.EXAMES_TEMPLATE_CLIENTE;
        for (const card of [
          { resultadoPor: 'Victoria', resultadoPorEhVet: false },
          { resultadoPor: 'Victoria' },                            // card antigo, sem o campo
          { resultadoPorEhVet: true },                             // vet sem nome gravado
        ]) {
          const c = CARTA(card);
          await svcCom(c.prisma, c.whatsapp).avisarClienteDoResultado('c1');
          expect(c.visto.partes[2]).toBe('Nossa equipe');
        }
      });

      it('o de duas variáveis continua disponível, e manda só tutor e pet', async () => {
        process.env.EXAMES_AVISO_CLIENTE_ATIVO = '1';
        process.env.EXAMES_TEMPLATE_CLIENTE = 'resultado_exame';
        const { visto, prisma, whatsapp } = CARTA();
        await svcCom(prisma, whatsapp).avisarClienteDoResultado('c1');
        expect(visto.nome).toBe('resultado_exame');
        expect(visto.partes).toEqual(['Juliana', 'Madona']);
        delete process.env.EXAMES_TEMPLATE_CLIENTE;
      });

      it('nome desconhecido na variável de ambiente cai no padrão, não quebra o envio', async () => {
        // Um erro de digitação no Fly não pode virar "nenhum cliente é avisado e ninguém sabe".
        process.env.EXAMES_AVISO_CLIENTE_ATIVO = '1';
        process.env.EXAMES_TEMPLATE_CLIENTE = 'resultado_exames';   // o nome que não existe
        const { visto, prisma, whatsapp } = CARTA();
        await svcCom(prisma, whatsapp).avisarClienteDoResultado('c1');
        expect(visto.nome).toBe('resultado_exame_disponivel');
        delete process.env.EXAMES_TEMPLATE_CLIENTE;
      });
    });

    it('envio que FALHA não grava nada — senão o exame fecharia sem o cliente saber', async () => {
      process.env.EXAMES_AVISO_CLIENTE_ATIVO = '1';
      const toques: string[] = [];
      const prisma: any = {
        listaItem: {
          findUnique: async () => ({ id: 'c1', lista: 'petexa_p1', valor: JSON.stringify({ nome: 'X', resultadoUrl: 'u' }) }),
          update: async () => { toques.push('update'); return {}; },
        },
        pet: { findUnique: async () => ({ name: 'Madona', tutor: { id: 't1', contacts: [{ number: '5585999990000', isWhatsApp: true }] } }) },
      };
      const whatsapp = { enviarTemplateRegistrando: async () => ({ success: false, error: 'template em aprovação' }) };
      const r = await svcCom(prisma, whatsapp).avisarClienteDoResultado('c1');

      expect(r.ok).toBe(false);
      expect(toques).toEqual([]);
    });

    it('tutor sem WhatsApp devolve motivo legível, sem gravar', async () => {
      process.env.EXAMES_AVISO_CLIENTE_ATIVO = '1';
      const toques: string[] = [];
      const prisma: any = {
        listaItem: {
          findUnique: async () => ({ id: 'c1', lista: 'petexa_p1', valor: JSON.stringify({ nome: 'X', resultadoUrl: 'u' }) }),
          update: async () => { toques.push('update'); return {}; },
        },
        pet: { findUnique: async () => ({ name: 'Madona', tutor: { id: 't1', contacts: [] } }) },
      };
      const r = await svcCom(prisma, {}).avisarClienteDoResultado('c1');
      expect(r.ok).toBe(false);
      expect(r.erro).toMatch(/WhatsApp/i);
      expect(toques).toEqual([]);
    });
  });

  describe('a resposta do cliente fecha o exame', () => {
    const fases = [
      { id: 'f1', valor: JSON.stringify({ nome: 'Solicitar' }) },
      { id: 'f2', valor: JSON.stringify({ nome: 'Retirado' }) },
      { id: 'f3', valor: JSON.stringify({ nome: 'Resultado' }) },
      { id: 'f4', valor: JSON.stringify({ nome: 'Entregue' }) },
    ];

    function prismaDoTutor(cards: any[]) {
      const gravados: any[] = [];
      return {
        gravados,
        prisma: {
          pet: { findMany: async () => [{ id: 'p1', name: 'Madona' }] },
          listaItem: {
            findMany: async ({ where }: any) => (where?.lista === 'exame_fases' ? fases : cards),
            update: async ({ where, data }: any) => { gravados.push({ id: where.id, d: JSON.parse(data.valor) }); return {}; },
          },
          user: { findMany: async () => [{ id: 'u1' }] },
        } as any,
      };
    }

    it('fecha só o avisado, e o põe na fase terminal (sai do quadro)', async () => {
      const { prisma, gravados } = prismaDoTutor([
        { id: 'avisado', lista: 'petexa_p1', valor: JSON.stringify({ nome: 'Citologia', status: 'Resultado', clienteAvisadoAt: '2026-09-16T10:00:00-03:00' }) },
        { id: 'nao-avisado', lista: 'petexa_p1', valor: JSON.stringify({ nome: 'Hemograma', status: 'Retirado' }) },
      ]);
      const r = await svcCom(prisma).marcarEntregueAoResponder('t1', '2026-09-16T10:30:00-03:00');

      expect(r.entregues).toBe(1);
      expect(gravados.map((g) => g.id)).toEqual(['avisado']);
      expect(gravados[0].d.entregueAt).toBeTruthy();
      expect(gravados[0].d.status).toBe('Entregue');
    });

    it('avisa a EQUIPE — card que some sozinho sem explicação vira desconfiança', async () => {
      const criadas: any[] = [];
      const { prisma } = prismaDoTutor([
        { id: 'a', lista: 'petexa_p1', valor: JSON.stringify({ nome: 'Citologia', clienteAvisadoAt: '2026-09-16T10:00:00-03:00' }) },
      ]);
      await svcCom(prisma, {}, { create: async (n: any) => { criadas.push(n); return {}; } })
        .marcarEntregueAoResponder('t1', '2026-09-16T10:30:00-03:00');

      expect(criadas.length).toBe(1);
      expect(criadas[0].message).toMatch(/Citologia/);
      expect(criadas[0].link).toContain('exames-kanban');
    });

    it('tutor sem pet, ou sem exame avisado, não fecha nada', async () => {
      const prisma: any = { pet: { findMany: async () => [] } };
      expect(await svcCom(prisma).marcarEntregueAoResponder('t1')).toEqual({ entregues: 0 });
      expect(await svcCom(prisma).marcarEntregueAoResponder('')).toEqual({ entregues: 0 });
    });
  });

  describe('o ouvinte existe de verdade', () => {
    it('está registrado no módulo — listener fora do módulo nunca dispara', () => {
      // Sem estar nos providers, o @OnEvent simplesmente não roda: sem erro, sem log, sem nada.
      // É o tipo de falha que só aparece quando o cliente reclama que o exame nunca fechou.
      const mod = readFileSync(join(__dirname, 'exames.module.ts'), 'utf8');
      expect(mod).toContain('ExameEntregueReplyListener');
      expect(mod).toMatch(/providers:\s*\[[^\]]*ExameEntregueReplyListener/);
    });

    it('ouve o evento certo e nunca deixa o erro subir', () => {
      // O webhook do WhatsApp atende a clínica inteira: um erro aqui não pode derrubar o
      // recebimento de mensagens.
      const src = readFileSync(join(__dirname, 'exame-entregue-reply.listener.ts'), 'utf8');
      expect(src).toContain("@OnEvent('whatsapp.message.received')");
      expect(src).toContain('catch');
    });

    it('a rota manual do aviso existe nos dois lados', () => {
      expect(readFileSync(join(__dirname, 'exames.controller.ts'), 'utf8')).toContain("@Post(':itemId/avisar-cliente')");
      expect(existsSync(join(__dirname, '..', '..', '..', '..', 'vet-crm', 'app', 'api', 'exames', '[itemId]', 'avisar-cliente', 'route.ts'))).toBe(true);
    });
  });
});
