/**
 * Rotina que avisa o tutor pelo portal (Fatia 6).
 *
 * Por enquanto um aviso só, o mais útil: **lembrete do horário de amanhã**,
 * enviado no fim da tarde. É o mesmo objetivo da confirmação por WhatsApp, mas
 * de graça e sem gastar template — e um não atrapalha o outro: quem não instalou
 * o portal continua recebendo só o WhatsApp.
 *
 * Idempotência é por `assunto = agenda:<id do agendamento>`, então rodar duas
 * vezes (ou reiniciar o servidor) não manda aviso repetido.
 *
 * Em máquina secundária esta rotina não roda: o CronLeaderService desliga todos
 * os crons fora da máquina principal.
 *
 * ⚠️ Nunca colocar dado clínico no texto — a notificação aparece na tela de
 * bloqueio, que qualquer pessoa vê.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PortalPushService } from './portal-push.service';
import { localParaUtc, ymdLocal } from './portal-agenda-horarios.service';

const CANCELADO = ['Cancelado', 'CANCELED', 'CANCELADO'];

@Injectable()
export class PortalPushScheduler {
  private readonly logger = new Logger(PortalPushScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PortalPushService,
  ) {}

  /** Todo dia às 18h de Fortaleza: lembra quem tem horário amanhã. */
  @Cron('0 18 * * *', { timeZone: 'America/Fortaleza' })
  async lembrarDeAmanha() {
    if (!this.push.ativo) return;

    const amanha = ymdLocal(new Date(Date.now() + 24 * 60 * 60_000));

    const agendamentos = await this.prisma.appointment.findMany({
      where: {
        date: { gte: localParaUtc(amanha, 0), lt: localParaUtc(amanha, 24 * 60) },
        status: { notIn: CANCELADO },
      },
      select: {
        id: true,
        date: true,
        tutorId: true,
        pet: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
      take: 200,
    });

    if (!agendamentos.length) return;

    let avisados = 0;
    for (const a of agendamentos) {
      if (!a.tutorId) continue;

      const hora = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Fortaleza',
        hour: '2-digit',
        minute: '2-digit',
      }).format(a.date);

      const nome = a.pet?.name ? `do ${a.pet.name}` : 'do seu pet';

      const r = await this.push.avisar(a.tutorId, {
        titulo: 'Amanhã tem visita 🐾',
        texto: `O horário ${nome} é amanhã às ${hora}. Até logo!`,
        url: '/portal/agendar',
        assunto: `agenda:${a.id}`,
      });
      if (r.enviados) avisados++;
    }

    if (avisados) {
      this.logger.log(`Lembrete do portal enviado para ${avisados} tutor(es).`);
    }
  }

  /**
   * Faxina semanal: aparelho que falhou muitas vezes seguidas está morto
   * (celular trocado, app desinstalado sem avisar). Domingo de madrugada.
   */
  @Cron('0 4 * * 0', { timeZone: 'America/Fortaleza' })
  async limparAparelhosMortos() {
    const r = await this.prisma.portalPush.deleteMany({ where: { falhas: { gte: 10 } } });
    if (r.count) this.logger.log(`${r.count} aparelho(s) sem resposta removido(s).`);
  }
}
