import { readFileSync } from 'fs';
import { join } from 'path';
import { ExamesService } from './exames.service';

/**
 * ENVIAR O LAUDO É A MESMA AÇÃO QUE LIBERAR NO PORTAL.
 *
 * Cintia, 15/09/2026: "manda o PDF pelo WhatsApp na hora e libera o laudo no portal, para ele
 * reabrir quando quiser — isso mesmo, perfeito".
 *
 * E a regra que manda nisto, dela também: "não é interessante que ele veja antes de falar com o
 * veterinário, já que o resultado precisa ser interpretado". Por isso o portal nasce FECHADO: o
 * tutor via o exame na lista e não tinha o que abrir, e continua assim até alguém clicar.
 *
 * QUEM LIBERA É O CLIQUE, não a entrega do WhatsApp. Se a janela de 24h estiver fechada o
 * arquivo espera na fila, mas o portal já abre — o que autoriza é a conversa ter acontecido, e
 * disso quem sabe é a pessoa que clicou.
 */
const CARD = (extra: any = {}) => ({
  id: 'c1',
  lista: 'petexa_p1',
  valor: JSON.stringify({
    nome: 'Citologia', status: 'Resultado',
    laudos: [{ url: 'https://x/l1.pdf', arquivo: 'lamina1.pdf' }],
    ...extra,
  }),
});

function montar(card: any, envio: any = { status: 'enviado' }) {
  const gravado: any = { valor: null };
  const enviados: any[] = [];
  const prisma: any = {
    listaItem: {
      findUnique: async () => card,
      update: async ({ data }: any) => { gravado.valor = JSON.parse(data.valor); return {}; },
    },
    pet: { findUnique: async () => ({ name: 'Madona', tutor: { id: 't1', name: 'Juliana' } }) },
  };
  const whatsapp = {
    enviarDocumentosProntuario: async (tutorId: string, texto: string, anexos: any[]) => {
      enviados.push({ tutorId, texto, anexos });
      return envio;
    },
  };
  return { gravado, enviados, svc: new ExamesService(prisma, whatsapp as any, {} as any) };
}

describe('enviar o laudo ao cliente', () => {
  it('manda TODOS os laudos, como documento, e libera no portal', async () => {
    const card = CARD({ laudos: [{ url: 'https://x/l1.pdf', arquivo: 'lamina1.pdf' }, { url: 'https://x/l2.pdf', arquivo: 'lamina2.pdf' }] });
    const { svc, gravado, enviados } = montar(card);
    const r = await svc.enviarLaudoAoCliente('c1', 'Dra. Vivian');

    expect(r.ok).toBe(true);
    expect(enviados[0].tutorId).toBe('t1');
    expect(enviados[0].anexos.map((a: any) => a.nome)).toEqual(['lamina1.pdf', 'lamina2.pdf']);
    expect(enviados[0].anexos.every((a: any) => a.tipo === 'document')).toBe(true);
    expect(gravado.valor.laudoLiberadoEm).toBeTruthy();
    expect(gravado.valor.laudoLiberadoPor).toBe('Dra. Vivian');
  });

  it('a mensagem diz de qual exame e de qual pet', async () => {
    // "Segue o laudo" sem dizer de quem chega no meio de uma conversa sobre outro assunto.
    const { svc, enviados } = montar(CARD());
    await svc.enviarLaudoAoCliente('c1');
    expect(enviados[0].texto).toContain('Citologia');
    expect(enviados[0].texto).toContain('Madona');
  });

  it('janela fechada: o PDF fica na fila, MAS o portal já abre', async () => {
    // O que autoriza o cliente a ver é a conversa com a veterinária ter acontecido. O WhatsApp
    // estar fora da janela de 24h é problema de entrega, não de permissão.
    const { svc, gravado } = montar(CARD(), { status: 'na_fila' });
    const r = await svc.enviarLaudoAoCliente('c1');
    expect(r.ok).toBe(true);
    expect(r.situacao).toBe('na_fila');
    expect(gravado.valor.laudoLiberadoEm).toBeTruthy();
  });

  it('envio que FALHA não libera nada', async () => {
    const { svc, gravado } = montar(CARD(), { status: 'erro', error: 'Tutor sem telefone' });
    const r = await svc.enviarLaudoAoCliente('c1');
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/telefone/i);
    expect(gravado.valor).toBeNull();
  });

  it('exame SEM laudo anexado é recusado, e nada é enviado', async () => {
    const semLaudo = { id: 'c1', lista: 'petexa_p1', valor: JSON.stringify({ nome: 'Citologia' }) };
    const { svc, enviados, gravado } = montar(semLaudo);
    const r = await svc.enviarLaudoAoCliente('c1');
    expect(r.ok).toBe(false);
    expect(enviados).toEqual([]);
    expect(gravado.valor).toBeNull();
  });

  it('exame antigo, que só tem `resultadoUrl`, também é enviado', async () => {
    const antigo = { id: 'c1', lista: 'petexa_p1', valor: JSON.stringify({ nome: 'Citologia', resultadoUrl: 'https://x/velho.pdf', resultadoArquivo: 'velho.pdf' }) };
    const { svc, enviados } = montar(antigo);
    expect((await svc.enviarLaudoAoCliente('c1')).ok).toBe(true);
    expect(enviados[0].anexos[0].nome).toBe('velho.pdf');
  });

  it('id que não é card de exame é recusado', async () => {
    const outro = { id: 'x', lista: 'petboletim_p1', valor: '{}' };
    const { svc, enviados } = montar(outro);
    expect((await svc.enviarLaudoAoCliente('x')).ok).toBe(false);
    expect(enviados).toEqual([]);
  });
});

describe('o portal só mostra o laudo depois de liberado', () => {
  const src = readFileSync(join(__dirname, '..', 'portal', 'portal-saude.service.ts'), 'utf8');

  it('a listagem deixou de dizer "sem arquivo" para sempre', () => {
    // Era `temArquivo: false` fixo: o tutor via o exame e não tinha o que abrir, mesmo com o
    // laudo anexado havia dias.
    expect(src).not.toMatch(/temArquivo:\s*false,\s*\/\/ o resultado/);
    expect(src).toContain('temArquivo: !!o.laudoLiberadoEm');
  });

  it('e o download CONFERE a liberação — esconder o botão não tranca a porta', () => {
    // Quem montar o endereço do arquivo na mão não pode passar por cima da regra.
    const fn = src.slice(src.indexOf('async arquivo('), src.indexOf('async boletinsFisio('));
    expect(fn).toContain("startsWith('petexa_')");
    expect(fn).toContain('if (!o?.laudoLiberadoEm) return null;');
    expect(fn).toContain('assertPetDoTutor');   // e o pet continua tendo de ser do tutor
  });
});
