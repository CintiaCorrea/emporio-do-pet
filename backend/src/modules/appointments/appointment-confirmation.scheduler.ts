import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsService } from './appointments.service';

/**
 * Envia automaticamente a confirmação das agendas do DIA SEGUINTE.
 *
 * - Roda todo dia às 9h (fuso de Fortaleza).
 * - Só pega agendas ainda NÃO confirmadas (confirmacaoStatus vazio) e não canceladas.
 * - Respeita o opt-in do tutor (não envia se acceptsWhatsApp = false).
 * - Idempotente: sendConfirmation marca confirmacaoStatus=ENVIADA, então não reenvia.
 *
 * A escolha do modelo (fisio x geral) e o horário no fuso certo ficam a cargo
 * de AppointmentsService.sendConfirmation / confirmacaoTemplate.
 */
@Injectable()
export class AppointmentConfirmationScheduler {
  private readonly logger = new Logger(AppointmentConfirmationScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appts: AppointmentsService,
  ) {}

  // Confirmação por FAIXA do atendimento, pra manter a janela de 24h do WhatsApp aberta:
  //  - Agendamentos da MANHÃ (até 12h59)  -> confirmados às 17h do dia anterior.
  //  - Agendamentos da TARDE/NOITE (13h+)  -> confirmados às 19h do dia anterior.
  // Juntos cobrem TODOS os horários, sem deixar agendamento sem confirmar.
  @Cron('0 17 * * *', { timeZone: 'America/Fortaleza' })
  async cronManha(): Promise<void> {
    const r = await this.rodar(false, 'manha');
    this.logger.log(
      `[confirmacao-manha 17h] enviados=${r.itens.filter((i) => i.ok).length}/${r.enviaveis} (${r.total} agendas, ${r.semOptIn} sem opt-in)`,
    );
  }

  @Cron('0 19 * * *', { timeZone: 'America/Fortaleza' })
  async cronTarde(): Promise<void> {
    const r = await this.rodar(false, 'tarde');
    this.logger.log(
      `[confirmacao-tarde 19h] enviados=${r.itens.filter((i) => i.ok).length}/${r.enviaveis} (${r.total} agendas, ${r.semOptIn} sem opt-in)`,
    );
  }

  /** Intervalo do "amanhã" no fuso de Fortaleza (UTC-3, sem horário de verão). */
  private amanhaRange(): { start: Date; end: Date } {
    const OFF_MIN = -3 * 60;
    const agora = new Date();
    const fort = new Date(agora.getTime() + OFF_MIN * 60000);
    const y = fort.getUTCFullYear();
    const m = fort.getUTCMonth();
    const d = fort.getUTCDate();
    // amanhã 00:00 e 23:59:59.999 de Fortaleza, convertidos pra UTC
    const start = new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0) - OFF_MIN * 60000);
    const end = new Date(Date.UTC(y, m, d + 2, 0, 0, 0, 0) - OFF_MIN * 60000 - 1);
    return { start, end };
  }

  /**
   * Executa a rotina. Com dryRun=true, NÃO envia nada — só devolve a lista
   * do que seria enviado (pra conferência/preview).
   */
  async rodar(dryRun: boolean, faixa?: 'manha' | 'tarde'): Promise<{
    total: number;
    enviaveis: number;
    semOptIn: number;
    dryRun: boolean;
    itens: Array<{ id: string; tutor?: string; pet?: string; date: Date; ok?: boolean; error?: string }>;
  }> {
    const { start, end } = this.amanhaRange();
    // Hora do agendamento no fuso de Fortaleza (UTC-3). Manhã = até 12h59; tarde = 13h+.
    const horaLocal = (d: Date) => (d.getUTCHours() + 24 - 3) % 24;
    const naFaixa = (d: Date) =>
      !faixa ? true : faixa === 'manha' ? horaLocal(d) < 13 : horaLocal(d) >= 13;

    const candidatos = await this.prisma.appointment.findMany({
      where: {
        date: { gte: start, lte: end },
        confirmacaoStatus: null,
        status: {
          notIn: ['Cancelado', 'CANCELLED', 'Concluído', 'CONCLUIDO', 'Realizado', 'NO_SHOW'],
        },
      },
      select: {
        id: true,
        date: true,
        type: true,
        tutor: { select: { name: true, acceptsWhatsApp: true } },
        pet: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    });

    const naJanela = candidatos.filter((a) => naFaixa(a.date));
    const alvo = naJanela.filter((a) => a.tutor?.acceptsWhatsApp !== false);
    const semOptIn = naJanela.length - alvo.length;

    const itens: Array<{ id: string; tutor?: string; pet?: string; date: Date; ok?: boolean; error?: string }> = [];
    for (const a of alvo) {
      if (dryRun) {
        itens.push({ id: a.id, tutor: a.tutor?.name, pet: a.pet?.name, date: a.date });
        continue;
      }
      try {
        const res: any = await this.appts.sendConfirmation(a.id);
        itens.push({ id: a.id, tutor: a.tutor?.name, pet: a.pet?.name, date: a.date, ok: res?.success !== false, error: res?.error });
      } catch (e: any) {
        this.logger.warn(`Falha ao confirmar ${a.id}: ${e?.message || e}`);
        itens.push({ id: a.id, tutor: a.tutor?.name, pet: a.pet?.name, date: a.date, ok: false, error: e?.message });
      }
    }

    return { total: naJanela.length, enviaveis: alvo.length, semOptIn, dryRun, itens };
  }
}
