import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { horariosLimpos, horariosDoLab, ehHoraDeAvisar, horaDaClinica, HORARIOS_PADRAO_LAB } from './exames.regras';
import { ExamesService } from './exames.service';

/**
 * CADA LABORATÓRIO NO SEU HORÁRIO.
 *
 * Cintia, 12/09/2026, no desenho do ciclo: "avisa o laboratório (nos horários já estipulados,
 * CONFORME O LABORATÓRIO do exame solicitado)".
 *
 * Até aqui eram duas crons fixas, 11h30 e 17h, para todo mundo. Mas a hora do aviso é a hora em
 * que o motoboy daquele laboratório passa: mandar às 17h para quem coleta às 9h faz o material
 * dormir aqui e o resultado atrasar um dia inteiro, sem ninguém ter errado nada.
 *
 * O RISCO QUE ESTES TESTES CONTÊM é o laboratório que deixa de ser avisado em silêncio. Não há
 * tela que mostre um aviso que não aconteceu — o exame só fica parado, e alguém descobre dias
 * depois pelo tutor.
 */
describe('horário de coleta por laboratório', () => {
  describe('o que a pessoa digita', () => {
    it('normaliza para HH:MM e ordena', () => {
      expect(horariosLimpos(['9:00', '17:30'])).toEqual(['09:00', '17:30']);
      expect(horariosLimpos(['17:00', '09:30'])).toEqual(['09:30', '17:00']);
      expect(horariosLimpos('11:30, 17:00')).toEqual(['11:30', '17:00']);
    });

    it('não repete o mesmo horário', () => {
      expect(horariosLimpos(['9:00', '09:00', '9:00'])).toEqual(['09:00']);
    });

    it('descarta o que não é hora, sem derrubar o resto', () => {
      expect(horariosLimpos(['25:00', '11:70', 'manhã', '', null, '14:00'])).toEqual(['14:00']);
      expect(horariosLimpos(null)).toEqual([]);
      expect(horariosLimpos(undefined)).toEqual([]);
    });
  });

  describe('quem não configurou', () => {
    it('segue no padrão da casa', () => {
      expect(horariosDoLab({}, 'lab-1')).toEqual(HORARIOS_PADRAO_LAB);
      expect(horariosDoLab(null, 'lab-1')).toEqual(HORARIOS_PADRAO_LAB);
      expect(horariosDoLab({ 'lab-1': [] }, 'lab-1')).toEqual(HORARIOS_PADRAO_LAB);
    });

    it('e o padrão continua sendo 11:30 e 17:00', () => {
      expect(HORARIOS_PADRAO_LAB).toEqual(['11:30', '17:00']);
    });

    it('sem laboratório, cai no padrão em vez de ficar sem horário', () => {
      // Devolver lista vazia aqui faria o exame nunca ser avisado, caladinho.
      expect(horariosDoLab({ 'lab-1': ['09:00'] }, null)).toEqual(HORARIOS_PADRAO_LAB);
      expect(horariosDoLab({ 'lab-1': ['09:00'] }, '')).toEqual(HORARIOS_PADRAO_LAB);
    });
  });

  describe('a hora é a da clínica, não a do servidor', () => {
    it('converte de UTC para Fortaleza', () => {
      // O servidor roda em UTC. Comparar sem converter erra por 3 horas — o laboratório das 9h
      // seria avisado ao meio-dia, todo dia, e ninguém ligaria uma coisa à outra.
      expect(horaDaClinica('2026-09-16T12:00:00Z')).toBe('09:00');
      expect(horaDaClinica('2026-09-16T20:30:00Z')).toBe('17:30');
    });

    it('data ilegível não vira hora nenhuma', () => {
      expect(horaDaClinica('qualquer coisa')).toBe('');
      expect(ehHoraDeAvisar(['09:00'], 'qualquer coisa')).toBe(false);
    });

    it('avisa na hora marcada, e só nela', () => {
      expect(ehHoraDeAvisar(['09:00', '15:00'], '2026-09-16T12:00:00Z')).toBe(true);   // 09:00
      expect(ehHoraDeAvisar(['09:00', '15:00'], '2026-09-16T18:00:00Z')).toBe(true);   // 15:00
      expect(ehHoraDeAvisar(['09:00', '15:00'], '2026-09-16T13:00:00Z')).toBe(false);  // 10:00
    });
  });

  describe('gravar os horários de um laboratório', () => {
    function prismaCom(existente: any = null) {
      const acoes: any[] = [];
      return {
        acoes,
        prisma: {
          listaItem: {
            findFirst: async () => existente,
            create: async ({ data }: any) => { acoes.push({ op: 'create', d: JSON.parse(data.valor) }); return {}; },
            update: async ({ data }: any) => { acoes.push({ op: 'update', d: JSON.parse(data.valor) }); return {}; },
            delete: async () => { acoes.push({ op: 'delete' }); return {}; },
          },
        } as any,
      };
    }
    const svc = (p: any) => new ExamesService(p, {} as any, {} as any);

    it('cria quando não existia, já normalizado', async () => {
      const { prisma, acoes } = prismaCom(null);
      const r = await svc(prisma).salvarHorariosDoLab('lab-1', ['9:00', '15:30']);
      expect(r.ok).toBe(true);
      expect(acoes).toEqual([{ op: 'create', d: { fornecedorId: 'lab-1', horarios: ['09:00', '15:30'] } }]);
    });

    it('atualiza quando já existia — não deixa dois registros para o mesmo lab', async () => {
      const { prisma, acoes } = prismaCom({ id: 'x' });
      await svc(prisma).salvarHorariosDoLab('lab-1', ['08:00']);
      expect(acoes.map((a) => a.op)).toEqual(['update']);
    });

    it('lista vazia VOLTA AO PADRÃO — nunca deixa o laboratório sem aviso', async () => {
      // Se gravasse "nenhum horário", o laboratório nunca mais seria avisado e nada na tela
      // mostraria isso: o exame só ficaria parado.
      const { prisma, acoes } = prismaCom({ id: 'x' });
      const r = await svc(prisma).salvarHorariosDoLab('lab-1', []);
      expect(r.horarios).toEqual(HORARIOS_PADRAO_LAB);
      expect(acoes.map((a) => a.op)).toEqual(['delete']);
    });

    it('sem laboratório informado, não grava nada', async () => {
      const { prisma, acoes } = prismaCom(null);
      expect((await svc(prisma).salvarHorariosDoLab('', ['09:00'])).ok).toBe(false);
      expect(acoes).toEqual([]);
    });
  });

  describe('as portas e a cron', () => {
    const web = (...p: string[]) => join(__dirname, '..', '..', '..', '..', 'vet-crm', ...p);

    it('a cron bate de meia em meia hora e filtra por laboratório', () => {
      const sched = readFileSync(join(__dirname, 'exames.scheduler.ts'), 'utf8');
      expect(sched).toContain("@Cron('0,30 7-19 * * *'");
      expect(sched).toContain('apenasNoHorario: true');
      // As duas crons fixas não podem voltar: com elas, todo lab seria avisado 11:30 e 17:00
      // ALÉM do horário próprio.
      expect(sched).not.toContain("@Cron('30 11 * * *'");
      expect(sched).not.toContain("@Cron('0 17 * * *'");
    });

    it('o botão "Enviar lote agora" IGNORA a grade — é o caminho da urgência', () => {
      const ctrl = readFileSync(join(__dirname, 'exames.controller.ts'), 'utf8');
      expect(ctrl).toContain('avisarLaboratorios()');
    });

    it('a rota do site existe e repassa o corpo', () => {
      const p = web('app', 'api', 'exames', 'horarios-lab', 'route.ts');
      expect(existsSync(p)).toBe(true);
      const src = readFileSync(p, 'utf8');
      expect(src).toContain('request.text()');
    });

    it('os templates do laboratório vão SEM variáveis — os aprovados não têm nenhuma', () => {
      // `solicitacao_coleta_exame` e `solicitacao_coleta_lote` são textos fixos na Meta. Mandar
      // variáveis para um template que não tem nenhuma faz a Meta RECUSAR — e o erro que volta
      // não diz qual é a conta certa. O botão de urgência mandava paciente e exame e falhava
      // sempre, sem ninguém entender por quê (achado em 16/09/2026).
      const src = readFileSync(join(__dirname, 'exames.service.ts'), 'utf8');
      const fn = src.slice(src.indexOf('private async enviar('), src.indexOf('private async enviarLote('));
      expect(fn).toContain('this.TEMPLATE, []');
      expect(fn).not.toMatch(/type:\s*'text'/);
    });

    it('a tela oferece a grade, não um campo livre', () => {
      // Um campo livre deixaria alguém digitar 09:20, que nunca casaria com a cron — e o
      // laboratório ficaria sem aviso sem nenhum erro aparecer.
      const kanban = readFileSync(web('app', '(user)', 'dashboard', 'erp', 'exames-kanban', 'page.tsx'), 'utf8');
      expect(kanban).toContain('GRADE');
      expect(kanban).toContain('Horários de coleta');
    });
  });
});
