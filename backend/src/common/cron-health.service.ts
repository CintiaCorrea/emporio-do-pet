import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../modules/prisma/prisma.service';

/**
 * Saúde das automações (crons). Cada rotina chama `registrar(job)` quando dispara;
 * o `tick` (a cada minuto) é a BATIDA-MESTRE — se ela atrasa, o motor de cron parou
 * (foi o incidente 10/08 do PRIMARY_MACHINE_ID). Guarda em listaItem `cron_hb:<job>` = ISO.
 * O status é lido pelo endpoint GET /api/health/automations (admin) e mostrado no Meu painel.
 */
@Injectable()
export class CronHealthService {
  private readonly logger = new Logger(CronHealthService.name);
  constructor(private readonly prisma: PrismaService) {}

  /** Rotinas monitoradas: chave, rótulo, tolerância (min) até virar "atrasado", e grupo. */
  static readonly JOBS: { key: string; label: string; tolMin: number; grupo: string }[] = [
    { key: '_tick_', label: 'Motor de automações (batida-mestre)', tolMin: 5, grupo: 'Sistema' },
    { key: 'confirmacao', label: 'Confirmações de agenda (WhatsApp)', tolMin: 26 * 60, grupo: 'Mensagens' },
    { key: 'lembretes', label: 'Lembretes: aniversário e vacina', tolMin: 26 * 60, grupo: 'Mensagens' },
    { key: 'cadencias', label: 'Cadências / réguas de relacionamento', tolMin: 20, grupo: 'Mensagens' },
    { key: 'campanhas', label: 'Campanhas de WhatsApp', tolMin: 20, grupo: 'Mensagens' },
    { key: 'boletim_internacao', label: 'Boletins de internação', tolMin: 30, grupo: 'Mensagens' },
    { key: 'digest', label: 'Resumo semanal de gestão (e-mail)', tolMin: 8 * 24 * 60, grupo: 'Gestão' },
    { key: 'fechamento_caixa', label: 'Fechamento de caixa (23:59)', tolMin: 26 * 60, grupo: 'Financeiro' },
    { key: 'financeiro', label: 'Lançamentos das vendas (tempo real)', tolMin: 40, grupo: 'Financeiro' },
    { key: 'exames', label: 'Avisos de exame a entregar', tolMin: 26 * 60, grupo: 'Clínico' },
  ];

  /** Marca que um job rodou AGORA (chamado no início de cada cron). Nunca trava o job. */
  async registrar(job: string): Promise<void> {
    try {
      const lista = `cron_hb:${job}`;
      const at = new Date().toISOString();
      const ex = await this.prisma.listaItem.findFirst({ where: { lista } });
      if (ex) await this.prisma.listaItem.update({ where: { id: ex.id }, data: { valor: at } });
      else await this.prisma.listaItem.create({ data: { lista, valor: at } });
    } catch (e: any) {
      this.logger.warn(`heartbeat ${job}: ${e?.message || e}`);
    }
  }

  /** BATIDA-MESTRE: se esta parar, o motor de cron morreu (todas as rotinas param juntas). */
  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    await this.registrar('_tick_');
  }

  /** Status de cada rotina + se o motor está vivo. Consumido pelo painel do Admin. */
  async status(): Promise<any> {
    const itens = await this.prisma.listaItem.findMany({ where: { lista: { startsWith: 'cron_hb:' } }, select: { lista: true, valor: true } });
    const at: Record<string, string> = {};
    for (const it of itens) at[it.lista.replace('cron_hb:', '')] = it.valor;

    const agora = Date.now();
    const idade = (iso?: string) => (iso ? Math.round((agora - new Date(iso).getTime()) / 60000) : null); // minutos

    const tick = idade(at['_tick_']);
    const cronVivo = tick != null && tick <= 5;

    const jobs = CronHealthService.JOBS.filter((j) => j.key !== '_tick_').map((j) => {
      const idadeMin = idade(at[j.key]);
      let status: 'ok' | 'atrasado' | 'parado' | 'sem_dados';
      if (!cronVivo) status = 'parado'; // motor parado ⇒ todas param
      else if (idadeMin == null) status = 'sem_dados';
      else if (idadeMin <= j.tolMin) status = 'ok';
      else if (idadeMin <= j.tolMin * 2) status = 'atrasado';
      else status = 'parado';
      return { key: j.key, label: j.label, grupo: j.grupo, ultimaExecucao: at[j.key] || null, idadeMin, status };
    });

    return {
      cronVivo,
      motor: { label: 'Motor de automações', ultimaBatida: at['_tick_'] || null, idadeMin: tick },
      jobs,
      resumo: {
        ok: jobs.filter((j) => j.status === 'ok').length,
        alerta: jobs.filter((j) => j.status === 'atrasado').length,
        parado: (cronVivo ? 0 : 1) + jobs.filter((j) => j.status === 'parado').length,
      },
      verificadoEm: new Date().toISOString(),
    };
  }
}
