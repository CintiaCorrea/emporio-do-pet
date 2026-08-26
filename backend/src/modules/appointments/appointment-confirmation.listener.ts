import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { STATUS_NAO_CONFIRMAVEL } from './appointment-confirmacao.regras';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  // Mensagem de agradecimento ao tutor que CONFIRMOU. "amanhã" se a consulta for amanhã;
  // senão nomeia o dia. Saudação conforme a hora (nunca "bom dia" à noite).
  /** Serviço + profissional pra pôr na mensagem. Fisio → "fisioterapia" sem profissional
   *  (fisio é da equipe, não de um vet). Demais → tipo do agendamento + profissional (só se veterinário). */
  private servicoEProf(appt: any): { servico: string; prof: string } {
    const txt = `${appt?.type || ''} ${appt?.description || ''}`.toLowerCase();
    if (/fisio|reabilit|hidroester/.test(txt)) return { servico: 'fisioterapia', prof: '' };
    const raw = String(appt?.type || '').trim();
    const servico = raw && raw === raw.toUpperCase() ? raw.charAt(0) + raw.slice(1).toLowerCase() : (raw || 'atendimento');
    const profTipo = appt?.user?.profissional?.tipo;
    const profNome = (appt?.user?.profissional?.nomeExibicao || appt?.user?.name || '').trim();
    const prof = (profTipo === 'RECEPCIONISTA' || profTipo === 'GERENTE' || !profNome) ? '' : profNome;
    return { servico, prof };
  }

  private msgAgradecimento(appt: any): string {
    const primeiro = (appt?.tutor?.name || '').trim().split(/\s+/)[0] || 'tudo bem';
    const petNome = appt?.pet?.name || 'seu pet';
    const { servico, prof } = this.servicoEProf(appt);
    const svc = servico ? ` para ${servico}${prof ? ` com ${prof}` : ''}` : '';
    const fAppt = new Date(new Date(appt.date).getTime() - 3 * 3600 * 1000); // Fortaleza
    const mm = fAppt.getUTCMinutes();
    const horario = `${String(fAppt.getUTCHours()).padStart(2, '0')}h${mm ? String(mm).padStart(2, '0') : ''}`;
    const fAgora = new Date(Date.now() - 3 * 3600 * 1000);
    const h = fAgora.getUTCHours();
    const saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    const diaAppt = Date.UTC(fAppt.getUTCFullYear(), fAppt.getUTCMonth(), fAppt.getUTCDate());
    const amanha = Date.UTC(fAgora.getUTCFullYear(), fAgora.getUTCMonth(), fAgora.getUTCDate()) + 86400000;
    if (diaAppt === amanha) {
      return `${saud}, ${primeiro}! 💛\n\nAgradecemos pela confirmação. Estamos ansiosos para receber a ${petNome}${svc} amanhã às ${horario}! Se precisar de algo mais, é só avisar. Até logo! 🐾✨`;
    }
    const SEM = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    const dia = `${SEM[fAppt.getUTCDay()]} (${String(fAppt.getUTCDate()).padStart(2, '0')}/${String(fAppt.getUTCMonth() + 1).padStart(2, '0')})`;
    return `${saud}, ${primeiro}! 💛\n\nAgradecemos pela confirmação! Estamos ansiosos para receber a ${petNome}${svc} na ${dia} às ${horario}. Se precisar de algo, é só avisar! 🐾\n\nAté lá!`;
  }

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
      // Só confirmações FORTES e inequívocas — evita falso-positivo do tipo "Certo"/"ok"/"beleza"
      // dito no MEIO de uma conversa (bug 26/08: "Certo" disparou o agradecimento fora de hora).
      const AFIRMATIVO =
        /^(sim,?\s*(confirmo|confirmad[oa])?|confirmo|confirmad[oa]|confirmar|confirmo\s+a\s+presen|estarei\s+(presente|l[aá])|vou\s+sim|com\s+certeza|pode\s+confirmar)\b/;
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

      // Só confirma agendamento de HOJE pra frente. Sem esse filtro, uma confirmação
      // ENVIADA e nunca respondida de um agendamento JÁ PASSADO era casada com um "sim"
      // dias depois → agradecimento com data velha (bug da Kira: 23/07 recebeu "21/07").
      // 00:00 de hoje em Fortaleza (UTC-3) = 03:00 UTC de hoje.
      const fAgora = new Date(Date.now() - 3 * 3600 * 1000);
      const inicioHoje = new Date(Date.UTC(fAgora.getUTCFullYear(), fAgora.getUTCMonth(), fAgora.getUTCDate(), 3, 0, 0));

      // Agendamento (de hoje pra frente) desse tutor com confirmação ENVIADA — o mais
      // recentemente enviado (é ao qual o cliente está respondendo).
      const appt = await this.prisma.appointment.findFirst({
        // Trava defensiva: nunca confirmar um agendamento já MORTO (remarcado/cancelado) — senão ele
        // ressuscita como duplicado. (Complementa o filtro do scheduler.)
        where: { tutorId: contato.tutorId, confirmacaoStatus: 'ENVIADA', date: { gte: inicioHoje }, status: { notIn: STATUS_NAO_CONFIRMAVEL } },
        orderBy: { confirmacaoEnviadaAt: 'desc' },
        select: { id: true, date: true, type: true, description: true, pet: { select: { name: true } }, tutor: { select: { name: true } }, user: { select: { name: true, profissional: { select: { tipo: true, nomeExibicao: true } } } } },
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

      // Agradecimento automático a quem CONFIRMOU (a janela de 24h está aberta — texto livre).
      // Sai UMA vez só: o próximo confirm não acha mais agendamento com status ENVIADA.
      if (confirmStatus === 'CONFIRMADO') {
        try {
          const conv = payload?.conversation;
          if (conv?.id) {
            await this.whatsapp.sendAndSaveMessage(
              conv.userId || payload?.userId,
              conv.id,
              this.msgAgradecimento(appt),
              'TEXT',
              { senderType: 'SYSTEM', senderName: 'Confirmação' },
            );
            // 📴 Depois do agradecimento, ENCERRA a conversa (Cintia 31/07: às 19h já estamos fechados).
            // PROTEÇÃO: só fecha se o cliente respondeu curto (botão/"sim"); mensagem longa = pergunta real → fica aberta.
            const textoCliente = String(payload?.content || '').trim();
            if (textoCliente.length <= 30) {
              await this.prisma.whatsAppConversation
                .update({ where: { id: conv.id }, data: { status: 'CLOSED', unreadCount: 0 } })
                .catch(() => undefined);
            }
          }
        } catch (e: any) {
          this.logger.warn(`Falha ao mandar o agradecimento de confirmação: ${e?.message || e}`);
        }
      }
    } catch (e: any) {
      this.logger.warn(`Falha ao processar confirmação por WhatsApp: ${e?.message || e}`);
    }
  }
}
