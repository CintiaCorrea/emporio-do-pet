import { Injectable, Logger } from '@nestjs/common';
import { StatusAvaliacaoGoogle } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';

const GOOGLE_REVIEW_LINK = 'https://g.page/r/CctbNjVipnY8EAI/review';

/**
 * Pesquisa de satisfação por WhatsApp (2 etapas) ligada ao card "Avaliação Google".
 * 1) enviarPesquisa: cria AvaliacaoGoogle (PERGUNTA_ENVIADA) e manda a pergunta "1 a 5" no WhatsApp.
 * 2) tratarRespostaInbound: ao receber a resposta, registra a nota e, se 4-5, manda o link do Google.
 */
@Injectable()
export class SurveyAvaliacaoService {
  private readonly logger = new Logger(SurveyAvaliacaoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  async enviarPesquisa(tutorId: string): Promise<{ success: boolean; error?: string }> {
    if (!tutorId) return { success: false, error: 'tutorId obrigatório' };

    const tutor = await this.prisma.tutor.findUnique({
      where: { id: tutorId },
      include: { contacts: true },
    });
    if (!tutor) return { success: false, error: 'Cliente não encontrado' };

    const contato = tutor.contacts.find((c) => c.isPrimary) || tutor.contacts[0];
    const phone = contato?.number;
    if (!phone) return { success: false, error: 'Cliente sem telefone cadastrado' };

    await this.prisma.avaliacaoGoogle.create({
      data: {
        tutorId,
        status: StatusAvaliacaoGoogle.PERGUNTA_ENVIADA,
        canalEnvio: 'WhatsApp',
      },
    });

    const primeiroNome = (tutor.name || '').split(' ')[0] || '';
    const msg =
      `Olá${primeiroNome ? ' ' + primeiroNome : ''}! 🐾 Aqui é do Empório do Pet.\n` +
      `Queremos muito saber sua opinião: de *1 a 5*, como foi o seu atendimento?\n` +
      `Responda com o número (5 = adorei!).`;

    const res = await this.whatsapp.sendMessage({ to: phone, message: msg });
    if (!res.success) {
      this.logger.error(`Falha ao enviar pesquisa p/ tutor ${tutorId}: ${res.error}`);
      return { success: false, error: res.error || 'Falha ao enviar WhatsApp' };
    }
    this.logger.log(`Pesquisa de satisfação enviada p/ tutor ${tutorId} (${phone})`);
    return { success: true };
  }

  /**
   * Processa uma mensagem recebida. Retorna true se era resposta de pesquisa e foi tratada.
   */
  async tratarRespostaInbound(
    tutorId: string | null,
    phone: string,
    content: string,
  ): Promise<boolean> {
    const nota = this.extrairNota(content);
    if (!nota) return false;

    let tid = tutorId;
    if (!tid) {
      const tail = this.last9(phone);
      if (tail.length >= 8) {
        const contato = await this.prisma.contact.findFirst({
          where: { number: { endsWith: tail } },
          select: { tutorId: true },
        });
        tid = contato?.tutorId ?? null;
      }
    }
    if (!tid) return false;

    const seteDias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const pendente = await this.prisma.avaliacaoGoogle.findFirst({
      where: {
        tutorId: tid,
        status: StatusAvaliacaoGoogle.PERGUNTA_ENVIADA,
        dataPergunta: { gte: seteDias },
      },
      orderBy: { dataPergunta: 'desc' },
    });
    if (!pendente) return false;

    const gostou = nota >= 4;
    await this.prisma.avaliacaoGoogle.update({
      where: { id: pendente.id },
      data: {
        notaDada: nota,
        gostou,
        status: gostou ? StatusAvaliacaoGoogle.LINK_ENVIADO : StatusAvaliacaoGoogle.NAO_GOSTOU,
        ...(gostou ? { linkEnviado: GOOGLE_REVIEW_LINK, dataEnvioLink: new Date() } : {}),
      },
    });

    const reply = gostou
      ? `Que alegria que você gostou! 💙\n` +
        `Se puder, deixe sua avaliação no Google — leva 1 minutinho e ajuda muito a nossa clínica:\n` +
        `${GOOGLE_REVIEW_LINK}`
      : `Obrigado pela sua sinceridade! 🙏\n` +
        `Vamos usar o seu retorno para melhorar. Se quiser, conte pra gente o que podemos fazer melhor.`;

    await this.whatsapp.sendMessage({ to: phone, message: reply });
    this.logger.log(`Resposta de pesquisa tratada: tutor ${tid}, nota ${nota}, gostou=${gostou}`);
    return true;
  }

  private extrairNota(content: string): number | null {
    if (!content) return null;
    const tokens = content.trim().split(/\s+/);
    for (const t of tokens) {
      if (/^[1-5]$/.test(t)) return parseInt(t, 10);
    }
    const m = content.trim().match(/^([1-5])\b/);
    if (m) return parseInt(m[1], 10);
    return null;
  }

  private last9(s: string): string {
    const d = (s || '').replace(/\D/g, '');
    return d.length > 9 ? d.slice(-9) : d;
  }
}
