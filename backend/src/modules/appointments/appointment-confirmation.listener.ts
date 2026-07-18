import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Atualiza o agendamento automaticamente quando o cliente responde à confirmação
 * pelo WhatsApp — tanto pelos BOTÕES do template quanto ESCREVENDO normalmente
 * ("sim", "ok", "confirmo", "👍", "preciso remarcar", "não vou poder"...).
 *
 * - confirmar / sim / ok / 👍   -> confirmacaoStatus CONFIRMADO + status "Confirmado"
 * - remarcar / outro dia        -> confirmacaoStatus REMARCAR (recepção age na agenda)
 * - cancelar / não vou          -> status "Cancelado" + motivoCancelamento (se a resposta trouxer)
 *
 * Só age quando existe agendamento com confirmação ENVIADA aguardando resposta.
 *
 * Escuta o evento que o webhook do WhatsApp já emite. Best-effort: qualquer
 * falha é engolida para nunca quebrar o recebimento da mensagem.
 */
@Injectable()
export class AppointmentConfirmationListener {
  private readonly logger = new Logger(AppointmentConfirmationListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('whatsapp.message.received')
  async handle(payload: any): Promise<void> {
    try {
      const content = (payload?.content || '').toString().trim().toLowerCase();
      const phone = (payload?.contactPhone || '').toString();
      if (!content || !phone) return;

      let confirmStatus: string | null = null;
      let apptStatus: string | null = null;
      let motivo: string | null = null;

      const tem = (...ws: string[]) => ws.some((w) => content.includes(w));
      // Resposta ESCRITA natural (não só o botão do template). Só entra aqui quando existe
      // um agendamento com confirmação ENVIADA aguardando resposta (ver consulta abaixo),
      // por isso um "ok"/"sim" solto é seguro.
      const AFIRMATIVO =
        /^(sim|ok|okay|okey|blz|beleza|certo|isso|claro|perfeito|combinado|positivo|confirmo|confirmad[oa]|estarei|vou|pode ser|t[aá] bom|tudo bem|tudo certo|com certeza)\b/;
      const EMOJI_OK = /(👍|✅|👌)/;

      // ORDEM IMPORTA: cancelar/remarcar antes de confirmar (ex.: "ok, mas preciso remarcar").
      if (tem('cancel', 'desmarc', 'não vou', 'nao vou', 'não poderei', 'nao poderei', 'não consigo', 'nao consigo', 'não vai dar', 'nao vai dar')) {
        apptStatus = 'Cancelado';
        // Motivo: vem dos botões do modelo do Meta OU do que o cliente escrever.
        if (tem('compromisso')) motivo = 'Outro compromisso';
        else if (tem('interesse')) motivo = 'Não tenho interesse';
        else if (tem('viaj', 'viagem')) motivo = 'Vai viajar';
        else if (tem('doente', 'indispost')) motivo = 'Pet indisposto';
        else if (tem('esquec')) motivo = 'Esqueceu';
      } else if (tem('remarc', 'outro dia', 'outro horário', 'outro horario', 'mudar o hor', 'trocar o hor', 'adiar', 'transferir')) {
        confirmStatus = 'REMARCAR';
      } else if (tem('confirm') || AFIRMATIVO.test(content) || EMOJI_OK.test(content)) {
        confirmStatus = 'CONFIRMADO';
        apptStatus = 'Confirmado';
      }
      if (!confirmStatus && !apptStatus) return;

      const last8 = phone.replace(/\D/g, '').slice(-8);
      if (!last8) return;

      const contato = await this.prisma.contact.findFirst({
        where: { number: { contains: last8 } },
        select: { tutorId: true },
      });
      if (!contato?.tutorId) return;

      // Agendamento mais recente desse tutor que teve confirmação ENVIADA
      const appt = await this.prisma.appointment.findFirst({
        where: { tutorId: contato.tutorId, confirmacaoStatus: 'ENVIADA' },
        orderBy: { confirmacaoEnviadaAt: 'desc' },
        select: { id: true },
      });
      if (!appt) return;

      await this.prisma.appointment.update({
        where: { id: appt.id },
        data: {
          ...(confirmStatus ? { confirmacaoStatus: confirmStatus } : {}),
          ...(apptStatus ? { status: apptStatus } : {}),
          ...(motivo ? { motivoCancelamento: motivo } : {}),
        },
      });
      this.logger.log(
        `Agendamento ${appt.id} -> ${confirmStatus || apptStatus}${motivo ? ' (' + motivo + ')' : ''} (resposta WhatsApp de ${phone})`,
      );
    } catch (e: any) {
      this.logger.warn(`Falha ao processar confirmação por WhatsApp: ${e?.message || e}`);
    }
  }
}
